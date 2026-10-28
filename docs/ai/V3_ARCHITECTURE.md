# AdaptForm 3.0 — V3-02 architecture specification

[English](V3_ARCHITECTURE.md) · [Русский](V3_ARCHITECTURE.ru.md)

Status: **READY_FOR_OWNER_REVIEW**. Owner decisions ODR-01–05 are approved; the resulting design contracts below await specification acceptance. This is a future API, not an implemented feature. V3-03 requires separate authorization; merge and release are not authorized.

## 1. Baseline and document provenance

Initial V3-02 inspection: 2026-10-28, `work`/`670c6a04014fbf938574bfd8eb2a706e44a9d4d0`, then equal to remote master; index/tree clean. ODR finalization starts on `docs/v3-02-specification` at `96a82c8f015ff34115e192b0c3947d50052b2ebf`, clean index/tree, existing [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). Package remains 2.2.0. Historical 2.3.0 documents describe source work, not a published 2.3.0.

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

These declarations specify the future contracts under approved ODR-01/02. They are inside Markdown, **not current package exports**. The params root remains a named parameter object; its values use the recursive JSON domain.

```ts
export type ValidationErrorSource = 'type' | 'custom' | 'server' | 'manual'
export type ValidationPath = readonly (string | number)[]

export type JsonValue = string | number | boolean | null
  | readonly JsonValue[] | JsonObject
export interface JsonObject { readonly [key: string]: JsonValue }
export type ErrorParams = JsonObject

export declare class ErrorContractError extends TypeError {
  readonly reason: string
  readonly path: ValidationPath
}

export interface ValidationErrorInput {
  readonly code: string
  readonly params?: ErrorParams
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
  readonly typeId: string
  options: O
  cast(rawValue: unknown): T | null
  validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export declare abstract class FieldType<T, O extends object>
  implements FieldTypeContract<T, O> {
  abstract readonly typeId: string
  options: O
  constructor(options: O)
  abstract cast(rawValue: unknown): T | null
  abstract validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export type FieldTypeConstructor<T, O extends object> =
  new (options: O) => FieldTypeContract<T, O>
```

`FieldTypeContract` requires an explicit nonempty `typeId`; constructor names are never inferred. Remove `getTypeName()` without an alias. The base class remains optional; no instanceof/branding/validate bridge/override detection. Defaults, options and casts work equally for structural and inherited types. Built-in IDs and custom-type migration are in the catalogue.

The existing `(value, form?)` callback context is retained; V3-01's proposed context wrapper was not approved. ArrayField custom callbacks continue receiving clean values; ArrayFormField callbacks continue receiving Form instances. Runtime purity applies even though TypeScript cannot remove mutator methods from these objects. Generalize existing options with typed validators without weakening FormFieldsValue inference. Do not add nested/collection dependency paths to HF-013.

Final node surface under ODR-04:

