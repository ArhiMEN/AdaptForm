# AdaptForm 3.0 — V3-02 architecture specification

[English](V3_ARCHITECTURE.md) · [Русский](V3_ARCHITECTURE.ru.md)

Status: **BLOCKED for implementation; specification package prepared for owner review**. Approved requirements are distinguished from review proposals and `OWNER_DECISION_REQUIRED` below. No implementation, release, merge or publication is authorized by this document.

## 1. Baseline and document provenance

Inspection date: 2026-10-28. Local branch `work`, HEAD `670c6a04014fbf938574bfd8eb2a706e44a9d4d0`; index and working tree initially clean. Remote `master` has the same SHA. Package metadata remains 2.2.0. Historical 2.3.0 milestone documents describe accepted source work, not a published 2.3.0.

[PR #29](https://github.com/ArhiMEN/AdaptForm/pull/29), `docs/v3-architecture-legacy-policy`, is an **open, unmerged draft**, head `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`, base equal to the inspected HEAD. Its six files are AGENTS EN/RU, DECISIONS EN/RU and V3_ARCHITECTURE EN/RU. Its architecture files were absent locally. These files use the same intended paths and extend the direction into V3-02; this does not integrate PR #29 or its AGENTS changes. Reconcile the documentation histories during separately authorized integration; do not overwrite either side automatically.

Read AGENTS EN/RU, project context/decisions, HF-005–010 state, HF-011 identity, HF-013 dependencies and HF-015 errors. Evidence links below refer to this unchanged source baseline. The V3-01 audit is evidence, not blanket approval of its API proposals.

Navigation: [code catalogue](V3_ERROR_CODES.md), [migration, tasks and risk matrix](../roadmap/v3.0.0/PLAN.md). Historical owners: [Field](../../src/core/fields/Field.ts), [Form](../../src/core/Form.ts), [types](../../src/core/types/FieldType.ts), [scalar collection](../../src/core/fields/ArrayField.ts), [form collection](../../src/core/fields/ArrayFormField.ts), [errors](../../src/core/ValidationError.ts), [schema](../../src/core/ErrorsShema.ts), [snapshots](../../src/core/state/snapshot.ts), [graph](../../src/core/state/DependencyGraph.ts), [scheduler](../../src/core/state/ObservableNode.ts).

## 2. Approved requirements

- Target 3.0.0 replaces the earlier 2.3.0 direction; preserve STAB-01/02, HF-011, PERF-01, HF-013 and useful HF-015 functionality.
- One canonical structured error representation. Sources: `type`, `custom`, `server`, `manual`. Nonempty codes, optional params; repeated codes and order preserved. Engine assigns source. Local Field errors have no path; Form aggregation adds full relative paths. Own Form globals aggregate at `[]`.
- I18N-01: core performs **no translation or formatting**. No RU/EN dictionaries, formatter/resolver, locale state, i18n dependency or message/code fallback. Built-in rules emit code and params only. Custom/server inputs may contain an optional message, including `''`. Applications own display entirely.
- Types implement only `validateErrors()`. New structural implementations do not require inheritance. User validators return arrays without source; strings, booleans, individual objects and Promise are invalid results. Async validation is excluded.
- Node `validate()` updates state and returns `{valid: boolean}` accounting for every active source. `getErrors()` only reads. Errors are readonly and detached from caller-owned data.
- Validation preserves server/manual. An actual field-value change clears both own server and own manual errors; a sibling edit does not clear another field's errors. Reset clears errors; baseline commit does not.
- Mutations from validators and required callbacks are forbidden in every entry path, including collections, standalone checks and dependency passes. Exceptions are contract/programming failures, never user ValidationError.
- Evolve ErrorsSchema, with declarative configuration and an adapter escape hatch; no backend detection. Separate Parse/Normalize and Apply. Default replace scope is the whole receiver Form; append is explicit. Unknown paths default to an application error; global/ignore are explicit. Preflight precedes all writes. Revision plus an explicit operation token protects delayed responses. No HTTP client.
- No implicit legacy bridge. Stop affected design/implementation on a disputed removal, fallback, workaround or duplicate state; provide evidence and choices. Independent approved documentation can continue.

## 3. Error and validation signatures

The following declarations fix the approved shape. The meaning of arbitrary `params` is intentionally not narrowed to JSON without ODR-02. These are future declarations inside Markdown, **not current package exports**.

```ts
export type ValidationErrorSource = 'type' | 'custom' | 'server' | 'manual'
export type ValidationPath = readonly (string | number)[]

export interface ValidationErrorInput {
  readonly code: string
  readonly params?: Readonly<Record<string, unknown>>
  readonly message?: string
}

export interface ValidationError extends ValidationErrorInput {
  readonly source: ValidationErrorSource
}

export interface LocatedValidationError extends ValidationError {
  readonly path: ValidationPath
}

export interface ValidationResult {
  readonly valid: boolean
}

export type FieldValidator<T, F extends Form = Form> = (
  value: T,
  form?: F,
) => readonly ValidationErrorInput[]

export type RequiredRule<F extends Form = Form> =
  boolean | ((form?: F) => boolean)

export interface FieldTypeContract<T, O extends object> {
  options: O
  cast(rawValue: unknown): T | null
  validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export type FieldTypeConstructor<T, O extends object> =
  new (options: O) => FieldTypeContract<T, O>
```

`FieldTypeContract` is the agreed computational core, **not a claim that removal of `getTypeName()` is approved**. The final metadata member is blocked by ODR-01. The base class remains an optional convenience; no `instanceof FieldType`, private-member branding, `validate()` bridge or subclass override detection may be required. General Field defaults must be identical for structural and inherited types. Type-specific options and casts remain supported.

The existing `(value, form?)` callback context is retained; V3-01's proposed context wrapper was not approved. ArrayField custom callbacks continue receiving clean values; ArrayFormField callbacks continue receiving Form instances. Runtime purity applies even though TypeScript cannot remove mutator methods from these objects. Generalize existing options with typed validators without weakening FormFieldsValue inference. Do not add nested/collection dependency paths to HF-013.

Candidate node surface for owner review:

```ts
export interface ErrorNodeApi {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  validate(form?: Form): ValidationResult
  setErrors(errors: readonly ValidationErrorInput[]): void
  clearErrors(options?: {
    readonly sources?: readonly ValidationErrorSource[]
    readonly recursive?: boolean
  }): void
}

// Scalar Field: own errors, without path.
export interface ScalarErrorReader {
  getErrors(): readonly ValidationError[]
}

// Form and collections: a flat list relative to the receiver.
export interface AggregateErrorReader {
  getErrors(): readonly LocatedValidationError[]
}
```

`setErrors()` replaces only own manual errors; `setErrors([])` does not invalidate a previously completed client check. `clearErrors()` defaults to all own sources and `recursive:false`; explicit clearing of type/custom invalidates client-check knowledge. Form own errors are globals. These method replacements are proposals disclosed in the migration ledger, not hidden aliases.

Field retains tri-state validity. Any own error means false; no errors plus an unchecked current input means null; a completed successful current check means true. Form/collections retain boolean aggregate validity: unchecked descendants prevent true. A successful `validate()` returns `valid === (receiver.isValid === true)` at its completion, not after later subscriber or batch writes. Retained server/manual errors therefore make the result false even if every client rule succeeds. Repeated reads do not cast, validate, change touched or execute localization.

Example of the new result and callback shapes:

```ts
const field = new Field(StringType, 'x', {
  validate: (value: string) =>
    value.startsWith('x') ? [] : [{code: 'app.prefix', params: {prefix: 'x'}}],
})
field.setErrors([{code: 'app.review_required', message: 'Review requested'}])
const {valid} = field.validate() // false: manual error is still active
const errors = field.getErrors() // no validation, no path, no translation
void [valid, errors]
```

No helper in core supplies a message when one is absent. Custom codes are unrestricted nonempty strings; they are not required to appear in the built-in catalogue. Catalogue-specific discriminated types check built-in parameters; the general input permits application codes without a closed enum. `source` and local `path` supplied through untyped input are not trusted or copied. A malformed code, params shape or result container is a contract error before replacement.

## 4. Execution, state and purity

Keep the scalar order: empty/required → failed cast → type rules → custom rule. Empty optional values skip later rules. Type failure skips custom. Built-ins retain existing checks, order, duplicate codes and clean-value representations while removing all message construction. The full code catalogue records the actual gates. Container early-exit and construction timing are **ODR-03**, not silently changed by this specification.

Use a compute boundary that always guards required/type/custom callbacks, not only graph-enabled execution. Public setters/mutation methods, reset, baseline commit, options replacement, error writes, structural methods, graph activation/disposal and recursive validation must reject calls from guarded callbacks before any write. Wrap collection callbacks too. The engine writes its own result only after the user callback exits; restore guard state with `finally`. Existing plugin initialization is a separate phase, not accidentally prohibited as a validator.

Compute into temporary client results. On a thrown/invalid/Promise result, propagate the failure, do not manufacture ValidationError, and do not mark the attempted check successful. Preserve server/manual and finalize already completed outer mutations according to existing batch exception precedence. State whether a node remains unchecked; never reuse an old true result as proof of a failed current check. A root failure does not claim unvisited nodes were checked.

HF-013 keeps explicit activation/disposal, direct ordinary Field endpoints, whole-pipeline dependencies, topological chains/diamonds and automatic-pass deduplication. Changed **clean** values originate dependency propagation; a selected target replaces only type/custom and preserves its server/manual. No source label `dependency`. Explicit checks remain immediate, including inside batch. Snapshot reads execute zero validators. Preserve graph cycle/missing-source/ownership errors and recovery; configuration errors are not user errors.

Arbitrary in-place writes to values/options/arrays and opaque custom objects are prohibited inside callbacks and are not universally interceptable without Proxy. The library guarantees rejection through supported mutation APIs; readonly declarations are not a sandbox. Preserve PERF-01 discovery of external value/container edits on later reads; this is not a guarantee of revision tracking for unsupported edits.

## 5. Lifecycle and identity

Review specification: an actual change is structural inequality of post-plugin raw input **or** clean value, using the existing supported-value equality policy. This distinguishes invalid raw inputs that both cast to null. Equal assignment may touch as before, but does not clear server/manual. An actual change invalidates type/custom, clears own server/manual, increments revision, then optionally requests validation. `validate:false` means no automatic request; stale client success cannot remain true. Default/plugin/cast, dirty and payload policies are otherwise retained.

| Operation | type/custom | server | manual | Other state |
| --- | --- | --- | --- | --- |
| Actual scalar change, validation on | Replace by requested check | Clear own | Clear own | Touch; increment value revision |
| Actual scalar change, validation off | Clear; unchecked | Clear own | Clear own | Touch; increment value revision |
| Equal assignment | Recheck only if requested | Keep | Keep | Existing touched behavior |
| Explicit validate | Recompute selected pipeline | Keep | Keep | No touched/baseline change |
| Dependency-only target recheck | Recompute target | Keep | Keep | No target edit/revision |
| Manual setErrors | Keep | Keep | Replace own | No value/touched change |
| Server replace | Keep | Replace in token scope | Keep | No validation |
| Server append | Keep | Append in token scope | Keep | No validation |
| commitBaseline | Keep | Keep | Keep | Capture clean baseline only |
| reset | Clear; unchecked | Clear | Clear | Defaults, touched false, reset generation |
| Reads/JSON/FormData | Keep | Keep | Keep | No validation/error serialization |
| Rejected parse/apply preflight | Keep | Keep | Keep | No model/token consumption |

Logical storage partitions sources, but each error has one canonical owner. A client-check marker is necessary state, not a second boolean that can disagree with active errors. Do not retain a mutable string facade. Proposed display-independent merge order is type → custom → server → manual; preserve insertion order within a source. Full Form read traverses field order then own globals; collections read own errors then current child order. Review this order before implementation; no deduplication by code or message.

Container rules:

- Retained nodes keep identity, baseline, own errors and subscribers through move. Their aggregate paths use current indexes.
- Changing a leaf clears its own server/manual and those sources on containing **collection nodes**, whose value changed; unrelated items are preserved.
- Insert/remove/move clears own server/manual of each affected containing collection, including equal-content moves. It does not clear retained item errors or globals of retained Forms.
- Form globals are separate: descendant edits and structural changes do not clear them. Explicit source clearing, a scoped server replace or reset does.
- Replacement setters construct new nodes as today; old nodes detach. Do not match by equal value. New instances do not inherit old error state.
- Nested Forms currently exist through ArrayFormField; no new standalone FormField is introduced.
- reset affects surviving membership/order and constructor reset targets, not collection restoration or baseline restoration. Baselines remain; reset may be dirty. Clear all errors recursively; validation becomes unknown. Every reset invalidates affected operation tokens even if values happen to be equal.
- commitBaseline does not change input revisions, error state or outstanding response tokens. Dirty can become false while errors remain.

Batch is synchronous and does not roll back arbitrary writes. Automatic validation is deferred/coalesced; direct validate is immediate and returns the current effective result. Live getters see current state; getSnapshot reads the previous committed state inside batch. Once values/errors settle, commit all affected snapshots before notifying. A later write in the same batch can clear errors just applied earlier: call order matters. A→B→A increments revisions and does not resurrect cleared server/manual; clean-based dirty and HF-013 net-change policy remain independent.

## 6. Snapshots and readonly errors

Proposed replacement: required `NodeSnapshot.errors: readonly ValidationError[]` containing own errors only. Descendants remain in child snapshots; no aggregate-path list cached on every ancestor. Remove old string errors/allErrors/globalErrors and redundant optional validationErrors after the removal ledger is approved. Preserve value snapshots, dirty/touched, child snapshots and HF-011 item identities. Optional-to-required itemIds is a separate producer migration, not permission to discard identity.

Errors, params, paths and lists are detached and recursively immutable within the chosen ODR-02 domain. Code/source/params changes notify even if message is unchanged. Equal final state reuses committed snapshot references and emits nothing. A getErrors aggregate may allocate and need not retain reference identity. Do not freeze caller-owned input in place. Do not store response objects, values or parent references in errors. Revisions/tokens are operation metadata and need not be serialized or included in snapshots.

## 7. ErrorsSchema: one parser, two configuration modes

The same normalization and mapping owners serve declarative records/tree configuration and a custom adapter. No backend presets, path guessing, implicit JSON.stringify messages or code-shaped-object heuristics. A code-shaped nested field is a field unless the configured decoder says otherwise.

Candidate public configuration declarations:

```ts
export interface ServerErrorInput extends ValidationErrorInput {
  readonly path: ValidationPath
}

export type ErrorSelector<T> =
  | {readonly at: ValidationPath}
  | {readonly read: (input: T) => unknown}
  | {readonly value: unknown}

export interface StaticErrorMapping {
  readonly kind: 'static'
  readonly from: ValidationPath
  readonly to: ValidationPath | ((error: ServerErrorInput) => ValidationPath | null)
}

export interface DynamicErrorMapping {
  readonly kind: 'dynamic'
  readonly pattern: RegExp
  readonly key: (path: ValidationPath) => string
  readonly to: (match: RegExpMatchArray, error: ServerErrorInput) => ValidationPath | null
  readonly priority?: number
}

export interface ErrorsSchemaLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxErrors: number
  readonly maxPathSegments: number
  readonly maxStringLength: number
}

export interface SchemaCommon {
  readonly mappings?: readonly (StaticErrorMapping | DynamicErrorMapping)[]
  readonly fallback?: (error: ServerErrorInput) => ValidationPath | null
  readonly transform?: readonly ((error: ServerErrorInput) => ServerErrorInput)[]
  readonly limits?: Partial<ErrorsSchemaLimits>
}

export interface RecordsSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'records'
  readonly select?: ErrorSelector<R>
  readonly path: ErrorSelector<unknown>
  readonly code: ErrorSelector<unknown>
  readonly message?: ErrorSelector<unknown>
  readonly params?: ErrorSelector<unknown>
  readonly decodePath?: (value: unknown) => ValidationPath
}

export interface TreeSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'tree'
  readonly select?: ErrorSelector<R>
  readonly leaf: (value: unknown, path: ValidationPath) =>
    readonly ValidationErrorInput[] | undefined
  readonly decodeKey?: (key: string) => ValidationPath
}

export interface AdapterSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'adapter'
  readonly extract: (response: R) => Iterable<ServerErrorInput>
}

export type ErrorsSchemaConfig<R> =
  RecordsSchemaConfig<R> | TreeSchemaConfig<R> | AdapterSchemaConfig<R>

export interface ErrorMappingTrace {
  readonly index: number
  readonly from: ValidationPath
  readonly to: ValidationPath | null
  readonly matchedBy: 'static' | 'dynamic' | 'fallback' | 'identity'
}

export interface ServerErrorEntry {
  readonly path: ValidationPath
  readonly error: ValidationError & {readonly source: 'server'}
}

declare const parsedErrorsBrand: unique symbol
export interface ParsedServerErrors {
  readonly [parsedErrorsBrand]: true
  readonly entries: readonly ServerErrorEntry[]
  readonly trace?: readonly ErrorMappingTrace[]
}

export declare class ErrorsSchema<R = unknown> {
  constructor(config: ErrorsSchemaConfig<R>)
  parse(response: R, options?: {readonly trace?: boolean}): ParsedServerErrors
}
```

ServerErrorEntry separates routing path from the single canonical pathless error. Apply installs that error in local storage without normalization; flat LocatedValidationError is a read projection only. Do not retain a second copy of the error fields in the batch. The brand denotes engine-owned normalized data, not a user constructor. The implementation must validate batch ownership at runtime rather than trust an exported structural cast or shallow freeze. Apply reuses canonical entries; it does not clone params for every appended error. ODR-02 still gates arbitrary parameter normalization.

Selectors use own data-property paths only; absent select means the response itself. Records requires a selected array, with one configured path/code per record; path must be a tuple unless decodePath explicitly defines a string codec. Missing configured path/code or a malformed present message/params throws; absent optional message/params are omitted. No select/code fallback is inferred. A deliberately empty selected array means no errors; a missing envelope does not.

Tree leaf runs before descent: an array consumes that leaf (including `[]`); undefined descends into own object properties/array indexes. An unrecognized primitive is a parse error. Default object keys are literal; array indexes are numbers. decodeKey explicitly enables dotted/custom keys. Empty object/array containers are valid empty trees. Null and message arrays require explicit leaf behavior. No automatic recognition of `{code:...}`. Adapter accepts only synchronous Iterable output; Promise/AsyncIterable is rejected. All modes share one pipeline: extraction → shallow input-shape checks → ordered transforms (once each) → mapping → one final deep normalization. Recheck transformed/mapped code, path and shape before normalization; Apply does not repeat it.

Static mapping wins, then the first matching dynamic rule by descending priority and registration order; null drops that entry without trying later rules. Fallback runs once only when no rule matches; absent fallback means identity. Colliding targets accumulate, including repeated codes. Duplicate static rules are a configuration conflict until a documented override policy is chosen in ODR-04. Dynamic key codec is explicit; preserve regex semantics without caller-visible lastIndex mutation. Callbacks execute once at their designated stage. Optional trace replaces detailed-parser functionality without storing tracing metadata in local errors.

Callbacks used during parsing must not mutate library nodes, including through captured references. Guard the parse compute boundary; no Form is passed by the parser. Callback exceptions and invalid output abort parsing with no batch. No partial parse-and-replace mode is introduced; callers needing tolerant extraction must explicitly filter in their adapter and own that policy.

Declarative example for the **already normalized tuple-path list exercised by HF-015 tests**, not a new backend response standard:

```ts
const schema = new ErrorsSchema<unknown>({
  kind: 'records',
  path: {at: ['path']},
  code: {at: ['code']},
  message: {at: ['message']},
  params: {at: ['params']},
})
const parsed = schema.parse([
  {path: ['tags', 1], code: 'taken'},
  {path: ['tags', 1], code: 'taken', message: 'Again'},
])
void parsed
```

Adapter example preserves the existing test where two keys map to one field:

```ts
const mapped = new ErrorsSchema<Record<string, string>>({
  kind: 'adapter',
  extract: response => Object.entries(response).map(([key, message]) => ({
    path: [key], code: 'server', message,
  })),
  mappings: [
    {kind: 'static', from: ['a'], to: ['email']},
    {kind: 'static', from: ['b'], to: ['email']},
  ],
})
const both = mapped.parse({a: 'first', b: 'second'})
void both
```

Existing static/dynamic/fallback, whole-leaf transformers, nest/forArray, clone/merge/fromObject and parser subclass integrations have useful consumers in [schema tests](../../tests/unit/ErrorsShema.test.ts) and [Form integration tests](../../tests/unit/FormErrorsShema.test.ts). Their exact replacement signatures/semantics are **ODR-04**. Configured input normalization is supported integration functionality, not a legacy bridge. Do not implement a second parser while resolving helpers.

## 8. Apply, revisions and operation tokens

Review candidate signatures; post-commit failure reporting is blocked by ODR-05:

```ts
declare const serverOperationBrand: unique symbol
export interface ServerErrorOperation {
  readonly [serverOperationBrand]: true
}

export interface BeginServerErrorsOptions {
  readonly scope?: ValidationPath
}

export interface ApplyServerErrorsOptions {
  readonly operation: ServerErrorOperation
  readonly mode?: 'replace' | 'append'
  readonly unknownPath?: 'error' | 'global' | 'ignore'
}

export interface ApplyServerErrorsResult {
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
}

export interface FormServerErrorApi {
  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation
  applyServerErrors(
    batch: ParsedServerErrors,
    options: ApplyServerErrorsOptions,
  ): ApplyServerErrorsResult
}
```

Defaults: scope `[]` means the whole receiver Form subtree, mode replace, unknownPath error. Scope resolves to one registered node/subtree when beginning the operation. Parsed target paths are relative to the receiver Form, not relative to scope. No second scope option can contradict the token. To apply to a particular Field, capture that Field's subtree scope; there is no source-taking legacy setter. A global `[]` is a genuine Form target, not a missing field.

Operation lifecycle proposal:

1. Begin after subclass initialization and **before dispatching the application request**. Capture receiver/scope node identity, monotonic subtree input revision, structural revision and reset generation. It does not validate, touch, dirty or publish a snapshot.
2. A newer operation supersedes all older outstanding operations on overlapping scopes (ancestor/descendant). Disjoint scopes remain independent. This supplies latest-operation-wins even when values are equal; value revision alone is insufficient.
3. Every actual supported input change increments affected subtree revisions, even with validate false or A→B→A. Structural revision tracks identities and order, not only payload equality; move/remove/insert/replacement invalidate affected captures. Reset always invalidates affected tokens. Metadata-only validation/errors and commitBaseline do not.
4. Apply rejects wrong-receiver, superseded, used, detached or revision-mismatched tokens before any write/consumption. Even append requires a token. A successful apply consumes it once, including an empty batch; failed parse/preflight does not consume an otherwise valid token. No force/stale bypass is specified.
5. First validate batch ownership and operation, resolve **all** targets, verify scope and unknown policies, calculate final source partitions and stage immutable results. Recheck revisions immediately before a non-callback commit. Then update affected nodes once each; do not re-run schema callbacks, cast, validators or normalization.
6. Replace removes only server errors in the scope, including omitted nodes and globals. Empty replace clears that server scope. Append adds in order. Preserve type/custom/manual and client-check knowledge.
7. Unknown error is the default; global explicitly converts to an own global of the closest resolved Form **inside scope**, with the original path retained in the apply report. If no Form exists inside a scalar scope, global conversion is impossible and fails. Ignore explicitly drops and reports. An out-of-scope target is always an error, not an unknown-path escape. Globals are not later rebound to new fields.
8. No target write occurs on any parse/preflight error. Observer/capture/finalization failure after commit requires ODR-05; do not claim the existing scheduler already satisfies the stronger unconditional guarantee.

Example, application-owned HTTP omitted:

```ts
const operation = form.beginServerErrorOperation()
// Dispatch and await the application's request outside a synchronous batch.
const batch = schema.parse(response)
form.applyServerErrors(batch, {operation})
```

The library performs no HTTP, cancellation or submit orchestration. Applications associate responses with tokens, configure API paths/cross-field semantics and decide request concurrency. The proposed overlapping-scope token rule, unlike V3-01's revision-only suggestion, covers older responses with unchanged values. Conservative rejection on any scope change avoids rebasing old positional errors onto different items. Unsupported in-place mutation/opaque state cannot receive a false revision guarantee; applications must use supported setters. Tokens are process-local, not persistence or transport IDs.

## 9. Security and performance invariants

Resolve through actual registered child nodes and own properties, never arbitrary `object[segment]` traversal. `__proto__`, constructor, prototype and toString are literal data names, not prototype access. Use Map/null-prototype dictionaries or safe own-property creation; no recursive Object.assign into ordinary objects. Numeric segments are finite safe nonnegative integers and must address an existing array item; no auto-creation. Do not coerce numeric-looking object keys without a chosen codec.

Bound traversal and normalization; detect cycles in JSON-shaped responses and reject accessors/non-data objects in standard declarative readers. Do not call unknown toJSON or turn arbitrary values into messages. Candidate limits for review: depth 64, nodes 100000, errors 10000, path segments 64, string length 65536; define parameter budget with ODR-02. Limits must have deterministic diagnostics and no partial application. A custom adapter is trusted application code, not a sandbox; core can bound its own traversal/output, not arbitrary user CPU or IO.

Preserve PERF-01 child reconciliation/refresh epochs/frozen subtree reuse and existing callback counts until ODR-03 resolves intentional timing changes. Group server errors before writing; avoid the current repeated setErrors([...previous, next]) normalization. Build one target index per Apply. Share empty arrays; avoid four eager arrays or full aggregate paths on every node. Revision propagation should follow changed ancestors; operation scope capture/preflight may scan that scope and must be measured. Do not promise O(1) snapshots or writes: external-edit discovery and HF-013 topology scans remain.

Evidence: [PERF-01](../roadmap/v2.3.0/PERFORMANCE.md), [HF-015 measurements](../roadmap/v2.3.0/ERRORS_REVIEW.md), [performance regression tests](../../tests/unit/headless-performance.test.ts). Historical fixed HF-015 full harness showed +20.6% creation, +7.4% unchanged snapshot, +23.9% scalar add/remove, +14.6% nested add/remove and about 0.3 MiB extra post-GC heap; paired readings varied. These are historical observations, not fresh measurements or universal thresholds.

## 10. OWNER_DECISION_REQUIRED

Affected design is stopped at the listed boundary. No choice below is treated as approved. Independent approved documentation is complete; implementation stays blocked.

| ID | Evidence and conflict | Choices and migration consequences | Recommendation / stopped boundary |
| --- | --- | --- | --- |
| ODR-01 | Field.ts:219–228 uses getTypeName in invalid_type.expected; built-ins return Russian labels (StringType:47, NumberType:66, DateType:61). I18N-01 forbids a hidden localized fallback. The method is also public introspection. | A: replace with stable machine type ID and migrate introspection; B: retain method name but redefine return as machine ID, still a semantic break; C: remove expected/type introspection, losing useful data. | A; owner must approve member/signature and exact IDs (including date/datetime and custom types). Final FieldType metadata and cast invalid_type params are blocked. No Russian labels retained. |
| ODR-02 | ValidationError.ts:49–55 and snapshot.ts:40–72 currently accept cycles and snapshot-describe Date/Map/Set/opaque params. V3-01 proposed JSON-only params; current approval says structured data, not JSON-only. | A: readonly JSON data, reject unsupported values/cycles, application converts; B: preserve documented snapshot descriptors/cycles; C: extensible custom normalization adds API/cost. | A for predictability, but not selected. Final params domain, deep-readonly types, budget and normalization are blocked; built-in primitive params are unaffected. |
| ODR-03 | form-lifecycle-baseline.test.ts:92–105 expects new item validators twice; :176–185 expects constructor validation during deferred hydration. Collections return before child checks on size failure. These are observed contracts, not proven obsolete bridges. | A: retain timing/gates; B: suppress intermediate engine-controlled checks and always traverse children on full validation. B changes callback counts/context and deferred semantics. | B for one final check, only after explicit approval. Hydration and container traversal redesign are stopped; scalar error contract and all-source result are unaffected. |
| ODR-04 | ErrorsShema.ts supports whole-leaf transformers, regex mapping, nest/forArray, clone/merge and overridden parseErrors; HF-015 stores string and structured errors; snapshots duplicate legacy errors. Existing tests exercise these integrations. | Approve per-row remove/replace/keep choices in the migration ledger; particularly helper composition, DefaultErrorsSchema, metadata readers and snapshot producer optionality. A blanket legacy label is insufficient. | One parser/configurable adapters with full replacements. Exact helper/export removals are stopped. No silent old-parser bridge or compatibility alias is introduced. |
| ODR-05 | ObservableNode.ts:37–51,142–151,254–284 commits snapshots then propagates subscriber errors; batch finalization and custom capture can also throw. Unconditional 'Apply error leaves state unchanged' conflicts with current post-commit exception behavior. | A: define atomicity for parse/preflight/staged commit; report notification failures separately after commit; B: change common observer error delivery globally; C: rollback after notifications cannot undo what observers saw and is not a sound guarantee. | A, with explicit result/error channel and batch semantics approved by owner. Final Apply success/failure return contract is blocked. Do not swallow notifications or claim universal rollback. |

ODR-04 inventory, alternatives, migration/tests and implementation gates are in the [plan](../roadmap/v3.0.0/PLAN.md). The code catalogue explicitly marks its one unresolved family rather than inventing a localized or machine-ID fallback. This is not a fully approved final API until the decisions are closed.
