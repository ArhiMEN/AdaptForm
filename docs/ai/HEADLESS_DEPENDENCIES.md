# HF-012 — validator dependency graph proposal

[English](HEADLESS_DEPENDENCIES.md) · [Русский](HEADLESS_DEPENDENCIES.ru.md)

**Specification only, pending owner approval before HF-013.** No dependency engine, dependsOn option, activation API, Proxy tracking or trigger policy is implemented in this branch. Package remains 2.2.0. Proposed behavior below is not a published API or an accepted decision in DECISIONS.

## Primary API proposal

Add optional explicit dependencies to FieldOptions, ArrayFieldOptions and ArrayFormFieldOptions. They describe all context read by that node's validation pass (isRequired, type-specific rules and custom validate), not only the custom callback. The target's own value is implicit and must not be listed as a self-dependency. No automatic source discovery.

```ts
// Proposed types, not current exports.
type DependencyPath = readonly (string | number)[]
interface DependencyNodeRef {
  getSnapshot(): NodeSnapshot
} // small readonly structural reference; membership is checked at runtime
type DependencyRef =
  | {readonly path: DependencyPath; readonly scope?: 'owner' | 'root'}
  | {readonly node: DependencyNodeRef}
interface DependencyOptions {
  readonly dependsOn?: readonly DependencyRef[]
}
// Proposed root activation after subclass fields have initialized:
// form.enableDependencies(): () => void
```

The small structural reference accepts concrete Field/Form generics without comparing their full recursive class surfaces. It is only a reference, not a snapshot dependency; arbitrary lookalikes are rejected by runtime tree-membership checks. HF-013 must verify it with declaration tests; do not reintroduce STAB-01 recursive expansion or use any as a workaround. Paths are runtime-checked tuples in v1, not an unbounded recursive TypeScript path generator. Optional authoring helpers with bounded recursion can be designed separately.

```ts
// Proposed usage; these members intentionally do not compile in 2.2.0.
class Checkout extends Form {
  country = new Field(StringType, 'US')
  postalCode = new Field(StringType, null, {
    dependsOn: [{path: ['country']}],
    validate: (value: string, form?: Checkout) =>
      form?.country.valueClear !== 'US' || /^\d{5}$/.test(value) || 'Use five digits',
  })
}
const form = new Checkout()
const disable = form.enableDependencies() // compile graph, do not validate or touch
form.country.rawValue = 'CA'              // validate source and affected targets
form.batch(() => {
  form.country.rawValue = 'US'
  form.postalCode.rawValue = '12345'
}) // each selected validator once, using final values
// On disposal: remove graph ownership, reverse indexes and queued work.
disable() // idempotent; later mutations use legacy automatic validation
```

Activation is explicit because base Form construction precedes subclass field initialization and today's notification ownership exists only while observed. Validation must work without UI subscriptions. Repeated activation on the same root returns the same idempotent disable callback (no reference counting); after disable, activation creates a new graph. An enabled root owns a separate membership/dependency index; subscription lifetime must not control it. Empty dependency declarations keep legacy scheduling. A child node shared between two enabled graph roots is a configuration error, while legacy non-graph sharing stays supported. Nested enabled graph roots with overlapping ownership are rejected too. Activation must discover conflicts before installing any links; an activation error installs nothing.

## Paths and HF-011

- A string segment is a literal property name, including dots; a number is a non-negative integer collection index. Empty paths, negative/fractional indexes, unknown properties, sparse/out-of-range indexes and non-node endpoints are configuration errors. No wildcard, string dot parser, JSON Pointer, `..`, or implicit coercion in v1.
- `scope: 'owner'` (default) starts at the closest containing Form. A validator in a row can depend on `['price']` in that same row; moving the row retains this owner and its identity. A scalar ArrayField item's owner is the containing Form, not a synthetic indexed Form. `scope: 'root'` starts at the explicitly enabled root; e.g. `['rows', 0, 'price']`. Collection endpoints represent aggregate cleaned values and ordered membership.
- Numeric paths bind to the **current position**, not the original object. Membership/reorder commits resolve them again; if the source at index 0 changes, affected targets revalidate even when both objects have equal values. Reading callbacks must use that same positional meaning.
- `{node: existingField}` is an explicit stable object reference. It follows the node across moves inside the enabled tree; callback code must read the captured node, not a mutable numeric path. It must initially belong to the enabled root. This is useful when a relation means “that item”, rather than “the first item”.
- HF-011 IDs identify runtime vertices and preserve local edges across index shifts. Snapshot itemIds are process-local metadata, not accepted persisted path segments, user IDs or a way to resurrect removed nodes. No match by value during setItemsValue/setForms. Replacement creates new vertices; positional paths rebind, direct node references do not.
- Existing dot-index server errors and serialization stay unchanged. Dependency paths are a separate typed representation and never appear in JSON/FormData.