```ts
export interface ErrorNodeApi {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  getOwnErrors(): readonly ValidationError[]
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

`setErrors()` replaces only own manual errors; `setErrors([])` does not invalidate a previously completed client check. `clearErrors()` defaults to all own sources and `recursive:false`; explicit clearing of type/custom invalidates client-check knowledge. Form own errors are globals. getOwnErrors() is retained on all nodes, including Form (own globals); errors exposes the same readonly own-view. These are explicit structured APIs, with no string aliases.

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

Keep the scalar order: empty/required → failed cast → type rules → custom rule. Empty optional values skip later rules. Type failure skips custom. Built-ins retain existing checks, order, duplicate codes and clean-value representations while removing all message construction. The full code catalogue records the actual gates. ODR-03 B replaces constructor checks and container child early-exits as specified in section 5.

Use a compute boundary that always guards required/type/custom callbacks, not only graph-enabled execution. Public setters/mutation methods, reset, baseline commit, options replacement, error writes, structural methods, graph activation/disposal and recursive validation must reject calls from guarded callbacks before any write. Wrap collection callbacks too. The engine writes its own result only after the user callback exits; restore guard state with `finally`. Existing plugin initialization is a separate phase, not accidentally prohibited as a validator.

Compute into temporary client results. On a thrown/invalid/Promise result, propagate the failure, do not manufacture ValidationError, and do not mark the attempted check successful. Preserve server/manual and finalize already completed outer mutations according to existing batch exception precedence. State whether a node remains unchecked; never reuse an old true result as proof of a failed current check. A root failure does not claim unvisited nodes were checked.

HF-013 keeps explicit activation/disposal, direct ordinary Field endpoints, whole-pipeline dependencies, topological chains/diamonds and automatic-pass deduplication. Changed **clean** values originate dependency propagation; a selected target replaces only type/custom and preserves its server/manual. No source label `dependency`. Explicit checks remain immediate, including inside batch. Snapshot reads execute zero validators. Preserve graph cycle/missing-source/ownership errors and recovery; configuration errors are not user errors.

Arbitrary in-place writes to values/options/arrays and opaque custom objects are prohibited inside callbacks and are not universally interceptable without Proxy. The library guarantees rejection through supported mutation APIs; readonly declarations are not a sandbox. Preserve PERF-01 discovery of external value/container edits on later reads; this is not a guarantee of revision tracking for unsupported edits.

## 5. Lifecycle and identity

Final lifecycle contract: an actual change is structural inequality of post-plugin raw input **or** clean value, using the existing supported-value equality policy. This distinguishes invalid raw inputs that both cast to null. Equal assignment may touch as before, but does not clear server/manual. An actual change invalidates type/custom, clears own server/manual, increments revision, then optionally requests validation. `validate:false` means no automatic request; stale client success cannot remain true. Default/plugin/cast, dirty and payload policies are otherwise retained.

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

Logical storage partitions sources, but each error has one canonical owner. A client-check marker is necessary state, not a second boolean that can disagree with active errors. Do not retain a mutable string facade. Display-independent merge order is type → custom → server → manual; preserve insertion order within a source. Full Form read traverses field order then own globals; collections read own errors at path [] then current child order. No deduplication by code or message.

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

### ODR-03 B: assembly boundary and validation counts

Construction initializes plugins, options, raw/clean values, reset targets, membership/ownership and baselines; it runs **zero required/type/custom validation callbacks**, including non-null defaults. Casting/plugin initialization is not validation. A standalone `new Field`, collection or concrete Form returns unchecked (Field null, aggregate false). There is no implicit constructor-final validation and no new finalize/initialization alias.

The completion boundary is return from the most-derived `new` and, for engine-owned construction/hydration, completion of all factories/subclass initializers, assignments, attachment and baseline capture in that operation. Engine assembly scopes suppress engine-controlled checks across nested constructors with finally-based cleanup. A base Form constructor must never validate subclass properties. Explicit application validation during subclass construction/factory assembly violates the contract; known active assembly scopes reject it. The engine cannot detect every arbitrary user constructor boundary; applications call validate only after construction returns.

`setFields(data, false)`, `setItemsValue(data, false)` and `setForms(data, false)` perform zero validation callbacks, including factory-created defaults. With validation enabled, assign/hydrate the whole requested structure first, then request one final full receiver pass (or the existing limited HF-013 selection). New descendants receive no preliminary checks. Existing scalar assignment requests its scalar pipeline once; no redundant initialization pass. Reads, serialization, begin operation, error writes, reset and baseline capture execute zero validation callbacks.

A full explicit validate visits each registered node exactly once in deterministic field/item order. A Form passes itself to its direct children; a nested Form becomes the context for its own children; a standalone collection forwards its supplied Form or undefined. Compute container own required/min/max first, then visit **all** children even when the container or earlier children return validation errors, then run its custom callback once if its own structural checks succeeded. Child validation errors do not gate this callback. A malformed result or thrown contract/programming error aborts the pass; full traversal is guaranteed for ordinary ValidationError results, not exceptions. Aggregate validity includes own and descendant errors/unchecked markers.

Own container gates preserve first required → min → max failure and skip own custom on failure; they no longer skip descendants. For a scalar pipeline, required callback runs once when configured; type validateErrors once only for nonempty successful cast; custom once only after type success. Empty optional, required failure and failed cast run no type/custom callback. Repeated explicit validate calls deliberately repeat the applicable callbacks; automatic-pass deduplication never cancels explicit calls.

| Operation after assembly | Own collection check | New/retained descendants |
| --- | --- | --- |
| Constructor / deferred hydration / reset | 0 | 0; reset clears all sources and leaves unchecked |
| add/insert with validation enabled | 1 | New item/subtree 1 eligible pipeline per node; retained items 0 |
| add/insert with validation disabled | 0 | 0, including defaults |
| remove/move/clear | 1 | Retained descendants 0; no-op indexes 0 everywhere |
| Bulk replacement/hydration with validation enabled | 1 per visited container | 1 eligible pipeline per visited descendant, after all assignments |
| Explicit full validate, including nested batch | 1 per visited container | 1 eligible pipeline per visited descendant regardless of container failure |

Structural automatic requests are local: nested ancestors may recheck their own collection rules once, without recursively checking unaffected siblings. In a batch, union selected subtrees/own-only requests and eliminate overlap once at the outer boundary; do not promote a local add/remove into an unconditional root pass. Invalidate a collection's own client-check marker when its structure/value changes; unchanged retained child markers survive move/remove. HF-013 keeps its limited scalar target selection and clean-value net-change policy. Update historical expectation fixtures in V3-03.5: twice → once for new item replacement, constructor default calls during deferred hydration → zero, and child checks behind size failures → one eligible pass. The current characterization tests remain untouched in V3-02.

## 6. Snapshots and readonly errors

ODR-04 replacement: required `NodeSnapshot.errors: readonly ValidationError[]` containing own errors only. Descendants remain in child snapshots; no aggregate-path list cached on every ancestor. Remove old string errors/allErrors/globalErrors and redundant optional validationErrors. Preserve value snapshots, dirty/touched, child snapshots and HF-011 item identities. Engine collection snapshots require readonly itemIds: readonly string[], aligned one-to-one with children. Migrate third-party producers/fixtures to stable IDs; never regenerate IDs on reads or use indexes/value equality as identity.

Errors, params, paths and lists are detached and recursively immutable within the chosen ODR-02 domain. Code/source/params changes notify even if message is unchanged. Equal final state reuses committed snapshot references and emits nothing. A getErrors aggregate may allocate and need not retain reference identity. Do not freeze caller-owned input in place. Do not store response objects, values or parent references in errors. Revisions/tokens are operation metadata and need not be serialized or included in snapshots.

```ts
// Value-snapshot domain is retained; it is distinct from error params.
export type SnapshotValue = null | undefined | string | number | boolean | bigint
  | readonly SnapshotValue[] | {readonly [key: string]: SnapshotValue}
