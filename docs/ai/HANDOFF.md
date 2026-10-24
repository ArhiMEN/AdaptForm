# Handoff

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

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