```ts
// Proposed descriptors for a row validator:
dependsOn: [
  {path: ['price']},                         // local owner, survives row moves
  {path: ['taxRate'], scope: 'root'},
  {path: ['rows', 0, 'price'], scope: 'root'}, // current first row
]
// Stable cross-row relation (target is initialized after referencedField):
dependsOn: [{node: referencedField}]
// The validator closes over referencedField and reads its valueClear.
```

## Graph, cycles and deterministic order

A directed edge source → target means source changes invalidate target validation. A pass validates the target's whole synchronous rule pipeline, preserving its current rule order/messages. The graph also indexes containment for aggregate collection dependencies; a dependency on an aggregate containing the target is a self/cyclic dependency and is rejected. Changes to validation metadata do not act as new value sources; dependencies on errors/isValid/isTouched/isDirty are outside v1. Validators may read declared cleaned values/collection membership only; their own raw/clean validation behavior stays unchanged.

Compile and deduplicate resolved edges before executing callbacks. Use SCC detection (or equivalent DFS) to reject self edges and all multi-node cycles, with deterministic current paths and IDs in a configuration diagnostic, never raw values. No fixed-point iteration, silent edge removal or arbitrary cycle-breaking. Check after activation, dependency-option updates and structural rebinding, including a new cycle caused by a positional move.

At each validation commit, take the reachable closure along source → target edges from changed validation-requesting sources, including those sources' own normal validation requests. Run a stable topological order; tie-break independent nodes by current root traversal order (field enumeration, then collection indexes), not ID allocation order. A chain A → B → C runs A, B, C once; a diamond A → B/C → D runs A, B, C, D once (or C before B when traversal order says so), and D only after both. Continue independent/downstream checks after ordinary false/string results, as all values are already final; an invalid upstream value does not skip a dependent check. A target can reject a null/invalid source explicitly. Transitive closure is conservative even though pure validators cannot change cleaned values. Unrelated validators do not run, except unavoidable existing constructor checks or an explicitly requested full Form.checkValid().

Public `Form.checkValid()` remains a full check in existing traversal order; explicit field/collection checks remain immediate and local. Selective scheduling applies only to automatic graph-enabled validation. It does not reinterpret an explicit check as a graph request. No error-display/onBlur/onSubmit policy (HF-014) or async fencing (HF-016) is introduced.

## Batch, deletion and failure

1. Track writes, validation requests and structural changes during a synchronous batch. Deduplicate requests by stable target identity. `validate: false` / force_check false do not originate automatic graph requests. A prior true request in the same batch still validates the final value, matching existing queued-request behavior. Changed-but-suppressed sources still update/rebind graph membership; they do not by themselves trigger validation. A different automatic request can still select their validators through a real dependency edge.
2. After all writes: reconcile final membership, resolve paths, detect cycles, compute affected closure, then validate against complete final values. Repeated writes returning to the prior cleaned value need no dependent checks; a pending direct validation request still runs. Reorder/identity replacement is a structural change even with equal content. Multiple nested batches produce one outer graph pass. Constructor checks during addition keep their legacy behavior and are not claimed to be deduplicated by the future graph.
3. Commit final snapshots before subscriber callbacks. A subscriber's mutation starts the next transaction, never changes the pass currently delivered. No validators run on snapshot reads. External mutation of legacy arrays/custom objects is unsupported for automatic dependency scheduling; use library methods.
4. Deleting a target removes it and its outgoing/incoming graph indexes and queued validation. Deleting a source invalidates its surviving dependents exactly once; a local target removed in the same batch never runs. Rebuild positional paths against final membership; if a slot still exists, bind its current node. An unresolved positional path or removed direct reference is a configuration error, not an empty value and not a normal validation error. It cannot silently bind to a replacement. Direct refs require explicit option replacement by the application before the graph is valid again. A temporary missing slot restored within the same batch is judged only at finalization.
5. Configuration errors throw a dedicated proposed DependencyConfigurationError before graph validators execute. Dynamic mutations have already completed: no rollback. Retain final writes, finalize notifications, mark the graph invalid and require successful recompilation before any later graph validation (including full checks) can succeed. No invented field/global errors are injected. `isValid` alone is not evidence of configuration health after a caught configuration exception. The activation failure case differs: no graph was installed. The owner must approve this fail-closed policy and its diagnostic surface.
6. User callback exceptions retain completed writes and finalize once; original callback failure takes precedence over graph/finalization failures, as in Form.batch. A validator exception stops that pass and propagates after finalization; no claim of fully validated state. No async callbacks/validators or rollback. Removing nodes releases engine graph links, but user-owned descriptors/closures containing direct node references can themselves retain nodes; disposal cannot erase application references.