export interface NodeSnapshot {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  readonly isTouched: boolean
  readonly isDirty: boolean
}
export interface FieldSnapshot extends NodeSnapshot {
  readonly rawValue: SnapshotValue
  readonly valueClear: SnapshotValue
}
export interface FormSnapshot extends NodeSnapshot {
  readonly fieldsValue: Readonly<Record<string, SnapshotValue>>
  readonly fields: Readonly<Record<string, FieldSnapshot | ArrayFieldSnapshot | ArrayFormSnapshot>>
}
export interface ArrayFieldSnapshot extends NodeSnapshot {
  readonly itemIds: readonly string[]
  readonly itemsValue: readonly SnapshotValue[]
  readonly items: readonly FieldSnapshot[]
}
export interface ArrayFormSnapshot extends NodeSnapshot {
  readonly itemIds: readonly string[]
  readonly formsFieldsValue: readonly Readonly<Record<string, SnapshotValue>>[]
  readonly forms: readonly FormSnapshot[]
}
```

### ODR-02: exact parameter domain and normalization

TypeScript number cannot express finiteness or encode prototype/descriptor/cycle constraints; runtime validation is mandatory. ErrorParams is a plain object of named JsonValue values, not an arbitrary root primitive. Allowed object prototypes are exactly Object.prototype or null; arrays must have Array.prototype, dense own data indexes and no extra properties. Reject custom prototypes/classes, accessors without invoking getters, symbol keys, non-enumerable object properties, sparse arrays, undefined at any present position, NaN/±Infinity, BigInt, Symbol, functions, Date/Map/Set and cycles. Repeated acyclic references are allowed but copied independently and charged on every occurrence. No implicit stringify, toJSON, descriptor conversion or unsupported-value coercion. Own string keys __proto__, constructor, prototype and toJSON are allowed as **data** and preserved safely in null-prototype output records; a function-valued toJSON is rejected without calling it. Proxy traps cannot be sandboxed; proxies are unsupported inputs.

Normalize deeply at every error-ingress compute boundary before replacing any error store. Check descriptors/prototypes and limits, copy only allowed data, recursively freeze the new records/arrays, and share no mutable input references. Do not mutate or freeze caller objects. Omitted params is valid; present params: undefined is invalid even in JS. Empty params:{} remains present. Normalize -0 to 0; otherwise preserve finite numbers. Contract failures throw ErrorContractError with a stable reason and offending path (for example nonfinite_number at ['params', 'limit']), never a ValidationError code or a silently dropped parameter. Reasons distinguish invalid_params_type, nonfinite_number, cyclic_params, unsafe_descriptor and limit_exceeded; developer diagnostics are separate from validation display.

Hard per-params-root limits: depth 32 (root=0), 10000 visited value nodes including containers/root, 1048576 logical bytes, and 65536 UTF-16 units per string/key. Logical byte accounting is deterministic: UTF-8 bytes of each string value/property key, 8 per number, 1 per boolean/null, 2 per object/array; no stringify is performed. Include every repeated occurrence. Reject before exceeding any limit; cycles, descriptors and over-budget data are diagnosed without partial installation. Parser additionally enforces its whole-input/output budget in section 9. All sources use the same params limits; schema configuration cannot increase them.

Migration: explicitly convert dates to epoch numbers/ISO strings, Map to entry arrays, Set to arrays and class instances to chosen plain DTOs in application code. Remove undefined keys explicitly; choose a documented domain representation for nonfinite numbers and cycles rather than automatic omission. Old snapshot descriptors are ordinary data only if the application deliberately constructs a JSON DTO; the engine no longer manufactures them.

```ts
const boundary = new Date('2026-01-01T00:00:00Z')
const attributes = new Map<string, string>([['region', 'EU']])
const migrated: ValidationErrorInput = {
  code: 'app.policy',
  params: {boundaryMs: boundary.getTime(), attributes: [...attributes]},
}
void migrated
```

## 7. ErrorsSchema: one parser, two configuration modes

The same normalization and mapping owners serve declarative records/tree configuration and a custom adapter. No backend presets, path guessing, implicit JSON.stringify messages or code-shaped-object heuristics. A code-shaped nested field is a field unless the configured decoder says otherwise.

Final public configuration declarations:

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

export type ErrorTransform = (
  error: ValidationErrorInput, path: ValidationPath,
) => ValidationErrorInput

export interface ErrorsMappingConfig {
  readonly mappings?: readonly (StaticErrorMapping | DynamicErrorMapping)[]
  readonly fallback?: (error: ServerErrorInput) => ValidationPath | null
  readonly transform?: readonly ErrorTransform[]
}

export interface MappingMergeOptions {
  readonly staticConflict?: 'error' | 'left' | 'right'
  readonly fallbackConflict?: 'error' | 'left' | 'right'
}

export interface MappingPrefixOptions {
  readonly sourcePrefix: ValidationPath
  readonly targetPrefix?: ValidationPath
}

export interface ArrayMappingOptions extends MappingPrefixOptions {
  readonly index?: (segment: string | number) => number
}

export declare class ErrorsMapping {
  constructor(config: ErrorsMappingConfig)
  static fromObject(mapping: Readonly<Record<string, ValidationPath>>): ErrorsMapping
  static forArray(item: ErrorsMapping, options: ArrayMappingOptions): ErrorsMapping
  nest(options: MappingPrefixOptions): ErrorsMapping
  clone(): ErrorsMapping
  merge(other: ErrorsMapping, options?: MappingMergeOptions): ErrorsMapping
}

export interface ErrorsSchemaLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxErrors: number
  readonly maxPathSegments: number
  readonly maxStringLength: number
  readonly maxBytes: number
}

export interface SchemaCommon {
  readonly mapping?: ErrorsMapping
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
  readonly matchedBy: 'static' | 'dynamic' | 'fallback' | 'identity' | 'scope'
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

ServerErrorEntry separates routing path from the single canonical pathless error. Apply installs that error in local storage without normalization; flat LocatedValidationError is a read projection only. Do not retain a second copy of the error fields in the batch. The brand denotes engine-owned normalized data, not a user constructor. The implementation must validate batch ownership at runtime rather than trust an exported structural cast or shallow freeze. Apply reuses canonical entries; it does not clone params for every appended error. ODR-02 normalization and budgets apply to all parameter inputs.

Selectors use own data-property paths only; absent select means the response itself. Records requires a selected array, with one configured path/code per record; path must be a tuple unless decodePath explicitly defines a string codec. Missing configured path/code or a malformed present message/params throws; absent optional message/params are omitted. No select/code fallback is inferred. A deliberately empty selected array means no errors; a missing envelope does not.

Tree leaf runs before descent: an array consumes that leaf (including `[]`); undefined descends into own object properties/array indexes. An unrecognized primitive is a parse error. Default object keys are literal; array indexes are numbers. decodeKey explicitly enables dotted/custom keys. Empty object/array containers are valid empty trees. Null and message arrays require explicit leaf behavior. No automatic recognition of `{code:...}`. Adapter accepts only synchronous Iterable output; Promise/AsyncIterable is rejected. All modes share one pipeline: extraction → deep validation/detachment of each input DTO → mapping-program transforms (once each) → mapping → final batch branding. Callbacks receive detached readonly DTO views. Normalize each newly produced DTO before the next callback; reuse engine-owned immutable params when unchanged, never re-normalize an accumulated error list. Validate mapping paths separately. Apply repeats none of this. Declarative traversal checks data descriptors before reads; trusted leaf/adapter code performs explicit whole-leaf conversions before returning an error DTO.

Static mapping wins, then the first matching dynamic rule by descending priority and registration order; null drops that entry without trying later rules. Fallback runs once only when no rule matches; absent fallback means identity. Colliding targets accumulate, including repeated codes. Duplicate static rules are a configuration error; only an explicit merge conflict policy may choose one. Dynamic key codec is explicit; exec-style capture and flags semantics are fixed below without caller-visible lastIndex mutation. Callbacks execute once at their designated stage. Optional trace replaces detailed-parser functionality without storing tracing metadata in local errors.

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
  mapping: new ErrorsMapping({mappings: [
    {kind: 'static', from: ['a'], to: ['email']},
    {kind: 'static', from: ['b'], to: ['email']},
  ]}),
})
const both = mapped.parse({a: 'first', b: 'second'})
void both
```

