# AdaptForm 3.0 — V3-02 migration, implementation and regression plan

[English](PLAN.md) · [Русский](PLAN.ru.md)

V3-02 status: **ACCEPTED** at `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 are final. Documentation integration status: **READY_FOR_OWNER_REVIEW**. [Specification](../../ai/V3_ARCHITECTURE.md), [I18N-01 catalogue](../../ai/V3_ERROR_CODES.md). Authorized: PR #29 documentation integration, one logical commit/push to docs/v3-02-specification and update of existing Draft PR #30. V3-03 implementation, merge and release require separate authorization. Version 2.2.0 is unchanged.

## 1. Sequence and authority

PR #29 remains an open, unmerged Draft at `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`; its V3-03…07 IDs denote milestones, with subtasks below. On 2026-10-31 both branches were fetched and compared with master `670c6a04014fbf938574bfd8eb2a706e44a9d4d0`. Integration starts from owner-accepted PR #30 HEAD `b041806ee35c56f55c0a0925e7d0de8b533f09bd` and transfers missing AGENTS/DECISIONS policy while preserving the accepted architecture. See the complete [PR #29 transfer matrix](../../ai/V3_DOCUMENTATION_INTEGRATION.md); no merge or PR #29 branch change is performed.

Approved ODR-01–05 supersede incompatible V3-01/V3-02 proposals: mandatory typeId replaces getTypeName; JSON params with deep checks/budgets; ODR-03 B removes intermediate checks and ensures full explicit traversal; final legacy ledger and mapping composition; ODR-05 A separates atomic commit from notification diagnostics. Retain manual clearing on actual own-value change, validate→{valid}, I18N-01, whole-form replace, unknown-path error and operation tokens/revisions.

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

## 3. Final REMOVE / REPLACE / KEEP ledger — ODR-04

Owner-accepted direction and final replacement designs. These classify future 3.0 contracts; no runtime removal occurs in V3-02. Useful behavior has an explicit replacement; no aliases, hidden dispatch or second parser. Evidence E1–E10 remains the unchanged 2.x source.

| Mechanism / evidence | Decision | Future API / migration consequence |
| --- | --- | --- |
| FieldType.validate(): string[], E1 | REMOVE | Only validateErrors(): readonly ValidationErrorInput[]; assign explicit rule codes |
| Base validate bridge / built-in override detection, E1 | REMOVE | Structural FieldTypeContract or optional base; override validateErrors directly |
| Mutable string errors/protected _errors, E2 | REPLACE | One canonical source-partitioned readonly store; subclasses use public setErrors/clearErrors, not protected array mutation |
| String reconciliation/provenance stack, E2/E4 | REMOVE | No text identity, ambient source context or duplicated string truth |
| Legacy boolean/string/single-object validator outputs, E3 | REMOVE | Array only; migrate true→[], false/string→explicit coded arrays; invalid JS/Promise fails diagnostically |
| messages*, messages options, built-in texts/localization, E3/E10 | REMOVE | Application display by code/params; no formatter/locale/message or code fallback in core |
| DateLuxon outputFormat, E10 | REMOVE | Verified message-only usage; app display owns it. KEEP inputFormat, casts and comparison modes |
| error string getter/setter, E3 | REPLACE | Read errors[0] as structured data; setErrors([{code,...}]) or clearErrors; no string setter |
| checkValid/checkAndSetValid, E3/E7 | REPLACE | validate(): ValidationResult; read .valid, effective across all active sources |
| Mutable isValid, E3 | REPLACE | Derived readonly tri-state Field/boolean aggregate; manual error sets invalidity, successful validation proves client success; no forced-success override |
| allErrors/globalErrors/setGlobalError/clearGlobalErrors strings, E4 | REPLACE | Located getErrors(); Form getOwnErrors()/errors are pathless globals; own manual set/clear, preserve duplicates; UI groups/renders |
| form.errors=response, Form.setErrors(response), errorsShema property, E4 | REMOVE | Explicit configured ErrorsSchema.parse → tokenized applyServerErrors. New Form.setErrors accepts only manual structured errors |
| source-taking local setErrors, E2/E4 | REPLACE | Manual-only setErrors; engine assigns type/custom/server at their boundaries |
| Legacy sources client/external, E2 | REMOVE | Persisted filters/DTOs migrate client→type, external→manual; custom/server unchanged |
| parseErrors/parseErrorsDetailed/parseValidationErrors and override bridge, E5 | REMOVE | One ErrorsSchema.parse with optional trace; adapters explicitly replace parser subclasses |
| staticKey/dynamicKey/fallback/transformValue fluent methods, E5 | REPLACE | Immutable ErrorsMapping config static/dynamic/fallback/ErrorTransform; whole-leaf transforms stay in tree leaf/adapter before extraction |
| nest, E5 | REPLACE | ErrorsMapping.nest({sourcePrefix,targetPrefix}); tuple scopes, source strip/target prefix, preserve local regex/fallback |
| forArray/custom index extractor, E5 | REPLACE | ErrorsMapping.forArray(item,options); explicit tuple index decoder and path codec, no key-format guessing |
| fromObject, E5 | REPLACE | ErrorsMapping.fromObject(Readonly<Record<string,ValidationPath>>); literal own string keys, explicit tuple targets |
| clone, E5 | REPLACE | ErrorsMapping.clone(): independent immutable config; regex copied, callbacks shared by reference |
| merge, E5 | REPLACE | ErrorsMapping.merge(other,options): left→right transforms, exact conflict policies, stable dynamic order; extraction config never merged |
| Shared mutable DefaultErrorsSchema, E4/E5 | REMOVE | Required explicit ErrorsSchemaConfig, including extraction mode/code/path; no global preset or inferred format |
| ParsedError/DynamicRule/ErrorFieldMapping old shapes, E5/E10 | REPLACE | ErrorMappingTrace, StaticErrorMapping/DynamicErrorMapping, ErrorsMappingConfig; imports migrate explicitly |
| getOwnErrors/getErrors useful readers, E2/E4 | KEEP | Own pathless read on every node (Form globals included); scalar getErrors own, Form/collection getErrors flat located projection |
| Snapshot strings/allErrors/globalErrors/optional validationErrors, E6 | REPLACE | Required NodeSnapshot.errors own structured list; children hold descendant errors; no cached duplicate aggregate truth |
| Optional itemIds in engine collection snapshots, E6/E7 | REPLACE | Required readonly string[] aligned with children; migrate external snapshot producers and fixtures to stable identities |
| HF-011 identities/move/detach, E7 | KEEP | Retained errors/subscriptions/IDs follow nodes; current paths use current order; no value matching |
| Constructor repeats/container child short-circuit, E7 | REPLACE | ODR-03 B: zero assembly checks, explicit complete boundary, independent full traversal; local automatic structural checks |
| getTypeName/localized expected, E1 | REPLACE | Required readonly typeId; eight catalogue literals for six built-ins/modes; explicit custom IDs, no alias/name inference |
| Arbitrary rich snapshot-converted params, E2 | REPLACE | ODR-02 JSON named object domain, validation/copy/freeze/budgets; application converts Date/Map/Set/classes/cycles explicitly |

Composition signatures, prefix/merge/conflict/copy/transform semantics and trace are normative in [architecture section 7](../../ai/V3_ARCHITECTURE.md). Every old schema helper is represented. Extractors remain on one configured parser; moving mapping composition into ErrorsMapping preserves functionality without competing extraction configs.

## 4. Consumer migration map

| Old API/behavior | Final target and reason | Affected apps / migration | Automation | Required checks |
| --- | --- | --- | --- | --- |
| Type validate returns strings | validateErrors returns ErrorInput[]; one contract | Custom type/subclass authors assign codes and preserve rule order | Partial rename only; codes manual | Structural implementations, overrides, direct built-ins |
| Custom true/false/string/one-object | [] or an array; strict result | JS/TS validators; map true→[], false→coded error, wrap object | Partial; boolean expression rewrites need review | Bad JS outputs, empty/duplicate arrays, Promise rejection |
| validate boolean caller/checkAndSetValid | validate().valid | Submission/control logic; unchanged server/manual can keep false | Rename plus result access; review semantics | Effective versus client success |
| Error string reads/push/splice/_errors | Readonly structured lists and manual source operations | UI/subclasses; rendering belongs to app | Simple reads partial; mutation manual | Detached params, no external mutation |
| messages / messages* / built-in texts | App display using stable code/params | Every localized UI; no message or code fallback supplied by core | Not safely automatic | Catalogue coverage and no generated message |
| getTypeName / localized expected | readonly typeId, no alias | Custom types/introspection/type-specific display | Explicit custom ID and app display dictionary | Cast routes and locale independence |
| Arbitrary Date/Map/cyclic params | JSON params + fixed budgets | Convert Date→epoch/ISO, Map→entries, Set→array, classes→DTO; resolve cycles explicitly | Manual; no silent coercion/data loss | Accepted/rejected domains and alias detachment |
| form.errors=response; Form.setErrors(response) | schema.parse + tokenized Apply | Both legacy and HF-015 server consumers | Response extraction/mapping is manual | Parse/apply rejection leaves state untouched |
| setErrors(errors,source) | Manual-only setErrors; server uses Apply | Programmatic errors; cannot spoof source | Partial by known callsite | Source preservation/clearing |
| allErrors/globalErrors/setGlobalError | Located errors / Form own setErrors | Nested/global rendering and keyed replacement; list replacement is explicit | Grouping manual | Nested globals, same-code repeats, scalar items |
| client/external strings | type/manual | Filters, snapshots, persisted errors | Literal rename possible | No old source emitted |
| Field local path:[] | Local error has no path; Form aggregates located errors | DTO and generic reader consumers | Partial by receiver type | Paths after move, literal dot keys |
| parseErrors/detail/subclasses | One parse with trace or adapter | Custom schema integrations | Manual; preserve full-leaf transformations | Existing static/dynamic/fallback/composition cases |
| Revalidation cleared all errors | Server/manual remain | Re-submit flows must explicitly clear intended sources, not force isValid | Manual behavior review | validate().valid false with active remote/manual |
| Any assignment cleared errors | Actual own raw/clean change clears both server/manual | Controlled inputs and equal writes | No blind codemod | Invalid raw changes sharing clean null, equal/format-only values |
| Indexed server result applied to current collection | Operation captures identity/structure/revision | Async HTTP callers, although validation remains sync | Manual begin-before-request wiring | Parallel responses, insert/remove/move/replacement/ABA |
| Snapshot strings/optional metadata | Required own structures; required stable itemIds | Framework adapters, persisted snapshots, test fixtures | Fixture transformation partial | Metadata notifications, frozen stable snapshots |
| Mutating validators outside graph | Forbidden everywhere | Impure validators/required callbacks | Manual; move side effects after validation | Direct/full/collection/nested/dependency/reentrant guards |
| Constructor/timing dependencies | Zero constructor/deferred checks; explicit complete pass | Factories, deferred hydration, callbacks observing parent context | Move required checks after complete construction | Exact invocation counts/context |
| rawValue typed T|null despite raw strings | No change selected by this spec | TS raw readers; a proposed unknown/raw generic would be another contract change | Owner review before inclusion | Preserve clean-value inference and Number raw strings |

ESM and CommonJS: keep adaptform and adaptform/luxon export paths and both runtime formats; error redesign does not justify format changes. Validate strict NodeNext .mts/.cts consumers with skipLibCheck:false against packed declarations. JS requires descriptive contract failures, not TypeScript-only safety. Keep optional Luxon out of the main runtime/types; preserve Luxon input/cast functionality. Snapshot formats are not JSON/FormData payloads: do not add codes, sources, revisions, itemIds or tokens to value serialization. Nested ownership remains ArrayFormField; reset membership/targets and baseline semantics are retained unless separately approved.

## 5. Small implementation tasks

ODR-01–05 are closed; the specification is accepted, but all tasks still require separate implementation authorization. Model: **GPT-6.1-Sol**, effort per row. No Astra is needed. Each task should have its own reviewable commit when commits are authorized. Dependency columns are technical dependencies, not permission to skip approval. The final ODR-04 ledger governs every public removal/replacement.

| ID / title | Goal and components | Dependencies | Acceptance | Targeted tests/checks | Risk | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| V3-03.1 Error DTO | ValidationError types, code/params checks, source ownership | approved ODR-01/02 | Exact JSON domain, fixed budgets, detached deep freeze, no strings/message fallback | DTO detach/alias/cycle cases and negative types | Explicit rich-params migration | High |
| V3-03.2 Source storage | Replace ErrorState facade; client-check marker | 03.1, ODR-04 | Independent sources; no duplicate canonical list/boolean | Lifecycle matrix, duplicate ordering, clear/unknown | False validity after clear | High |
| V3-03.3 I18N-01 and FieldType | Structural interface/base, built-ins and Luxon | 03.1, ODR-01 | Required typeId (8 IDs/6 types); only validateErrors; 17-code catalogue; no generated messages | Type suites, structural types, overrides, code/param declarations | Altered rules/cast representation | High |
| V3-03.4 Scalar runner/purity | Field compute/commit and new validate result | 03.2/3 | Effective valid; guard independent of graph; strict arrays | A02 direct, required/type/custom, recursion, exceptions/Promise | Guard/scheduler recovery | High |
| V3-03.5 Collection lifecycle | ArrayField/ArrayFormField callbacks/construction | 03.4, ODR-03 | Zero assembly callbacks; full explicit traversal despite size error; local structural counts; identity-based clearing | Constructor counts, deferred hydration, min/max, add/remove/move | Timing and context changes | High |
| V3-03.6 HF-013 integration | Graph runner and all-source state | 03.4/5 | Chains/diamonds/selective counts and disposal retained | Dependency tests, batch declarations/config failures | Duplicate/missing targets | High |
| V3-03.7 Canonical snapshots | Own structured errors and cache integration | 03.2/5/6, ODR-04 | Required own structured errors/itemIds; frozen/stable; metadata visible; HF-011 intact | Nested/subscription/performance regression tests | Quadratic ancestor refresh | High |
| V3-03.8 Legacy core cleanup | Delete approved bridges/setters/message exports | 03.3…7, ODR-04 | No hidden dispatch/string facade; migration ledger satisfied | Public export diff, source/test types, ESM/CJS smoke | Forgotten subclass/JS consumer | Medium |
| V3-04.1 Parser normalization | One parse, typed configuration and adapter | 03.1, ODR-02 | One bounded JSON normalizer; safe descriptor checks; detached readonly callback inputs; no Form writes | Malformed/cyclic input, bounds, source spoofing, adapter exceptions | Mutable references/partial results | High |
| V3-04.2 Declarative extraction | Records selectors and tree leaf decoding | 04.1 | Explicit envelopes/path/code; arrays/nested/global/missing data | Existing tuple and nested fixtures; literal dots/numeric names | Reintroduced heuristics | High |
| V3-04.3 Mapping/composition | Static/dynamic/fallback/trace and approved helpers | 04.2, ODR-04 | ErrorsMapping helpers with exact prefixes/conflicts/copy/left→right transforms; full-leaf extraction; trace includes drops | Existing schema suite scenarios, codecs, regex flags, merge conflicts | Useful feature silently lost | High |
| V3-04.4 Safe target preflight | Registered-node resolver and scope rules | 04.1/3, 03.7 | Resolve all targets safely before writes; default unknown error | A03 all levels; prototype names; out-of-range/unsafe indexes; globals | Prototype access or wrong target | High |
| V3-04.5 Revisions/operations | Begin token, overlap/scope/latest and reset generation | 03.5/6, 04.4 | Equal-value newer request wins; structure/ABA rejected; disjoint independent | Two operation orders, reset/move/replacement, used/wrong-root tokens | Stale response wins/retained tokens | High |
| V3-04.6 Atomic grouped Apply | Stage and swap source changes, reuse normalized entries | 04.4/5, ODR-05 | Four phases; callback-free atomic commit; committed:true + pending/delivered report; failures retained; ordered nested-batch delivery | Parse/preflight/commit/notification fault matrix; empty replace; batch | Claimed atomicity exceeds guarantee | High |
| V3-04.7 Server legacy cleanup | Remove approved old importers/parsers/types | 04.6, ODR-04 | One public server ingestion pipeline and migration recipes | Export inventory, old integrations migrated without implicit bridge | Lossy/duplicate parser survives | Medium |
| V3-05.1 Consumer migration | EN/RU docs/examples/demo and diagnostic clarity | 03.8,04.7 | Every ledger row has a working replacement, including custom typeId/rich params/ErrorsMapping/diagnostic reports | Example type checks, JS failures, affected demo checks | Instructions hide semantic breaks | Medium |
| V3-05.2 Package/type regressions | STAB-01 and ESM/CJS/Luxon consumers | 05.1 | Inference preserved, no TS2589, optional Luxon isolated | Strict .mts/.cts packed consumers and positive/negative types | Packaging/type-only break | High |
| V3-06.1 Performance review | Compare baseline/core/import/tokens | 03.7,04.6 | Paired data, ODR-03 counts, bounded params/imports/report retention; no accumulated re-normalization | Existing harness + large single-target and many-target imports, depth, token lifetimes | Shared-host noise/heap cost | High |
| V3-06.2 Independent RC audit | Correctness/security/full regression | 05.2,06.1 | A02/A03 closed; measured A04; verify all approved ODR contracts and complete ledger | Full tests/lint/types/build/package/demo/audit/packed checks once assembled | Cross-module regression | High |
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
| Post-commit observer error | Throwing subscriber / later outer capture failure, direct Apply and outer batch | All later listeners run; retained failures incl. diagnostic listener; pending→delivered at outer flush; no rollback / 04.6 |
| Latest operation | Same values, newer response first; older parse fails; disjoint/overlap scopes | Superseded cannot replace/append; disjoint valid / 04.5 |
| Revision versus dirty | A→B→A; clean-equal raw changes; validate false; baseline commit | ABA invalidates; metadata/baseline alone do not / 04.5 |
| Collection identity | Equal-content move/insert/remove; replace nested instance; detached old node | Tokens reject stale positions; retained local errors follow identities / 03.5,04.5 |
| Reset/baseline | Hydrated nested defaults, membership changes, equal reset, error-only commitBaseline | Existing reset targets/order, all errors cleared; baseline doesn't clear / 03.5,04.5 |
| Batch/reactivity | Metadata-only changes, equivalent repeats, live reads versus committed snapshots, reentrant subscribers | Final snapshots before callbacks; once per affected node; explicit validation immediate / 03.7,04.6 |
| HF-013 | Diamond, duplicate refs, suppressed writes, cycle/missing ref, dispose/re-enable | Selected pipelines once; unrelated errors survive; exception recovery / 03.6 |
| PERF-01/A04 | 1000-node reads/writes/collections, many errors per target, huge scoped imports | Preserve traversal/count bounds; linear normalization; paired timing/heap report / 06.1 |
| Module/type contract | JS/TS, ESM/CJS, no installed Luxon for core, optional Luxon entry | Packed runtime/declaration tests; unchanged value payloads / 05.2 |
| Rich params and catalogue | ODR-02 exact JSON domain/budgets, unknown codes, absent/empty messages | Safe deep immutability; no closed code enum; no app data loss / 03.1/3 |
| ODR-03 counts/context | Constructor/deferred/reset zero; add new-only; remove/move own-only; full validate after size failure | Exact count matrix, fully hydrated siblings and nested Form context / 03.5 |
| Composition | All five helpers, tuple prefixes, custom indexes, regex flags/captures, duplicate static/fallback conflicts, left→right transforms, full-leaf arrays | Exact semantics and trace incl. drops; no extraction merge/second parser / 04.3 |
| Params safety | undefined/nonfinite/BigInt/Symbol/functions/classes/cycles/accessors/prototypes/sparse arrays, boundary budgets | Diagnostic contract failures; no getters/toJSON/caller mutation; detached readonly results / 03.1,04.1 |

## 7. Completion and release gates

V3-02 deliverables: architecture EN/RU (signatures, schema/apply/lifecycle, decisions), catalogue EN/RU and this plan EN/RU (migration, task dependencies, acceptance and risks). Update concise handoff and approved-requirement decision entries, without copying private discussion. Do not rewrite historical HF-015 behavior into future behavior or claim PR #29 merged.

Documentation verification: relative links, identical bilingual TypeScript blocks, 17-code coverage against source literals, EN/RU decision/task IDs, strict TypeScript checks of future declarations/examples, whitespace/diff and documentation-only changed-file inspection. These checks validate consistency, not runtime implementation or owner approval. Record actual results in handoff; full runtime/build/audit/benchmark checks are intentionally not part of this documentation task.

Before release: use the accepted specification and its exact helper/export ledger; implement separately authorized subtasks; migrate examples/consumers; pass independent A02/A03 correctness/security review and measured A04 performance review; run full candidate gates and packed strict ESM/CJS consumers, including core without Luxon. Review CI/publish workflow: a future master version bump can trigger publication. Only the authorized documentation commit/push and Draft PR #30 update are inside this task; version bump, merge, tag/release and npm publication remain excluded. Downstream adoption (including PR #29's PL-01) is outside the AdaptForm release.

Documentation integration status: **READY_FOR_OWNER_REVIEW**. V3-02 and its final contracts/30-row ledger are **ACCEPTED**; ODR-01–05 remain unchanged. No implementation has started; V3-03 requires separate authorization.
