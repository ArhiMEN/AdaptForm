# Handoff

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

## V3-03.3 I18N-01 — 2026-11-04

Status: **PASS_WITH_RISKS**, ready for owner review, not owner acceptance. V3-03.1 and V3-03.2 are accepted for continuation. Starting HEAD: `17e8f5708372eb50c2bad6c8f3457e1b0405af27`; clean tree, existing `feature/v3-runtime`, existing [Draft PR #32](https://github.com/ArhiMEN/AdaptForm/pull/32). The environment initially checked out `work` at master `9b3c773`; the existing remote task branch was fetched and checked out before implementation. This handoff belongs to the separate `feat: remove core validation message generation` commit; its SHA and final-head CI are recorded in the PR/delivery report. Version remains **2.2.0**; no dependency, workflow, architecture, merge, release, tag or npm publication changes.

Implemented and migration:

- Field required and collection required/min_items/max_items now emit only catalogue code/params. Failed casts retain machine `invalid_type.expected`. Existing built-in types already produced message-free catalogue errors. Required defaults, empty/optional/cast gates, type-before-custom order, collection early exits/traversal, source storage, atomic client normalization and validity semantics are unchanged.
- Removed `messages` from FieldOptions, StringOptions, NumberOptions, BooleanOptions, DateOptions, DecimalOptions, ArrayFieldOptions, ArrayFormFieldOptions and DateLuxonOptions. Removed all nine exported interfaces: messagesOptions, messagesStringOptions, messagesNumberOptions, messagesBooleanOptions, messagesDateOptions, messagesDecimalOptions, messagesArrayFieldOptions, messagesArrayFormFieldOptions and messagesDateLuxonOptions. No aliases/replacement options. Logic options, including Luxon inputFormat, remain. outputFormat/getTypeName were already removed by V3-03.1.
- Removed RU defaults/templates and message-option lookups from Field/collections; removed the fallback-message argument of internal customErrors. Legacy false still emits code custom but no generated message. No new result interpretation or bridge was added.
- ValidationErrorInput.message remains optional. The unchanged DTO normalizer preserves explicitly supplied messages, including `''`, omits absent message, detaches/freezes errors and params and never supplies display fallback. Server/manual messages survive client validation. Failed normalization cannot partially replace client sources.
- Demo display dictionaries now live in an application WeakMap associated with field/container instances, outside library options. Application displayError uses code/params and these dictionaries; existing EN/RU translations, field-specific wording, collection messages and UI interactions remain. The formatter is neither in src nor exported; UI does not repeat validation rules.
- Examples (own output includes source): required changed from `{code:'required',message:'Поле обязательно для заполнения',source:'type'}` to `{code:'required',source:'type'}`; collection minimum from `{code:'min_items',message:'Значений должно быть не меньше 2',params:{min:2},source:'type'}` to `{code:'min_items',params:{min:2},source:'type'}`. Explicit `{code:'app.rule',message:''}` remains unchanged apart from assigned source.

Tests: **15 new runtime cases** (14 in `tests/unit/i18n-01.test.ts`, one demo regression); **22 existing expanded cases / 16 test declarations** migrated, including title-only clarification. No cases removed: **834 / 37 files**, previously 819 / 36. New negative TypeScript checks cover removed exports (all nine), Field/both collections/Luxon object literals and absence of messages in every options interface. Existing catalogue, V3-03.1/02 lifecycle, JSON budgets/security, callback counts and explicit user-message coverage remain green.

Actual local checks on Node **24.19.0** / npm **11.9.0**:

| Command | Result |
| --- | --- |
| `npm ci` | PASS |
| `npm audit --audit-level=moderate` | PASS, 0 vulnerabilities |
| `npm run lint` | PASS, 0 warnings/errors |
| `npm test` | PASS, 834 tests / 37 files |
| `npm run build` | PASS, ESM/CJS/declarations, both entries |
| `npm run check:package` | PASS, 21 files |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Packed isolated consumers outside the repository pass ESM/CJS core **without installed Luxon**, then both optional Luxon loaders, on **Node 16.20.2 and 24.19.0**. Strict NodeNext `.mts`/`.cts` consumers pass with `skipLibCheck:false` and `exactOptionalPropertyTypes:true`, including removed message-option negatives. Published declarations contain no messages options/interfaces. Node 16 verifies built runtime, not modern development dependencies. Scratch scripts/packs/consumers/logs are excluded from the commit. Final-head remote CI is recorded separately in PR #32.

Remaining source-search matches and limits:

- `BuiltinValidationError.ts`: message?:never prohibits built-in text. `ValidationError.ts`: optional message declaration and descriptor/type checking/copying preserve application input; the string branch of customErrors transfers explicitly returned application text, including empty strings. No formatter/locale/dictionary/code-to-text fallback remains in built-in producers or public options.
- Legacy validator contract remains exactly at `options.ts` FieldOptions.validate, ArrayFieldOptions.validate and ArrayFormFieldOptions.validate. `ValidationError.ts::customErrors` still maps false→custom error, string→custom with explicit text, single coded object→one entry, nonempty all-coded array→entries, other results→success (including unsupported JS Promise/malformed arrays). Its three call sites are `Field.checkValid`, `ArrayField.checkValid`, `ArrayFormField.checkValid`. Final array-only synchronous validation, rejection of legacy/Promise outputs, purity and compute/commit belong to V3-03.4 and subsequent collection work; do not reuse this helper for the new runner.
- `ErrorsShema.ts`: ParsedError.message/comments, parseValidationErrors string transfers and legacy parseErrors/parseValidationErrors/parseErrorsDetailed JSON.stringify conversions of nonstring external response values remain unchanged. These are old external-response parser contracts, not built-in rule messages, and the new parser is explicitly outside this task. **Risk:** a literal library-wide claim of zero text generation is not yet true for that legacy parser serialization. Resolve it through the accepted V3-04 parser/cleanup, with no new fallback here.
- `dependencyScheduling.ts` / `DependencyGraph.ts`: message arguments and English thrown strings are developer configuration/mutation diagnostics, not ValidationError display. DecimalType format comments describe numeric input grammar; ErrorsShema custom formats describe path syntax. No locale state, translations, message templates or message options were found in src.

Next requires separate owner authorization: V3-03.4 scalar runner, then collection lifecycle/ODR-03, dependencies and later parser/Apply stages. This change removes the runner's message-option dependency; it does not implement validate():ValidationResult, complete traversal/purity, ErrorsMapping/new parse, server Apply, revisions/operations or ODR-05. No next stage has started and no architecture decision is reopened.

## V3-03.2 source storage and error lifecycle — 2026-11-03

Implementation status: **READY_FOR_OWNER_REVIEW**, not owner acceptance. V3-03.1 at `349e216fc5a0cb32e0997030266a63ce442d9c7e` was accepted for continuation; this is the starting SHA on `feature/v3-runtime`. One separate implementation commit, `feat: implement source-partitioned error lifecycle`, updates existing [Draft PR #32](https://github.com/ArhiMEN/AdaptForm/pull/32). Its final SHA and final-head CI are recorded in the PR/delivery report; this handoff belongs to the same commit. Package/dependencies/workflows and accepted ODR-01–05 are unchanged; version **2.2.0**. No merge, release, tag or npm publication.

Storage and API:

- Internal `ErrorStore` owns four independent immutable partitions, in `type → custom → server → manual` order. Within-source insertion order and repeated codes survive. The cached merged list is a readonly derived view, not another writable source of truth. Every ingress uses the V3-03.1 DTO/JSON params normalizer; client partitions normalize together before either replacement. A failed replacement preserves all installed sources. Caller objects remain unfrozen and detached.
- Internal `ErrorNode` shares own storage, client-check knowledge, explicit clearing and ownership propagation across Field/Form/collections. `errors` and `getOwnErrors()` expose the same readonly pathless own view. Scalar `getErrors()` reads own errors; Form/collections return flat readonly located errors. Form traverses fields then own globals at `[]`; collections traverse own errors at `[]` then current items. No read validates or formats messages.
- `setErrors(readonly ValidationErrorInput[])` replaces only own **manual** errors, including on Form. No public source argument or response/path importer remains. `clearErrors({sources?, recursive?})` defaults to all own sources, `recursive:false`; clearing type/custom invalidates client-check knowledge. Clearing only server/manual, or `setErrors([])`, preserves a completed client check.
- Public server installation depends on the later tokenized `applyServerErrors()` stage. It is deliberately unavailable in this intermediate branch. An internal source writer, absent from package exports, exercises server storage/lifecycle and provides an integration point for Apply; it is not a public importer or compatibility bridge. Existing standalone ErrorsSchema parsers remain unchanged for their separately planned migration.

Lifecycle and validity:

- Client checks replace type/custom together and preserve server/manual. `checkValid()` and `checkAndSetValid()` still return booleans for this stage, now reflecting active errors across every source. No temporary validate result API was added. A thrown check leaves its marker unchecked and does not replace installed errors or claim old success.
- An actual change compares both post-plugin raw input and cast clean value with the existing supported-value equality policy. It clears own sources and invalidates the check, then optionally validates. Distinct invalid raw inputs sharing clean null and raw formatting changes count; equivalent values preserve server/manual and successful knowledge when validation is disabled. Touch behavior remains.
- Leaf changes clear/invalidate containing collections, including nested collections, independently of subscriptions. Form globals and unrelated item errors survive. Insert/remove/move clear affected collection own errors; retained node errors, IDs and baselines follow identity and paths use current indexes. Replacement detaches old nodes; no value matching. Snapshot reads reconcile external membership/property edits without retaining obsolete error-parent links.
- Reset clears all affected sources recursively and leaves checks unknown, with surviving membership/order and constructor reset targets retained. Direct leaf reset propagates an actual value change to containing collections. `commitBaseline()` preserves errors/check knowledge and only captures clean baselines; dirty may become false while errors remain.
- Field validity is derived: own error → false; no errors + unchecked → null; completed successful current check → true. Containers remain boolean, requiring completed own collection checks and checked/valid descendants. Empty Form distinguishes unchecked from explicitly checked. There is no writable validity boolean.
- Snapshots now require own structured `errors`; redundant `validationErrors`, string errors, aggregate `allErrors` and keyed `globalErrors` are removed. Collection `itemIds` are required readonly arrays. Errors/params/paths/snapshots are deeply immutable; equal final snapshots retain references and emit nothing. Existing child-before-parent delivery and all-snapshots-before-callback guarantees remain; no ODR-05 transaction redesign.

Removed: ErrorState, mutable `_errors`/string reconciliation, automatic manual errors from text-array edits, `manualErrorSource()`/`withErrorSource()`, scalar/collection `error`, Form `errors=` response routing, source-taking setters, keyed global setters/readers/clearing and writable Field.isValid. Demo installs explicit application/manual errors and renders structured data; it does not impersonate server provenance.

Test migration was analyzed against the accepted ledger: the 30 old Form/schema importer cases become 28 parser-boundary and explicit manual-ownership cases; V2 implicit routing/replacement assertions no longer specify runtime behavior. Mapping priority, transforms, arrays, nesting, fallback, null/unknown inputs, repeated/large responses and value preservation remain covered. Other old string/override/mutation assertions now check readonly structures or test-owned display projections, never a write-back facade. Existing runner callback counts/early exits remain characterized for the later ODR-03 stage. Added **42** source/lifecycle regressions plus negative TypeScript contracts; all V3-03.1 params and type regressions pass.

Verification on Node **24.19.0** / npm **11.9.0**, all PASS:

| Command | Result |
| --- | --- |
| `npm ci` | Clean install |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| `npm run lint` | 0 warnings/errors |
| `npm test` | 819 tests / 36 files |
| `npm run build` | ESM, CJS, declarations, optional Luxon |
| `npm run check:package` | 21 files |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Fresh packed consumers outside the repository pass ESM/CJS on **Node 16.20.2 and 24.19.0**, first core without installed Luxon, then optional Luxon. Strict `.mts`/`.cts` NodeNext declarations pass with `skipLibCheck:false` and `exactOptionalPropertyTypes:true`, including removed API/readonly/params/required-ID negatives. Node 16 checks the built runtime; modern development dependencies run on Node 24. Scratch packs, consumers and logs are excluded from the commit. Final-head remote CI remains authoritative in PR #32.

Limits/next authorization: **V3-03.3** must finish I18N-01 for required/custom/collection producers and message options; type built-ins/typeId foundations are already implemented. Legacy option-validator result interpretation remains until the scalar runner stage; it is not error storage. New validate()/validateErrors() runner and purity, zero constructor/deferred callbacks and complete ODR-03 traversal, final dependency/snapshot integration, ErrorsMapping/new schema.parse, tokenized server Apply, revision/operation fencing and ODR-05 transactions remain later tasks. Arbitrary external in-place edits are discovered on reads as before, without a universal revision-tracking guarantee. No full-V3 lifecycle, atomic server apply or new performance benchmark claim. Do not start V3-03.3 before owner authorization.

## V3-03.1 foundational contracts — 2026-11-03

Implementation status: **READY_FOR_OWNER_REVIEW**, not owner acceptance. Branch `feature/v3-runtime`, based on freshly fetched master `9b3c773563228614a755ff859ea6c518e21d9b77` (PR #30 integrated). Delivery is one commit, `feat: implement V3 foundational contracts`; [branch HEAD/history](https://github.com/ArhiMEN/AdaptForm/commits/feature/v3-runtime) and the [Draft PR](https://github.com/ArhiMEN/AdaptForm/pulls?q=is%3Apr+head%3Afeature%2Fv3-runtime) identify its exact SHA. The final SHA is recorded in the PR/delivery report because this handoff belongs to that same commit. Package remains **2.2.0**; no merge, release, tag or publication.

Available contracts:

- `FieldTypeContract<T,O extends object>` / `FieldTypeConstructor`; optional `FieldType` base, required readonly nonempty `typeId`, structural implementations with custom options and unchanged clean-value inference. Options objects produced by implementations retain their identity/prototype. Six built-ins expose eight stable IDs, including readonly effective-mode getters for Date/Luxon. Failed casts and defensive invalid-type checks use the same IDs; no constructor-name inference, getTypeName alias, old type validate bridge or override detection. Built-in type rules emit code/params only; message-only Luxon outputFormat is removed. A supported semantic mode change invalidates a successful check.
- Pathless `ValidationError`, `ValidationErrorInput`, `LocatedValidationError`, `ValidationErrorSource` (`type/custom/server/manual`) and `ValidationPath`; local Field/collection own errors have no path. Aggregation adds relative paths; own Form globals aggregate at `[]`. Repeated codes/order and absent/empty messages survive. `BuiltinTypeId`, `BuiltinErrorParams`, `BuiltinValidationErrorInput` check catalogue producers without closing application codes.
- `JsonValue`, `JsonObject`, `ErrorParams`, runtime `ErrorContractError` with stable reason/frozen diagnostic path. One internal normalizer handles existing error ingress before own-store replacement: exact JSON domain, finite numbers, -0→0, descriptor/prototype/cycle validation, safe null-prototype output records, detached recursive copy/freeze. Dense arrays only; no getters/toJSON/coercion. Shared acyclic references are copied/charged per occurrence. Exact limits: root depth 0/max 32; 10000 visited nodes; 1048576 logical UTF-8 bytes; 65536 UTF-16 units per string/key. Rich values require explicit application DTO conversion. Proxies are unsupported, as specified.
- Final readonly `ValidationResult {valid:boolean}` type only. Existing node validation methods are deliberately not switched to it. No temporary exported result alias, normalizer API or replacement validation entry point is added.

Minimal integration adjusts existing error readers/stores/parser types to the new DTOs and sources, delays own-store writes until DTO normalization succeeds, and moves affected demo rendering to application code. Existing tests asserting removed type methods/messages, client/external sources, local path:[] or keyed aggregate globals now assert accepted V3 structures. All previous test cases remain; callback counts, deferred hydration, subscriptions, dependencies and value serialization retain coverage.

Next authorization: **V3-03.2**, source-partitioned storage/client-check knowledge and manual/server preservation/clearing. Existing ErrorState string reconciliation, source-taking setters, keyed global internals, mutable validity, legacy option validator results and snapshot string facades still await their planned replacements; no new bridge was introduced. Required/collection/custom legacy text generation remains for V3-03.3; the demo currently uses its existing message options as application display data. Scalar validate/purity, ODR-03 traversal, dependency/snapshot integration, ErrorsMapping, schema.parse, atomic Apply and revision/operation fencing remain later tasks. This stage makes no full-V3 lifecycle/atomic server-apply/performance claim. Accepted architecture/decisions are unchanged; no unresolved specification conflict or deviation was found.

Verification on Node **24.19.0** / npm **11.9.0**, all PASS:

| Command | Result |
| --- | --- |
| `npm ci` | Clean install |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| `npm run lint` | 0 warnings/errors |
| `npm test` | 779 tests / 35 files; 59 new foundation tests |
| `npm run build` | ESM, CJS, declarations, optional Luxon |
| `npm run check:package` | 21 files |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Fresh packed consumers outside the repository pass ESM/CJS on **Node 16.20.2 and 24.19.0**, first core without installed Luxon, then the optional Luxon entry point. Strict `.mts`/`.cts` NodeNext declaration consumers pass with `skipLibCheck:false` and `exactOptionalPropertyTypes:true`, including negative public-contract cases. Node 16 is a built-library runtime check; modern development dependencies are tested on Node 24. Security regressions cover nested arrays/objects, cycles/aliases, dangerous keys, accessors/non-enumerable descriptors, prototypes/classes/sparse arrays, unsupported values, complete deep detachment/immutability and exact depth/node/string/UTF-8 byte boundaries. Temporary packs/consumer fixtures/logs are outside the commit. Inspect final-head PR CI and obtain independent owner review before any later stage.

## npm audit maintenance — 2026-10-31

Branch `fix/npm-audit-minimatch`, base master `670c6a0`: GHSA-g3hv-75wg-m249 affects shared dev-only minimatch 10.2.6 through ESLint 10.12.0, @eslint/config-array 0.23.5 and @typescript-eslint/typescript-estree 8.71.2. Current upstream ranges (including latest compatible parent releases) exclude patched major 11. Scoped overrides select 11.0.1 only for these consumers; the lockfile adds @isaacs/nonrecursive-glob-match 1.0.3. Removed minimatch APIs are unused by these consumers; 56,580 differential matching comparisons and identical lint results across 69 files passed. No direct dependency upgrades, runtime/API/version/workflow changes or V3 work.

Local Node 22.23.4/npm 10.9.9: clean `npm ci`, audit (**0 vulnerabilities**), lint, **720 tests / 34 files**, library build, package check (**21 files**), source/test/demo TypeScript and demo build/output all pass. ESM/CJS/declaration output is byte-identical to baseline. Packed core without Luxon and optional Luxon entry points pass ESM/CJS validation smoke checks on Node 16.20.2 and 22.23.4. The library still declares Node >=16; the existing development toolchain requires newer Node. Next: PR CI and owner review, without merge/publication. Override compatibility is limited to the checked consumers; revisit/remove overrides when upstream adopts patched minimatch.
## PR #29 documentation integration — 2026-10-31

V3-02: **ACCEPTED** by the owner at `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 are final. Integration result: **READY_FOR_OWNER_REVIEW**. Branch `docs/v3-02-specification`; existing [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). [Transfer matrix](V3_DOCUMENTATION_INTEGRATION.md) reconciles all six PR #29 files in 33 rows.

Transferred the full AGENTS legacy/workaround escalation policy and original DECISIONS direction; explicitly included architectural deviations and accepted-V3-02 precedence. Updated acceptance/provenance in architecture, catalogue and plan EN/RU; retained historical A01–A04 and release/downstream gates. All 30 ledger decisions, ODR-01–05 and future contracts remain unchanged. PR #29 stays open Draft at `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`, with no branch change.

Actual checks PASS: scratch-only `python /tmp/adaptform-doc-integration/check_docs.py` — 517 assertions, 232 relative links/anchors, exact 14-file allowlist, EN/RU blocks/IDs/table and heading structure, all 33 transfer rows, four verbatim AGENTS rules and four original DECISIONS bullets per language. Exact comparison with accepted HEAD confirms all 30 ledger rows, five ODR rows, approved decision descriptions, normative contract sections and 14 TypeScript blocks unchanged. TypeScript 5.9.3 strict/noEmit/exactOptionalPropertyTypes/skipLibCheck:false passes all 14 blocks and 19 verified negative cases with ambient Form/Field scaffolding; this checks future signatures/examples, not runtime. Historical records and `git diff --check` pass. Checkers/generated files live only in `/tmp`, excluded from the commit.

Changed files: AGENTS EN/RU; docs/ai/{DECISIONS,HANDOFF,V3_ARCHITECTURE,V3_ERROR_CODES,V3_DOCUMENTATION_INTEGRATION} EN/RU; docs/roadmap/v3.0.0/PLAN EN/RU — 14 Markdown files. No runtime/tests/dependencies/version/CI changes. Runtime suites/builds/audit/benchmarks were not run for this documentation task; historical results below are not current checks.

No unresolved substantive conflict. Next: owner reviews documentation integration; V3-02 acceptance is already recorded. Recommend closing PR #29 as superseded only after integration acceptance; do not close it in this task. V3-03 requires separate authorization. Delivery permits one normal commit/push and Draft PR #30 update, without force push, master merge or npm publication.

## V3-02 / ODR-01–05 finalization — 2026-10-28

Historical record of the pre-acceptance finalization at `b041806ee35c56f55c0a0925e7d0de8b533f09bd`. Its pending-acceptance/unintegrated-PR-29 statements describe 2026-10-28 and are superseded by the 2026-10-31 entry above; recorded check results are preserved.

**READY_FOR_OWNER_REVIEW**. All five owner decisions are approved; no open ODR remains in this task; specification acceptance is pending. Branch docs/v3-02-specification, initial HEAD 96a82c8f015ff34115e192b0c3947d50052b2ebf, clean index/tree; existing [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). [Architecture](V3_ARCHITECTURE.md), [17-code catalogue](V3_ERROR_CODES.md), [complete legacy ledger/tasks/risks](../roadmap/v3.0.0/PLAN.md) and RU companions align.

ODR-01: typeId, eight IDs for six built-ins/modes, no getTypeName alias. ODR-02: exact JSON domain, deep checks/detach/freeze/budgets and rich-params migration. ODR-03 B: zero constructor/deferred callbacks, completion boundary, full explicit traversal and local structural counts. ODR-04: final REMOVE/REPLACE/KEEP, one parser/explicit config, ErrorsMapping composition, trace, own/aggregate readers and required itemIds. ODR-05 A: atomic staged commit, separate retained pending/delivered diagnostic reports, exact delivery/nested-batch rules and fault matrix. Contracts are future design; runtime is unchanged.

Actual checks PASS: scratch-only `node work/check-docs.mjs` — 342 consistency assertions, 190 relative links/anchors, EN/RU TS/IDs/tables/headings, 17 source codes, eight type/mode IDs, 30 legacy-ledger rows and exact 10-file allowlist. TypeScript 5.9.3: 14 Markdown blocks, strict/noEmit/exactOptionalPropertyTypes, 19 negative cases; ambient Form/Field scaffolding checks future signatures/examples, not runtime. Historical HANDOFF/DECISIONS preservation and absence of open ODR contradictions checked. `git diff --check` — PASS. Checker/scripts are scratch only, excluded from the commit; runtime suites/builds/audit/benchmarks were not run.

Only the 10 authorized Markdown files changed; runtime/tests/dependencies/version/workflows/AGENTS and historical audit/test results remain unchanged. PR #29 is unchanged/unintegrated, original draft head aab14d29b428c57cabb9ec5ceb069fcc5adaba6e. One documentation commit/push and Draft PR #30 update are authorized; no force push/merge/release. Next: owner accepts specification and separately authorizes V3-03; do not begin implementation automatically.

## HF-015 review — 2026-10-28

PR #28, branch `hf-015-structured-validation-errors`, master/base `b9051dd`, reviewed original head `66fcbd8`. **PASS_WITH_LIMITATIONS**: fix cross-node/key provenance leakage, prototype-named global error publication, and frozen custom-parser bridge results. **720 tests / 34 files**, lint, source/test/demo types, library/demo builds, package integrity, packed strict NodeNext ESM/CJS without Luxon and diff checks pass. Repeated full/paired benchmarks retain measurable collection costs and about 0.3 MiB additional heap; rule/notification counts match master. Audit still blocks CI on dev-only undici 7.29.1; propose separately approved override 7.30.1, no dependencies/workflows changed. [Review, raw data, limitations and exact plan](../roadmap/v2.3.0/ERRORS_REVIEW.md). Next: final-head CI and independent acceptance; resolve audit separately before merge. Version remains 2.2.0; no merge/publication/tag/branch deletion.

## HF-015 — 2026-10-24

[PR #28](https://github.com/ArhiMEN/AdaptForm/pull/28) is open against master. [CI #40082508903](https://github.com/ArhiMEN/AdaptForm/actions/runs/40082508903) on `69f0878` failed at Audit dependencies: undici, 1 high + transitive jsdom moderate; subsequent checks were skipped. Logs confirm the dependency blocker, not a failing HF-015 test. [PR checks](https://github.com/ArhiMEN/AdaptForm/pull/28/checks) are authoritative for later documentation-only commits.

Branch `hf-015-structured-validation-errors` from current master `b9051dd`; source `1af1a2b`, tests `37ba83d`, empty-read optimization `934b378`. Version **2.2.0**, package/lockfile/dependencies unchanged. HF-011 accepted in PR #25, PERF-01 in #26, limited HF-013 in #27. [Error contract](HEADLESS_ERRORS.md) covers ordered code/message/params/path/source, getErrors, the legacy string facade, new validator results and additive server ingestion. Existing setter/parser/transformer behavior and clearing policy remain; snapshots add optional own validationErrors.

Final local checks: **711 tests / 33 files** (51 new regressions), lint, source/test/demo TypeScript, library/demo builds, package (21 files), fresh packed ESM/CJS and strict NodeNext declarations without installed Luxon, links/EN-RU examples and diff — PASS. **npm audit FAIL**: existing high-severity undici 7.29.1 findings reproduce on untouched master with the same lockfile; production-only audit reports 0. [Full checks, raw benchmarks and model costs](../roadmap/v2.3.0/ERRORS_VERIFICATION.md): the paired 1000-node comparison shows about 9% unchanged-snapshot cost and 8–10% collection cost; the full harness has larger fluctuations. Measurements do not establish zero slowdown/leaks; extra metadata costs memory.

Next: PR acceptance into master and independent review, inspect CI accounting for the existing audit blocker. New server ingestion is explicit; global errors survive value changes, and legacy allErrors does not start flattening scalar item errors. Mutable legacy arrays reconcile on reads without Proxy/automatic notifications. HF-014/016/017 are not implemented. No merge, publication, version bump, tag or branch deletion. Entries below are historical and do not imply HF-011/013 are still unmerged.

## HF-013 — 2026-10-21

Branch `feature/v2.3.0-dependent-validation`, base master `30a45a2` (PR #26), implementation `654b162`. Package stays **2.2.0**. [Implemented EN/RU API and limits](HEADLESS_DEPENDENCIES_USAGE.md): optional `dependsOn: [{path: ['fieldName']}]`, explicit `enableDependencies()`/idempotent disposal, whole-pipeline selective checks, deterministic chains/diamonds, batch suppression/deduplication, atomic snapshots and configuration/purity errors. No subscription is required. Unactivated forms retain legacy behavior.

Final local checks: **660 tests / 32 files** (606 baseline + 54 cases), including 53 dedicated dependency regressions and bounded declaration/value-inference coverage; `npm run lint`; source/test TypeScript (`npx tsc --noEmit -p tsconfig.json` and `tsconfig.test.json`); `npm run check:demo`; library/demo builds; `npm run check:package` (**21 files**); `npm audit --audit-level=moderate` (**0 vulnerabilities**); documentation links/EN-RU examples and `git diff --check`. Fresh packed ESM/CJS runtimes and strict NodeNext declaration consumers pass without installed Luxon. A local 1000-field batch probe selected **2 validators instead of 1000**; timings are host-specific, not a general speed guarantee.

Limits: direct ordinary Fields of one Form only; no collection dependencies, direct references, positional/nested paths or async. Collection recursive/constructor checks and explicit checks remain outside automatic graph-pass deduplication. Opt-in callbacks must be pure; configuration errors retain writes and require successful recompilation. Supported option replacement is tracked; arbitrary property/in-place edits are not. Topology is reused for unchanged declarations; activation/recompilation can be quadratic, membership/value comparison still scans the tree. Shared nodes and overlapping enabled trees are rejected. Next: final-head PR CI and independent review. No merge, publication, version bump, tag or branch deletion.

## PERF-01 — 2026-10-21

Branch `feature/v2.3.0-performance`, base master `7d9a13b` (PR #25), package **2.2.0**. [EN/RU performance report](../roadmap/v2.3.0/PERFORMANCE.md) retains raw before/after data: unchanged 1000-field snapshot **6.4259 → 1.3986 ms**, observed field write **7.5920 → 2.7286 ms**, 1000-form add/remove **297.7387 → 13.4752 ms**. Local gates: **606 tests / 31 files**, lint, source/test/demo types, library/demo builds, package (21 files), audit 0 and diff checks pass. Public behavior and external-edit discovery remain; reads still probe descendants, validation remains full, warmed heap is higher. Next: final-head PR CI and review. No merge, publication, version bump, tag or branch removal.

## STAB-01/02 + HF-011/012 foundation — 2026-10-20

Branch `feature/v2.3.0-foundation`, based on master `9942aac`; package remains **2.2.0**. STAB-01: **54 → 0** test type diagnostics, regression type tests and CI gate. STAB-02: reproducible Node benchmarks and deterministic subscription lifetime tests; large observed 1000-item add/remove remains expensive (about 164/245 ms in the foundation rerun). HF-011: weak object-keyed identity, optional snapshot itemIds, insert/move, no value matching in replacement setters. HF-012: **specification only**, no dependency engine or Proxy; owner decisions remain before HF-013.

Stage commits: STAB-01 `51dc501`, STAB-02 `b3974fe`, HF-011 `23b88bc`; HF-012 is the accompanying documentation commit. Local final gates: **591 tests / 30 files**, lint, source/test/demo types, library/demo builds, package contents (21 files), audit 0 and diff checks passed. Built ESM/CJS declaration consumers and isolated packed core without Luxon passed. Matching Luxon loaders pass; pre-existing cross-loader instanceof limitation is documented. Registry preflight with the cloud proxy confirms published 2.2.0 is skipped. See [milestone](../roadmap/v2.3.0/PLAN.md), [verification](../roadmap/v2.3.0/VERIFICATION.md), [benchmarks](../roadmap/v2.3.0/BENCHMARKS.md), [identity](HEADLESS_COLLECTION_IDENTITY.md), [dependency proposal](HEADLESS_DEPENDENCIES.md).

Next: inspect final-head CI and independently review the single integration PR, then resolve HF-012 owner gates. Identity metadata makes equal-content reorder/replacement snapshot-visible; dirty remains content-based. Existing touched/reset/commitBaseline, setters, JSON/FormData and optional Luxon remain. No HF-004/HF-013+, version bump, npm publication, merge, tag, release or branch removal. CI/PR URL and final SHA are recorded in the delivery report; this local handoff does not pre-claim remote checks. Historical entries below describe earlier source states.

## Published 2.2.0 demo refresh — 2026-10-19

- The live GitHub Pages playground was previously built from 2.2.0 source but still displayed 2.1.0 branding. The dedicated demo PR updates the brand, metadata and footer to **published 2.2.0** and adds an interactive Form state lab for dirty/baseline, subscriptions, immutable snapshots and synchronous batch notifications.
- The EN/RU demo guide and translations are updated. `.github/workflows/deploy-demo.yml` now deploys automatically from **master only**, so the preserved historical `v2.1.0` branch cannot overwrite the live site. Demo still imports source `../src/index`, with no new runtime or API changes.
- PR CI confirms 566 tests across 27 files, lint, TypeScript, package/demo builds and audit 0; actual GitHub Pages deployment must be confirmed after merge. Current npm `adaptform@2.2.0` remains published and is not re-released by the demo changes. Existing 54 separate test-tsconfig diagnostics are outside scope.

## Verified npm publication 2.2.0 — 2026-10-19

- **Published**: `adaptform@2.2.0` in the npm registry via the OIDC Trusted Publisher connection `ArhiMEN/AdaptForm` / `publish-npm.yml`. Exact-version registry lookup confirmed it. [GitHub Actions #39209185356 (rerun)](https://github.com/ArhiMEN/AdaptForm/actions/runs/39209185356) completed successfully: build, package check and `npm publish` PASS; logs confirm `+ adaptform@2.2.0`, dist-tag `latest`, signed provenance ([Sigstore entry](https://search.sigstore.dev/?logIndex=3319507230)). Initial attempts failed on missing dist (fixed PR #21) and ENEEDAUTH before Trusted Publisher registration (PR #22 removed token placeholder). The successful rerun used the saved npm connection without tokens.
- **Current setup:** GitHub repository variable `NPM_PUBLISH_ENABLED=true` (confirmed operational by successful publish job), master push CI success gates publication; preflight skips versions already published. npm can take a few minutes to refresh its `latest` display. No GitHub Release, tag or branch deletion.
- Docs and release notes updated in bilingual PR following the successful publication. Existing 54 test-tsconfig diagnostics and performance assessment remain separate debt.

## 2.2.0 source accepted in master — 2026-10-19

- [Release PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18) was independently reviewed and **squash-merged** as `f717b8d590d1b753d5958b2ba19aa1b3e3aeef0a`. `package.json` and the lockfile root both declare **2.2.0**; CHANGELOG, README, context and release documents are aligned in English/Russian. No production code, dependency or publishing workflow changes were made in PR #18.
- Candidate [CI #39198931542](https://github.com/ArhiMEN/AdaptForm/actions/runs/39198931542) and GitGuardian PASS: **563/563 tests**, 27 files, lint, source/demo type check, ESM/CJS/declarations builds, package check, demo build, npm audit 0. Post-merge [master CI #39199058088](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058088) PASS; [demo #39199058150](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058150) PASS; [npm publish #39199123153](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199123153) **SKIPPED**.
- [Release checklist](../roadmap/v2.2.0/RELEASE.md) records closed source checks, continued unpublished npm status and technical debt: 54 prior test-tsconfig diagnostics, no snapshot benchmark, HF-004/reinitialize/HF-011+ excluded. Next work requires a separate decision (npm publication or a subsequent HF track). Preserve branches; no tag or GitHub Release.

## AdaptForm 2.2.0 candidate preparation — 2026-10-19

- **Release-preparation branch:** `release/v2.2.0-preparation`, based on accepted HF-005–HF-010 master. `package.json` and both root versions in `package-lock.json` are being set to **2.2.0**; no runtime/API changes or dependency upgrades. `2.2.0` remains **unpublished to npm**, and the latest independently verified npm `latest` was 2.1.0.
- **Release documents:** bilingual README, CHANGELOG, [release checklist](../roadmap/v2.2.0/RELEASE.md), state usage/contract and roadmap/planning are being synchronized. Existing accepted HF-005–HF-010 CI: **563 tests in 27 files**, lint, TypeScript, ESM/CJS/DTS and demo builds, audit 0. Candidate PR and CI require independent verification before merging.
- **Limitations:** 54 older `tsconfig.test.json` diagnostics persist; baseline reset remains distinct from commitBaseline, snapshot capture performance was not benchmarked, no `reinitialize()`, HF-004 or HF-011+. Do not tag, create GitHub Release, publish npm or change publication settings; check publish workflow outcome after master merge.

## HF-005–HF-010 accepted — 2026-10-19

- After independent review and the HF-009 repair, [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) was **squash-merged to master** as `e6b596de5eceecf2c235000f3d683d4a745cb44e`. Branch preserved.
- Final PR head `1db4ab5`: 563/563 tests, 27 files, lint, source/demo type checks, ESM/CJS/TS build, package checks, audit (0), GitGuardian PASS. Post-merge [master CI #39197203071](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203071) and [demo deployment #39197203110](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203110) PASS. [npm publish workflow #39197250143](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197250143) SKIPPED.
- HF-005–HF-010 accepted: baseline/dirty, subscriptions/snapshots, batch, nested notifications. Manifest version remains **2.1.1**; 2.2.0 not released to npm. Next step is a **separate release 2.2.0 preparation decision**, not automatic HF-011. HF-004/reset and reinitialize remain excluded; 54 prior test-tsconfig diagnostics persist.

**Исторический отчёт до приёмки / Historical pre-acceptance handoff:**

Integration [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) is open against master; branch pushed. [Live checks](https://github.com/ArhiMEN/AdaptForm/pull/16/checks) are authoritative for the final head. No merge or publication performed.

Implementation CI passed on `e067a34`: [run #39153919017](https://github.com/ArhiMEN/AdaptForm/actions/runs/39153919017); GitGuardian passed. These are historical checks; current head results remain visible in the PR.

## PR #16 review repair — 2026-10-19

- `ArrayField` and `ArrayFormField` now route automatic `remove()`/`clear()` checks through `validateAfterMutation()`. Batch finalization uses the owning Form context once; synchronous validation outside batch and explicit `checkValid()` are preserved.
- Added `tests/unit/headless-collection-batch.test.ts`: **34 passing cases**, including collection-only/sibling writes, nested ownership/batches, callback exceptions/recovery, explicit checks, deduplication and atomic notifications.
- Latest local checks: **563 tests passed in 27 files**; lint, source/demo typecheck, library/demo build, package check (21 files), audit (0 vulnerabilities), demo output and diff checks passed.
- `tsconfig.test.json` still exits 2 with **54 existing diagnostics**. Compared against an untouched archive of `33717f2` with the same dependencies: normalized file/position/code sequence and multiplicities match; no new diagnostics. The three known structural-message differences remain. No tests or checks disabled.
- Required next action: inspect CI/GitGuardian for the pushed repair head and re-review the HF-009 fix in the existing PR. The other HF-005–HF-010 contracts, package 2.1.1, dependencies and reset behavior are unchanged. HF-011 was not started; no new PR or merge.

## HF-005–HF-010 foundation — 2026-10-18

**All six tasks implemented; independent review found an HF-009 blocker, now fixed locally pending re-review.** One approved integration branch: `feature/v2.2.0-headless-state-foundation`, based on master `33717f2a88f04a3ad9c454b0477e52b299147432`. Package version stays **2.1.1**; manifests/dependencies unchanged. No merge, branch removal, tag, release or npm publication.

- [Contract EN/RU](HEADLESS_STATE_CONTRACT.md): lifecycle, baseline/reset, touched/dirty, compatibility and deferred reinitialize proposal.
- [Usage EN/RU](HEADLESS_STATE_USAGE.md): subscriptions, snapshot data representations, batch validation/exception policy and limits.
- [Verification EN/RU](../roadmap/v2.2.0/VERIFICATION.md): exact checks and per-stage journal; [2.2.0 plan](../roadmap/v2.2.0/PLAN.md) records remaining release gates.

| Task | Commit | Result |
| --- | --- | --- |
| HF-005 | `6cd1b11` | State lifecycle and 2.1.1 compatibility contract |
| HF-006 | `79f0345` | Field cleaned baseline, isDirty and commitBaseline |
| HF-007 | `0df2b02` | Derived Form/collection dirty, hydration baselines |
| HF-008 | `b9ed34a` | Shared ObservableNode, frozen snapshots, subscriptions |
| HF-009 | `297bd47` | Nested sync batches, final validation, exception finalization |
| HF-010 | `7883269` | Child propagation, detach/last-unsubscribe cleanup, reentrant delivery |
| Hardening | `c81575b` | Shared built-in/sparse captures and additional exception/async regressions |

Final review also verifies symmetric structural comparison across shared-reference topologies and server-error clearing notifications for empty nested forms. Each implementation stage passed focused tests, lint and source typecheck before commit. Foundation checks on 2026-10-18: **529 tests passed (26 files, 52 added cases)**; lint, source typecheck, library build, package check (21 files), demo typecheck/build, audit (0 vulnerabilities), ESM/CJS runtime smoke and new API declaration consumers passed. `git diff --check` passed.

`tsconfig.test.json` **still fails with 54 baseline diagnostics**. File/position/code/multiplicity sequence matches untouched master; three old structural diagnostics list more missing Form members due to additive methods. A separate consumer of the legacy `fieldsValue` mapped type also triggers TS2589 on both this branch and a separately built untouched master archive. New snapshot/subscription/batch declaration consumers pass in strict NodeNext ESM/CJS. No type checks or tests disabled.

## Architecture and compatibility

Field owns cached cleaned values and detached baselines. Form derives dirty from nodes; collections compare ordered cleaned content and child dirty. Shared synchronous mutation scheduling updates all affected snapshots before external callbacks. Parent links activate on subscription and reconcile membership; removal/last unsubscribe releases them. Batch defers automatic validation to one participating ancestor check; explicit validators remain immediate. Exceptions retain completed writes, finalize, then propagate. Callback failures take precedence over finalization failures.

Legacy touched (including setRawValue(value, false)), validity/errors, constructor/plugin behavior, reset membership/targets, serialization and optional Luxon remain. `allErrors` copies child arrays to prevent read-time accumulation or freezing of live errors during snapshot capture. No UI dependencies.

Limits: snapshot values use a safe immutable data union, arbitrary classes are opaque; snapshots recapture/compare and nested/batch containment work can exceed one linear traversal. External in-place legacy array/value/options edits and arbitrary Form-property replacement are not automatically intercepted. Nested ownership uses existing ArrayFormField; cyclic model ownership/mutating validators unsupported. Deterministic tests verify link cleanup and removed-node isolation; no universal GC or benchmark claim.

HF-004 and HF-011+ were not implemented. `reinitialize` is a proposal only. Owner decisions: independent review by commit, acceptance of the documented additive snapshot/batch boundaries, separate handling of existing typing debt, then a separately authorized release candidate. Never auto-start later tasks or merge/publish.

## Prior baseline

HF-001, HF-002 ([PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10)) and HF-003 ([PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12)) were accepted. 2.1.1 source preparation was merged in [PR #14](https://github.com/ArhiMEN/AdaptForm/pull/14); its npm publish job skipped. This work makes no new registry-publication claim. Target 2.2.0 planning entered master through PR #15; this task explicitly authorized the combined implementation, without release authorization.