Full replacements for static/dynamic/fallback, whole-leaf transforms and composition are defined below. [Schema tests](../../tests/unit/ErrorsShema.test.ts) and [Form integrations](../../tests/unit/FormErrorsShema.test.ts) supply migration scenarios, not evidence that the new API exists.

### ODR-04: immutable mapping composition

ErrorsMapping is a configuration program, **not a parser**: it has no parse method or public alternate ingestion path. Pass it explicitly as ErrorsSchemaConfig.mapping. Extraction configuration/limits stay on the one ErrorsSchema and are never implicitly merged. No global DefaultErrorsSchema, implicit backend format or old-method aliases remain. Constructor requires an explicit config, even when mapping is identity.

Each mapping program contains ordered transforms, static/dynamic rules and explicit fallback scopes. No mapping means identity. A base program covers all paths; nest/forArray restrict coverage. Outside the union of a program's scopes, drop the entry (trace matchedBy:scope, to:null). Inside coverage with no matching rule/fallback, identity means the **local** path plus its target prefix. A matched null drops without further rules. Source prefix matching uses typed tuple equality, never dotted text or prototype traversal.

- nest({sourcePrefix,targetPrefix:[]}) strips sourcePrefix from each extracted path before local transforms, dynamic key codecs, rules and fallback. Response decodePath/decodeKey already ran during extraction. Prefix targetPrefix exactly once to every non-null local result, including identity. It does not select a response envelope; configure select separately. Nested wrappers concatenate outer source/target prefixes before inner ones. Prefix mismatch does not execute local callbacks.
- forArray(item,{sourcePrefix,targetPrefix:sourcePrefix,index}) matches sourcePrefix + one index segment + the item's source path. Default index accepts only a numeric safe nonnegative integer; explicit index decodes a single string/number segment and must return such an integer or throw. Dotted/bracket/custom flat key formats are decoded by decodePath/decodeKey before this stage, never guessed. Strip source prefix and index before item callbacks; prefix each mapped target with targetPrefix + decoded index. This preserves item globals, nested wrappers, regex rules and fallback. Invalid index is a contract failure, not a silent drop.
- fromObject maps each own enumerable string key as one literal source segment to its explicit tuple target. Empty target [] means global. Reject accessors/symbol keys/invalid targets; use safe own-property reads. Dotted keys remain literal; use explicit rules/codecs for multi-segment sources.
- clone returns a distinct immutable program with identical behavior. Constructor/clone/helpers copy arrays, tuples, records and regex source/flags; callbacks are shared by reference, with application-owned closures. No caller RegExp.lastIndex is read or changed; each rule uses a fresh regex at index 0 with all flags preserved and exec-style captures (including with g). No shared mutable configuration or attempt to clone closures.
- merge composes configuration, with left registrations before right. Applicable transforms run left then right once each, in local scope, before rule selection; even repeated function references represent distinct registrations. ErrorTransform changes code/params/message only; it cannot change routing path. Each scope sees its own stripped path; transformed metadata is passed to subsequent transforms and mapping callbacks. Static source patterns that intersect after scope expansion (including numeric-index wildcards versus literal indexes) conflict: default error, explicit left/right selects that rule on the overlap and retains the other rule outside it. Within a constructor, duplicate static sources always fail. Other static rules win over dynamic; dynamic rules retain all registrations, sort by descending priority (default 0, finite number), then left/right registration order. The selected rule uses its own target prefix. Identical targets accumulate errors; they are not config conflicts.
- Two explicit fallback scopes that intersect are a configuration conflict; default error, explicit left/right retains the chosen side's fallback over the overlap and the other outside it. Transforms/rules are unaffected by that choice. Disjoint fallbacks remain. With no explicit fallback in a covered scope, use its identity result; overlapping identity scopes with different target prefixes are also a fallback conflict with the same policy. Equivalent identities coalesce. A single explicit fallback takes precedence over implicit identity in its scope. Wrapper scopes consist only of literal segments and captured index wildcards (string or number; validated by the index decoder at parse time). Scope intersections are conservative syntactic intersections, decidable without executing custom index/regex callbacks. If potentially overlapping identity routes use different custom index decoder references, treat them as a fallback conflict even if they might compute equal indexes. Regex matches may overlap freely under priority/order. Conflicts are diagnosed at construction/composition, not by running extraction.

