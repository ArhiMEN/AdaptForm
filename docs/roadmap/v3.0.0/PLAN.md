# AdaptForm 3.0 — V3-02 migration, implementation and regression plan

[English](PLAN.md) · [Русский](PLAN.ru.md)

Status: **BLOCKED for implementation pending OWNER_DECISION_REQUIRED**. [Specification and decisions](../../ai/V3_ARCHITECTURE.md), [I18N-01 code catalogue](../../ai/V3_ERROR_CODES.md). This is a documentation result, not authorization to start tasks, change version, commit, push, merge or publish. Published 2.2.0 is unchanged.

## 1. Sequence and authority

PR #29 is an open, unmerged draft at aab14d29b428c57cabb9ec5ceb069fcc5adaba6e. Its proposed V3-03…07 IDs denote milestones; use subtasks below rather than assigning incompatible meanings to those IDs. PR #29 changes have not been fetched into refs, checked out or merged. Local baseline is work/670c6a04014fbf938574bfd8eb2a706e44a9d4d0, equal to remote master. Its architecture-document paths are reused; future integration must reconcile both versions and the separate AGENTS/DECISIONS additions.

The current owner-approved requirements supersede incompatible V3-01 proposals: manual clears on actual own-value change; node validate returns `{valid}`; no translation, formatter/resolver or fallback; default unknown path is an error; default replace covers the whole Form; explicit operation tokens cover parallel responses as well as revisions. V3-01's JSON-only params, metadata renaming, hydration suppression and always-traverse-container-children were not automatically approved.

Preserve STAB-01 FormFieldsValue inference, STAB-02 deterministic subscription boundaries, HF-011 stable identities/detachment, PERF-01 traversal/cache improvements, HF-013 limited selective graph and HF-015 multiplicity/metadata/reactivity. Do not add async validation, a submit controller, backend presets, a new FormField or a localization module.

## 2. Evidence index for migration decisions