## Purity and compatibility boundary

Graph-enabled validators must return boolean/string synchronously without changing raw/clean values, structure, options, baselines, touched or errors, including on other fields. The engine alone applies the target's validation metadata. Guard library mutation entry points during a graph validation pass and reject a write before applying it (proposed ValidationMutationError); repeated passes must not become a feedback loop. Read-only helper views/type tests are recommended. Arbitrary external in-place JS writes cannot all be detected without proxies; they are prohibited by contract, not claimed to be fully intercepted. No Proxy-based dependency discovery or mutation tracking.

Forms without dependsOn or without explicit activation retain all 2.2.0 scheduling, callbacks, constructor behavior, payloads, reset, touched and commitBaseline semantics. Opt-in forms explicitly accept selective automatic validation, declared-context completeness and purity requirements. Existing potentially side-effecting legacy validators are not silently migrated. Activation itself must not validate or alter current errors/flags. Empty graphs stay on the legacy scheduling path. Changes to dependency options invalidate/recompile the graph through supported option updates; collection dependency configuration is construction-time in v1 because its options are not publicly writable today. No new arbitrary Form-property replacement interception.

## Alternatives and owner gates before HF-013

| Approach | Benefit | Cost / disposition |
| --- | --- | --- |
| Tuple paths + direct node references (primary) | Explicit position vs object semantics; handles literal dots; no recursive TS explosion | Runtime path checks; direct refs can retain nodes; explicit root activation |
| Dot strings only | Familiar error-path syntax | Escaping/number ambiguity and accidental position retargeting; not recommended |
| Stable IDs as persisted paths | Convenient remote references | Runtime IDs are not durable domain keys; requires a separate lookup/lifetime contract |
| Typed selector functions | Convenient TypeScript property access | Executing selectors risks hidden reads/side effects; acceptable only as explicit ref builders, no tracking |
| One root registry of validator descriptors | Clear lifecycle and shared config | Larger migration from field options; possible later alternative |
| Revalidate all / dynamic Proxy reads | Simpler fallback / fewer declarations | Full validation is retained explicitly; Proxy tracking excluded |

Owner approval is required for: (1) explicit activation/disposal and overlapping-root rejection; (2) whole-node dependency scope, path grammar and position/direct-ref distinction; (3) missing-node and cyclic configuration failures, invalid-graph recovery and isValid limitation; (4) cleaned-value/structural invalidation and suppression rules; (5) mutation rejection in opt-in validators, exception priority and synchronous-only scope; (6) stable topological tie-breaks and conservative transitive closure; (7) exact exported readonly ref types and declaration compatibility. These remain proposals, not DECISIONS entries.

HF-013 acceptance plan: declaration consumers in ESM/CJS; no-declaration legacy parity; chains/diamonds/disconnected components; self/multi-node/structural cycles; local/root/literal-dot/index paths; equal-valued reorder and full replacements; target/source deletion and missing refs; duplicate requests/nested batch/false writes/exception recovery; validators without subscribers; no raw values in diagnostics; deterministic disposal/link cleanup; validator-mutation rejection; snapshot atomicity/reentrant writes; selective invocation counts and profiling against STAB-02. Do not implement until the owner resolves the gates.