Full external-data transformations belong before error extraction: tree leaf transforms the **whole** value/array before returning its decoded error list, or adapter extract performs application-specific envelope/leaf transformations. A leaf returning undefined requests descent; an array result consumes the leaf. Do not move a historical transformValue(array) to ErrorTransform on individual decoded errors. Static/dynamic mapping callbacks may use transformed metadata; retain any needed external data by explicit JSON params, not hidden response references. No auto-stringification or inferred server code is supplied. To preserve historical skip-unmapped behavior, configure an explicit fallback returning null (for a fromObject program, merge with new ErrorsMapping({fallback: () => null})).

```ts
const itemMapping = ErrorsMapping.fromObject({email_error: ['email']})
const arrayMapping = ErrorsMapping.forArray(itemMapping, {
  sourcePrefix: ['accounts'], targetPrefix: ['accounts'],
})
const composed = arrayMapping.clone().merge(
  ErrorsMapping.fromObject({summary: []}),
)
const arraySchema = new ErrorsSchema<unknown>({
  kind: 'records', path: {at: ['path']}, code: {at: ['code']}, mapping: composed,
})
const traced = arraySchema.parse([
  {path: ['accounts', 0, 'email_error'], code: 'app.taken'},
], {trace: true})
void traced
```

```ts
const wholeLeafSchema = new ErrorsSchema<unknown>({
  kind: 'tree',
  leaf: value => {
    if (value === null) return []
    if (Array.isArray(value) && value.every(part => typeof part === 'string')) {
      // Explicit whole-leaf transforms: join, then uppercase, then decode.
      const message = value.join('; ').toUpperCase()
      return [{code: 'app.server', message}]
    }
    if (typeof value === 'string') return [{code: 'app.server', message: value}]
    return undefined
  },
})
void wholeLeafSchema
```