| ID | Current contract and consumers |
| --- | --- |
| E1 | [FieldType](../../../src/core/types/FieldType.ts#L16), built-in type validate/validateErrors branches; [custom type tests](../../../tests/unit/structured-errors.test.ts#L69) |
| E2 | [ErrorState](../../../src/core/ValidationError.ts#L64), [mutable/protected errors tests](../../../tests/unit/structured-errors.test.ts#L81) |
| E3 | [Field setters/validation](../../../src/core/fields/Field.ts#L123), [legacy result tests](../../../tests/unit/structured-errors.test.ts#L49) |
| E4 | [Form server setters/routing](../../../src/core/Form.ts#L96), [schema integrations](../../../tests/unit/FormErrorsShema.test.ts) |
| E5 | [ErrorsSchema parsers/helpers](../../../src/core/ErrorsShema.ts), [composition tests](../../../tests/unit/ErrorsShema.test.ts) |
| E6 | [Snapshot interfaces](../../../src/core/state/snapshot.ts#L7), [metadata/snapshot tests](../../../tests/unit/structured-errors.test.ts#L305) |
| E7 | [Collection lifecycle characterization](../../../tests/unit/form-lifecycle-baseline.test.ts#L91), [HF-011 contract](../../ai/HEADLESS_COLLECTION_IDENTITY.md) |
| E8 | [Dependency guard](../../../src/core/state/dependencyScheduling.ts#L57), [purity/recovery tests](../../../tests/unit/headless-dependencies.test.ts#L408) |
| E9 | [ObservableNode notifications/finalization](../../../src/core/state/ObservableNode.ts#L16), [subscription lifecycle](../../../tests/unit/headless-subscription-lifecycle.test.ts) |
| E10 | [Package exports](../../../package.json#L18), [public source exports](../../../src/core/index.ts), [optional Luxon](../../../src/luxon.ts) |

## 3. Legacy and useful-function replacement ledger — ODR-04

These are disclosed **proposals** for owner selection, not silent removals. Requirements such as strict validator arrays and I18N-01 are already approved; exact export/helper deletions and disputed useful behavior still need the listed decisions. No compatibility layer is introduced during documentation work.

| Mechanism / evidence | Purpose | Proposed 3.0 decision | Full replacement and consequence |
| --- | --- | --- | --- |
| FieldType.validate string API, E1 | Old type implementations/direct consumers | REMOVE | validateErrors arrays; application assigns meaningful codes |
| Base bridge and built-in override detection, E1 | Preserve old validate overrides | REMOVE | Override validateErrors; no implicit dispatch to the old method |
| Mutable strings/protected _errors plus metadata, E2 | Legacy edits and subclasses | REPLACE | One readonly own-error store; explicit manual set/clear and supported subclass extension points |
| Message-text reconciliation, E2 | Recover metadata after array edits | REMOVE | No mutable string error array; no ambiguous text identity |
| Boolean/string/permissive custom results, E3 | Historical validators/JS success rules | REPLACE | Arrays only; malformed results/Promise are contract errors |
| messages* exports/options and built-in date message formatting, E3/E10 | Configure built-in presentation | REMOVE under I18N-01 | App-owned dictionaries/display. Review DateLuxon outputFormat separately from inputFormat; do not remove parsing/input functionality |
| error setter / first-string getter, E3 | Manual writes and convenience rendering | REPLACE | setErrors([{code,...}]), clearErrors; inspect readonly first structured error |
| checkValid/checkAndSetValid, E3/E7 | Different validity-write semantics | REPLACE | validate().valid; ordinary checks preserve server/manual |
| Writable isValid, E3 | External override of validity | REVIEW | Readonly derived validity proposed; manual errors replace invalidation use, but forced-success consumers require explicit owner decision |
| allErrors/globalErrors string projections, E4 | Grouping and UI labels, last-message globals | REPLACE | Flat located read plus own structured globals; application groups/renders |
| form.errors=response and current Form.setErrors(response), E4 | Two server ingestion contracts | REPLACE | One parse → applyServerErrors with token/scope/mode; no old setter alias |
| source-taking local setErrors and provenance stack, E2/E4 | Route server via virtual legacy setters | REPLACE | Manual-only setter; engine source boundaries; no ambient provenance bridge |
| client/external sources, E2 | Old provenance vocabulary | REPLACE | type/manual; persisted DTO/filter migration |
| parseErrors/parseErrorsDetailed/override bridge, E5 | String/detailed projections and custom parsing | REPLACE | One parse; optional trace; explicit adapter. Preserve detailed mapping inspection, not lossy records |
| static/dynamic/fallback and transformers, E5 | API-specific extraction/mapping | REDESIGN | Exact/dynamic rules and explicit decoders/transforms. Whole-leaf transformation stays expressible before extraction; do not silently move an old array transformer to per-error stage |
| nest/forArray/fromObject/clone/merge, E5 | Schema composition/custom indexes | REDESIGN, STOPPED | Approve source/target-prefix semantics, codec/regex flags, transformer order and extractor conflict behavior before helper signatures are finalized |
| Shared mutable DefaultErrorsSchema, E4/E5 | Convenient default key mapping | REVIEW, STOPPED | Option A explicit immutable preset/factory with documented format; option B required config. No inferred backend/code fallback and no ineffective alias |
| ParsedError/DynamicRule, E5/E10 | Public parser configuration and tracing | REPLACE | Typed config and ErrorMappingTrace; compile consumers of old names fail clearly |
| getOwnErrors/getErrors readers, E2/E4 | Own versus descendant inspection | KEEP useful distinction | field.errors and scalar getErrors are local; Form/collection getErrors is located. Do not remove an existing structured reader merely due to age; exact retained names enter export review |
| Snapshot string errors and optional validationErrors, E6 | Additive 2.x producer compatibility | REPLACE | Required own structured errors; children carry their own errors. No duplicate stored aggregate error truth |
| Optional itemIds, E6/E7 | Older structural snapshot producers | REVIEW | Required on future engine snapshots; changing public optionality needs producer migration, preserve identity itself |
| Constructor duplicate checks/container early exits, E7 | Actual historical lifecycle | ODR-03 | Choose preserved timing or explicit final-pass redesign; not classified as obsolete just by age |
| getTypeName and arbitrary snapshot-converted params, E1/E2 | Introspection/cast metadata and rich data | ODR-01/02 | No localized fallback or unapproved narrowing; see evidence/options in specification |

## 4. Consumer migration map

| Old API/behavior | Target/proposal and reason | Affected apps / migration | Automation | Required checks |
| --- | --- | --- | --- | --- |
| Type validate returns strings | validateErrors returns ErrorInput[]; one contract | Custom type/subclass authors assign codes and preserve rule order | Partial rename only; codes manual | Structural implementations, overrides, direct built-ins |
| Custom true/false/string/one-object | [] or an array; strict result | JS/TS validators; map true→[], false→coded error, wrap object | Partial; boolean expression rewrites need review | Bad JS outputs, empty/duplicate arrays, Promise rejection |
| validate boolean caller/checkAndSetValid | validate().valid | Submission/control logic; unchanged server/manual can keep false | Rename plus result access; review semantics | Effective versus client success |
| Error string reads/push/splice/_errors | Readonly structured lists and manual source operations | UI/subclasses; rendering belongs to app | Simple reads partial; mutation manual | Detached params, no external mutation |
| messages / messages* / built-in texts | App display using stable code/params | Every localized UI; no message or code fallback supplied by core | Not safely automatic | Catalogue coverage and no generated message |
| getTypeName / localized expected | ODR-01 machine metadata replacement | Custom types/introspection/type-specific display | Blocked until chosen | Cast routes and locale independence |
| Arbitrary Date/Map/cyclic params | ODR-02 | Rich-error consumers convert or keep defined descriptors | Blocked; cannot silently drop data | Accepted/rejected domains and alias detachment |
| form.errors=response; Form.setErrors(response) | schema.parse + tokenized Apply | Both legacy and HF-015 server consumers | Response extraction/mapping is manual | Parse/apply rejection leaves state untouched |
| setErrors(errors,source) | Manual-only setErrors; server uses Apply | Programmatic errors; cannot spoof source | Partial by known callsite | Source preservation/clearing |
| allErrors/globalErrors/setGlobalError | Located errors / Form own setErrors | Nested/global rendering and keyed replacement; list replacement is explicit | Grouping manual | Nested globals, same-code repeats, scalar items |
| client/external strings | type/manual | Filters, snapshots, persisted errors | Literal rename possible | No old source emitted |
| Field local path:[] | Local error has no path; Form aggregates located errors | DTO and generic reader consumers | Partial by receiver type | Paths after move, literal dot keys |
| parseErrors/detail/subclasses | One parse with trace or adapter | Custom schema integrations | Manual; preserve full-leaf transformations | Existing static/dynamic/fallback/composition cases |
| Revalidation cleared all errors | Server/manual remain | Re-submit flows must explicitly clear intended sources, not force isValid | Manual behavior review | validate().valid false with active remote/manual |
| Any assignment cleared errors | Actual own raw/clean change clears both server/manual | Controlled inputs and equal writes | No blind codemod | Invalid raw changes sharing clean null, equal/format-only values |
| Indexed server result applied to current collection | Operation captures identity/structure/revision | Async HTTP callers, although validation remains sync | Manual begin-before-request wiring | Parallel responses, insert/remove/move/replacement/ABA |
| Snapshot strings/optional metadata | Required own structures; itemIds optionality ODR-04 | Framework adapters, persisted snapshots, test fixtures | Fixture transformation partial | Metadata notifications, frozen stable snapshots |
| Mutating validators outside graph | Forbidden everywhere | Impure validators/required callbacks | Manual; move side effects after validation | Direct/full/collection/nested/dependency/reentrant guards |
| Constructor/timing dependencies | ODR-03 | Factories, deferred hydration, callbacks observing parent context | Manual if timing changes approved | Exact invocation counts/context |
| rawValue typed T|null despite raw strings | No change selected by this spec | TS raw readers; a proposed unknown/raw generic would be another contract change | Owner review before inclusion | Preserve clean-value inference and Number raw strings |

ESM and CommonJS: keep adaptform and adaptform/luxon export paths and both runtime formats; error redesign does not justify format changes. Validate strict NodeNext .mts/.cts consumers with skipLibCheck:false against packed declarations. JS requires descriptive contract failures, not TypeScript-only safety. Keep optional Luxon out of the main runtime/types; preserve Luxon input/cast functionality. Snapshot formats are not JSON/FormData payloads: do not add codes, sources, revisions, itemIds or tokens to value serialization. Nested ownership remains ArrayFormField; reset membership/targets and baseline semantics are retained unless separately approved.

## 5. Small implementation tasks

All tasks require separate implementation authorization after decisions close. Model: **GPT-6.1-Sol**, effort per row. No Astra is needed. Each task should have its own reviewable commit when commits are authorized. Dependency columns are technical dependencies, not permission to skip approval. ODR-04 removal approval is a prerequisite for deleting public APIs.

| ID / title | Goal and components | Dependencies | Acceptance | Targeted tests/checks | Risk | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| V3-03.1 Error DTO | ValidationError types, code/params checks, source ownership | ODR-01/02 | One immutable DTO/domain, no strings/message fallback | DTO detach/alias/cycle cases and negative types | Unapproved params loss | High |
| V3-03.2 Source storage | Replace ErrorState facade; client-check marker | 03.1, ODR-04 | Independent sources; no duplicate canonical list/boolean | Lifecycle matrix, duplicate ordering, clear/unknown | False validity after clear | High |
| V3-03.3 I18N-01 and FieldType | Structural interface/base, built-ins and Luxon | 03.1, ODR-01 | Only validateErrors; 17-code catalogue; no generated messages | Type suites, structural types, overrides, code/param declarations | Altered rules/cast representation | High |
| V3-03.4 Scalar runner/purity | Field compute/commit and new validate result | 03.2/3 | Effective valid; guard independent of graph; strict arrays | A02 direct, required/type/custom, recursion, exceptions/Promise | Guard/scheduler recovery | High |
| V3-03.5 Collection lifecycle | ArrayField/ArrayFormField callbacks/construction | 03.4, ODR-03 | Approved traversal/timing; both sources clear by identity policy | Constructor counts, deferred hydration, min/max, add/remove/move | Timing and context changes | High |
| V3-03.6 HF-013 integration | Graph runner and all-source state | 03.4/5 | Chains/diamonds/selective counts and disposal retained | Dependency tests, batch declarations/config failures | Duplicate/missing targets | High |
| V3-03.7 Canonical snapshots | Own structured errors and cache integration | 03.2/5/6, ODR-04 | Frozen/stable snapshots; metadata changes visible; HF-011 intact | Nested/subscription/performance regression tests | Quadratic ancestor refresh | High |
| V3-03.8 Legacy core cleanup | Delete approved bridges/setters/message exports | 03.3…7, ODR-04 | No hidden dispatch/string facade; migration ledger satisfied | Public export diff, source/test types, ESM/CJS smoke | Forgotten subclass/JS consumer | Medium |
| V3-04.1 Parser normalization | One parse, typed configuration and adapter | 03.1, ODR-02 | Same normalization owner; strict failure; no Form side effects | Malformed/cyclic input, bounds, source spoofing, adapter exceptions | Mutable references/partial results | High |
| V3-04.2 Declarative extraction | Records selectors and tree leaf decoding | 04.1 | Explicit envelopes/path/code; arrays/nested/global/missing data | Existing tuple and nested fixtures; literal dots/numeric names | Reintroduced heuristics | High |
| V3-04.3 Mapping/composition | Static/dynamic/fallback/trace and approved helpers | 04.2, ODR-04 | Stable priority; full-leaf transforms expressible; no second parser | Existing schema suite scenarios, codecs, regex flags, merge conflicts | Useful feature silently lost | High |
| V3-04.4 Safe target preflight | Registered-node resolver and scope rules | 04.1/3, 03.7 | Resolve all targets safely before writes; default unknown error | A03 all levels; prototype names; out-of-range/unsafe indexes; globals | Prototype access or wrong target | High |
| V3-04.5 Revisions/operations | Begin token, overlap/scope/latest and reset generation | 03.5/6, 04.4 | Equal-value newer request wins; structure/ABA rejected; disjoint independent | Two operation orders, reset/move/replacement, used/wrong-root tokens | Stale response wins/retained tokens | High |
| V3-04.6 Atomic grouped Apply | Stage and swap source changes, reuse normalized entries | 04.4/5, ODR-05 | Default whole-form replace; append explicit; no writes on rejected operation | Parse/preflight/commit/notification fault matrix; empty replace; batch | Claimed atomicity exceeds guarantee | High |
| V3-04.7 Server legacy cleanup | Remove approved old importers/parsers/types | 04.6, ODR-04 | One public server ingestion pipeline and migration recipes | Export inventory, old integrations migrated without implicit bridge | Lossy/duplicate parser survives | Medium |
| V3-05.1 Consumer migration | EN/RU docs/examples/demo and diagnostic clarity | 03.8,04.7 | Each ledger row has a working replacement | Example type checks, JS failures, affected demo checks | Instructions hide semantic breaks | Medium |
| V3-05.2 Package/type regressions | STAB-01 and ESM/CJS/Luxon consumers | 05.1 | Inference preserved, no TS2589, optional Luxon isolated | Strict .mts/.cts packed consumers and positive/negative types | Packaging/type-only break | High |
| V3-06.1 Performance review | Compare baseline/core/import/tokens | 03.7,04.6 | Paired data plus deterministic counts; no accumulated re-normalization | Existing harness + large single-target and many-target imports, depth, token lifetimes | Shared-host noise/heap cost | High |
| V3-06.2 Independent RC audit | Correctness/security/full regression | 05.2,06.1 | Close A02/A03; A04 accepted with evidence; decisions closed | Full tests/lint/types/build/package/demo/audit/packed checks once assembled | Cross-module regression | High |
| V3-07 Separate release gate | Manifest/release preparation and publication only if authorized | 06.2 + explicit authorization | Version/workflow behavior reviewed; owner decides each external action | Clean install/pack, final CI, registry/provenance only when publishing authorized | Automatic master publication | High |

Do not run the entire heavy suite after each small edit. Start with affected Vitest files and the relevant noEmit type checks; broaden when behavior crosses components or failures justify it. Documentation-only work does not need behavioral tests. Run full regression on the assembled release candidate, with actual commands/results recorded. Benchmarks are targeted manual evidence, not host-sensitive pass thresholds. Independent review must inspect the tested artifact SHA.

## 6. Risk and regression matrix

| Risk / invariant | Required scenario | Acceptance evidence / task |
| --- | --- | --- |
| A01 structural types | Independent class with no base; subclass overrides new method; old method only | New contract works; old contract fails clearly, no bridge / 03.3,05.2 |
| A02 purity | Direct/automatic/full/nested/collection/required/type/custom; recursion; mutation of another root | Supported writes rejected before mutation; guard recovers after throw / 03.4…6 |
| A03 object safety | Nested mapping and params with __proto__, constructor, prototype, toString | No prototype change/lost own key; safe resolver; zero writes on reject / 04.1,04.4 |
| Source lifecycle | Successful client check with active server/manual; own/sibling/equal/invalid-raw edits | Correct effective valid and only intended clearing / 03.2…6 |
| I18N-01 | Every built-in including required/cast/collections/Luxon | Exact code/params, no own message/formatter/locale/fallback / 03.3 |
| Duplicate code/order | Multiple same-field errors, many source keys, same code+params | No dictionary collapse; stable ordered lists / 03.1,04.3/6 |
| Atomic failure | Parser/adapter exception, invalid params/path, late bad target, scope/token failure | Values/errors/validity/touched/baseline/snapshots unchanged, no notifications / 04.6 |
| Post-commit observer error | Throwing subscriber/custom capture, direct Apply and outer batch | Exact ODR-05 approved channel; no false rollback claim / 04.6 |
| Latest operation | Same values, newer response first; older parse fails; disjoint/overlap scopes | Superseded cannot replace/append; disjoint valid / 04.5 |
| Revision versus dirty | A→B→A; clean-equal raw changes; validate false; baseline commit | ABA invalidates; metadata/baseline alone do not / 04.5 |
| Collection identity | Equal-content move/insert/remove; replace nested instance; detached old node | Tokens reject stale positions; retained local errors follow identities / 03.5,04.5 |
| Reset/baseline | Hydrated nested defaults, membership changes, equal reset, error-only commitBaseline | Existing reset targets/order, all errors cleared; baseline doesn't clear / 03.5,04.5 |
| Batch/reactivity | Metadata-only changes, equivalent repeats, live reads versus committed snapshots, reentrant subscribers | Final snapshots before callbacks; once per affected node; explicit validation immediate / 03.7,04.6 |
| HF-013 | Diamond, duplicate refs, suppressed writes, cycle/missing ref, dispose/re-enable | Selected pipelines once; unrelated errors survive; exception recovery / 03.6 |
| PERF-01/A04 | 1000-node reads/writes/collections, many errors per target, huge scoped imports | Preserve traversal/count bounds; linear normalization; paired timing/heap report / 06.1 |
| Module/type contract | JS/TS, ESM/CJS, no installed Luxon for core, optional Luxon entry | Packed runtime/declaration tests; unchanged value payloads / 05.2 |
| Rich params and catalogue | ODR-02 chosen domain, unknown codes, absent/empty messages | Safe deep immutability; no closed code enum; no app data loss / 03.1/3 |

## 7. Completion and release gates

V3-02 deliverables: architecture EN/RU (signatures, schema/apply/lifecycle, decisions), catalogue EN/RU and this plan EN/RU (migration, task dependencies, acceptance and risks). Update concise handoff and approved-requirement decision entries, without copying private discussion. Do not rewrite historical HF-015 behavior into future behavior or claim PR #29 merged.

Documentation verification: relative links, identical bilingual TypeScript blocks, 17-code coverage against source literals, EN/RU decision/task IDs, in-memory strict TypeScript checks of candidate declarations/examples, whitespace/diff and documentation-only changed-file inspection. These checks validate consistency, not runtime implementation or owner approval. Record actual results in handoff; full runtime/build/audit/benchmark checks are intentionally not part of this documentation task.

Before release: close ODR-01…05 and approve exact helpers/exports; implement authorized subtasks; migrate examples/consumers; pass independent A02/A03 correctness/security review and measured A04 performance review; run full candidate gates and packed strict ESM/CJS consumers, including core without Luxon. Review CI/publish workflow: a future master version bump can trigger publication. Version bump, commit/push, merge, tag/release and npm publication each remain outside V3-02. Downstream adoption (including PR #29's PL-01) is outside the AdaptForm release.

Overall status: **BLOCKED** — the five owner-decision groups prevent calling this an unconditionally final, implementation-ready public contract. Independent specification work is complete; no code implementation has started.