Trace has one row per extracted error, including dropped entries, with original full from, final full to or null, stable index and selected rule kind. No dictionary collapse: multiple source keys mapping to one field retain separate diagnostics and ordered entries. clone/merge/nest/forArray never normalize errors or call extract/leaf/transforms; only the single parse execution does so.

## 8. Apply, revisions and operation tokens

Final ODR-05 A signatures:

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

export interface NotificationFailure {
  readonly phase: 'subscriber' | 'diagnostic' | 'finalization'
  readonly path: ValidationPath
  readonly subscriber?: number
  readonly error: unknown
}

export interface ErrorNotificationReport {
  readonly status: 'pending' | 'delivered'
  readonly failures: readonly NotificationFailure[]
}

export interface ApplyServerErrorsResult {
  readonly committed: true
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
  readonly notification: ErrorNotificationReport
}

export interface FormServerErrorApi {
  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation
  applyServerErrors(
    batch: ParsedServerErrors,
    options: ApplyServerErrorsOptions,
  ): ApplyServerErrorsResult
  subscribeErrorNotifications(listener: (report: ErrorNotificationReport) => void): () => void
  getErrorNotificationReports(): readonly ErrorNotificationReport[]
  clearErrorNotificationReports(): void
}
```

Defaults: scope `[]` means the whole receiver Form subtree, mode replace, unknownPath error. Scope resolves to one registered node/subtree when beginning the operation. Parsed target paths are relative to the receiver Form, not relative to scope. No second scope option can contradict the token. To apply to a particular Field, capture that Field's subtree scope; there is no source-taking legacy setter. A global `[]` is a genuine Form target, not a missing field.

Operation lifecycle contract:

1. Begin after subclass initialization and **before dispatching the application request**. Capture receiver/scope node identity, monotonic subtree input revision, structural revision and reset generation. It does not validate, touch, dirty or publish a snapshot.
2. A newer operation supersedes all older outstanding operations on overlapping scopes (ancestor/descendant). Disjoint scopes remain independent. This supplies latest-operation-wins even when values are equal; value revision alone is insufficient.
3. Every actual supported input change increments affected subtree revisions, even with validate false or A→B→A. Structural revision tracks identities and order, not only payload equality; move/remove/insert/replacement invalidate affected captures. Reset always invalidates affected tokens. Metadata-only validation/errors and commitBaseline do not.
4. Apply rejects wrong-receiver, superseded, used, detached or revision-mismatched tokens before any write/consumption. Even append requires a token. A successful apply consumes it once, including an empty batch; failed parse/preflight does not consume an otherwise valid token. No force/stale bypass is specified.
5. First validate batch ownership and operation, resolve **all** targets, verify scope and unknown policies, calculate final source partitions and stage immutable results. Recheck revisions immediately before a non-callback commit. Then install affected nodes once each; do not re-run schema callbacks, cast, validators or normalization. In an outer batch, commit live stores immediately but stage publication until outer flush; the snapshot exception is detailed below.
6. Replace removes only server errors in the scope, including omitted nodes and globals. Empty replace clears that server scope. Append adds in order. Preserve type/custom/manual and client-check knowledge.
7. Unknown error is the default; global explicitly converts to an own global of the closest resolved Form **inside scope**, with the original path retained in the apply report. If no Form exists inside a scalar scope, global conversion is impossible and fails. Ignore explicitly drops and reports. An out-of-scope target is always an error, not an unknown-path escape. Globals are not later rebound to new fields.
8. Parse/Preflight failures make no target or token writes. Commit and Notification have distinct failure semantics below; the existing scheduler does not yet implement this contract.

Example, application-owned HTTP omitted:

```ts
const operation = form.beginServerErrorOperation()
// Dispatch and await the application's request outside a synchronous batch.
const batch = schema.parse(response)
form.applyServerErrors(batch, {operation})
```

The library performs no HTTP, cancellation or submit orchestration. Applications associate responses with tokens, configure API paths/cross-field semantics and decide request concurrency. The overlapping-scope token rule, unlike V3-01's revision-only suggestion, covers older responses with unchanged values. Conservative rejection on any scope change avoids rebasing old positional errors onto different items. Unsupported in-place mutation/opaque state cannot receive a false revision guarantee; applications must use supported setters. Tokens are process-local, not persistence or transport IDs.

### ODR-05 A: Parse → Preflight → Commit → Notification

Parse is pure and returns the detached branded batch. Preflight validates ownership/token/paths/scope/limits and stages every affected source partition, aggregate validity and candidate snapshot, including affected ancestors. Any fallible capture/override, allocation or comparison belongs here under the purity guard, **before** state writes or token consumption. A late bad target or custom capture exception leaves errors, validity, values, touched, baseline, snapshot references and token unchanged; emit nothing.

Commit is a synchronous callback-free installation of all staged stores/check markers plus token consumption, and snapshot references when outside an enclosing batch. Inside batch keep the previous published snapshot generation until outer flush and retain the staged complete candidate. No validators, getters overridden by applications, captures, parsing or normalization execute between the first and last installation. Observers cannot see a partial commit. Expected failures must be eliminated in Preflight; process termination/out-of-memory is not a recoverable rollback promise. After this point committed:true is final; subscriber exceptions never cause an Apply rejection or undo published state. applied counts normalized entries installed (including global conversion), ignored counts explicitly ignored unknown paths; unresolved lists original unknown paths in input order, including global conversions/ignores. Configuration mapping drops appear only in parse trace. Empty replace can commit with applied:0 and still clear scope. Equal final errors consume the token but emit no state notification.

Notification publishes only after all affected committed snapshots are coherent. Within a wave deliver changed nodes in child-before-parent postorder, field/current item order, then listeners in registration order. Copy registrations at each node's delivery start; removed listeners are skipped, new ones wait for the next wave. Catch each listener separately and continue all remaining nodes/listeners. Reentrant supported writes queue a later wave after current delivery; reads during delivery see that wave's committed snapshots. Live getters may see later supported writes; snapshot references already delivered are never mutated. This is an Apply/error-store transaction requirement for V3-04.6, not a global ObservableNode redesign in V3-02.

Result.notification is an engine-owned readonly **live report handle**, not a canonical error or NodeSnapshot. It is pending until its enclosing delivery cycle completes, then delivered with a frozen, stable failures array; status/failures getters are the only evolving view. Outside batch it is delivered before Apply returns. Inside nested batches it remains pending until the outermost batch flush; inner exit neither publishes nor sends diagnostics. Multiple Apply calls in one outer batch share the cycle report (including coalesced affected-node notifications); their committed:true results do not promise a separate notification per call. Later writes may supersede earlier errors before the final snapshot; no intermediate notification is owed.

The receiver retains failed reports in getErrorNotificationReports() until explicit clearErrorNotificationReports(); no failures are silently discarded when the return value is ignored. subscribeErrorNotifications registers a diagnostic listener, with independent registrations and idempotent unsubscribe, invoked after ordinary delivery for that cycle on each receiver participating in Apply. During diagnostic delivery the report is still pending: ordinary failures are already available; diagnostic-listener exceptions are appended with phase diagnostic, remaining diagnostic listeners continue, and no recursive diagnostic dispatch occurs. Finalize delivered after diagnostics. Failure.path is relative to the top owning Form, subscriber is the zero-based registration position in that node/channel's delivery list, omitted for finalization failures; error preserves the thrown value only in diagnostics. Failure paths/lists are detached readonly; thrown error values remain opaque diagnostic references and are not frozen or converted to JSON. Reports are process-local, excluded from snapshots/value serialization and validation codes. Clear removes retained completed reports, never an outstanding pending handle.

Batch callback/dependency failures retain their existing exception precedence for unrelated mutations. A failure during outer finalization after a successful Apply cannot retroactively reject its commit: record it with phase finalization in the shared report, settle diagnostics/handle even on exceptional exit, and propagate the independent batch failure under the existing batch contract. All Apply-owned snapshot capture is staged before its commit; later arbitrary batch writes/captures do not receive a rollback guarantee. The future integration must preserve coherent committed snapshot generations, even when a later candidate capture fails (retain the last complete generation). No observer sees a partially published snapshot generation.

| Fault injection | Required outcome |
| --- | --- |
| Parse/adapter/transform/JSON-domain failure | No batch/model writes; token not consumed |
| Late target/scope/stale token or pre-commit capture failure | No Apply writes/notifications; snapshot references unchanged |
| Commit boundary with multiple stores | All installed once before observation; no application callback in installation |
| First/middle/last subscriber throws | committed:true; all later subscribers run; delivered report records every failure |
| Diagnostic subscriber throws | Other diagnostic subscribers run; failure retained, no recursion/rollback |
| Inner/outer batch, multiple Apply, later writes | Immediate live commit, deferred coherent snapshots, one ordered/coalesced cycle report |
| Outer callback/finalizer throws after Apply | Apply remains committed; settle report; independent batch exception propagates |
| Reentrant observer write / equal state / empty replace | Separate later wave / zero state notifications for equality / correct cleared scope |

## 9. Security and performance invariants

Resolve through actual registered child nodes and own properties, never arbitrary `object[segment]` traversal. `__proto__`, constructor, prototype and toString are literal data names, not prototype access. Use Map/null-prototype dictionaries or safe own-property creation; no recursive Object.assign into ordinary objects. Numeric segments are finite safe nonnegative integers and must address an existing array item; no auto-creation. Do not coerce numeric-looking object keys without a chosen codec.

Parser defaults and hard ceilings: depth 64 (root=0), nodes 100000 (each visited value), errors 10000 (including subsequently dropped entries), path segments 64, string length 65536 UTF-16 units, maxBytes 8388608. limits may only lower positive safe-integer ceilings. maxBytes uses section 6 accounting for the entire traversal, including keys, code/message/paths/params and adapter output; shared input is counted at each occurrence. Reject cycles/accessors/non-data objects. No toJSON or implicit message conversion. Diagnostics are deterministic; no partial batch. An adapter is trusted code: core bounds its traversal/output, not callback CPU/IO.

Preserve PERF-01 child reconciliation/refresh epochs/frozen subtree reuse and the new deterministic ODR-03 callback counts. Group server errors before writing; avoid the current repeated setErrors([...previous, next]) normalization. Build one target index per Apply. Share empty arrays; avoid four eager arrays or full aggregate paths on every node. Revision propagation should follow changed ancestors; operation scope capture/preflight may scan that scope and must be measured. Do not promise O(1) snapshots or writes: external-edit discovery and HF-013 topology scans remain.

Evidence: [PERF-01](../roadmap/v2.3.0/PERFORMANCE.md), [HF-015 measurements](../roadmap/v2.3.0/ERRORS_REVIEW.md), [performance regression tests](../../tests/unit/headless-performance.test.ts). Historical fixed HF-015 full harness showed +20.6% creation, +7.4% unchanged snapshot, +23.9% scalar add/remove, +14.6% nested add/remove and about 0.3 MiB extra post-GC heap; paired readings varied. These are historical observations, not fresh measurements or universal thresholds.

## 10. Approved owner decisions — 2026-10-28

All five ODRs are closed as owner decisions. The detailed contracts above are the final design for V3-02 acceptance, not a claim of implemented runtime behavior.

| ID | Decision | Outcome and migration |
| --- | --- | --- |
| ODR-01 | APPROVED — stable typeId | Required readonly typeId; machine invalid_type.expected; remove getTypeName without alias; custom types choose an explicit ID |
| ODR-02 | APPROVED — JSON-compatible params only | Exact recursive domain, detached deep freeze, descriptor/cycle/prototype checks and budgets; applications explicitly migrate rich params |
| ODR-03 | APPROVED — B | Zero intermediate constructor checks; explicit assembly boundary; full explicit traversal despite container errors; local structural checks |
| ODR-04 | APPROVED — new API without bridges | Final REMOVE/REPLACE/KEEP ledger; one parser, explicit config, immutable ErrorsMapping composition, trace, own/aggregate readers, required itemIds |
| ODR-05 | APPROVED — A | Parse/Preflight/Commit/Notification; atomic installation, separate retained diagnostic report; post-commit subscriber failure is no rollback |

[Migration ledger and V3-03–06 dependencies](../roadmap/v3.0.0/PLAN.md) align with these decisions. No open OWNER_DECISION_REQUIRED remains for ODR-01–05. READY_FOR_OWNER_REVIEW is neither DONE nor ACCEPTED and does not authorize implementation.
