# HF-005–HF-010 verification

[English](VERIFICATION.md) · [Русский](VERIFICATION.ru.md)

Latest local verification on 2026-10-19 after the PR #16 review fix. Base: master `33717f2a88f04a3ad9c454b0477e52b299147432`. Package version remains 2.1.1; manifests and dependencies unchanged.

| Check | Result |
| --- | --- |
| Base npm test | 477 passed, 21 files |
| Final npm test | **563 passed, 27 files** (86 regressions since base; 34 for this review fix) |
| npm run lint | Passed |
| npx tsc --noEmit -p tsconfig.json | Passed |
| npm run build | Passed: ESM, CJS and declarations |
| npm run check:package | Passed: 21 files, required entry points/declarations |
| npm run check:demo | Passed |
| npm run build:demo | Passed |
| npm audit --audit-level=moderate | Passed: 0 vulnerabilities |
| git diff --check | Passed |
| npx tsc --noEmit -p tsconfig.test.json | **Fails: 54 existing diagnostics**; locations, codes and multiplicities match base; no new diagnostics |
| Built ESM/CJS runtime smoke (foundation check, 2026-10-18; not rerun for this fix) | Passed: subscribe/batch/dirty/baseline, detach, both optional Luxon entries |
| Built ESM/CJS TypeScript consumers (foundation check, 2026-10-18; not rerun for this fix) | New snapshot/subscription/batch APIs passed; readonly/async rejection checked |

Exploratory test diagnostics have the same file/line/column/code sequence as base. Three old structural errors now list additional missing Form members because the API grew; the diagnostic locations/codes did not change. This check is not claimed passing.

A broader declaration smoke additionally reads the legacy `form.fieldsValue.name`; it fails with TS2589. The same minimal consumer was built and checked against a detached archive of untouched master and fails with the same TS2589. This pre-existing mapped-type recursion is not fixed here. Source typecheck, new API declaration checks and runtime serialization pass.

Integration CI and GitGuardian passed on implementation commit `e067a34`: [CI run](https://github.com/ArhiMEN/AdaptForm/actions/runs/39153919017). These are historical results; inspect the PR checks for the current review-fix head.

## PR #16 independent review fix — 2026-10-19

The review found that `remove()` and `clear()` in both `ArrayField` and `ArrayFormField` called `checkValid()` directly. All four automatic checks now use the existing `validateAfterMutation(() => this.checkValid())` path. Inside batch, the participating ancestor validates once after all writes, with the current owning Form context; outside batch, checks remain synchronous without introducing parent context. Explicit `checkValid()` remains immediate. No other HF-005–HF-010 contract, reset behavior, package version or dependency changed; HF-011 was not started.

`tests/unit/headless-collection-batch.test.ts` adds **34 cases**, covering both collections and both operations: collection-only batches, sibling writes, nested batches, direct/nested callback exceptions and recovery, explicit checks, synchronous checks outside batch, nested Form ownership, and repeated remove/clear requests. Assertions cover collection/required/descendant/sibling validation counts, owning context, committed snapshots during batch, no intermediate notifications and one final notification per changed node. The initial 30-case regression run reproduced the defect in 26 cases; four outside-batch cases already passed. The completed 34-case suite passes, as does the full 563-case suite.

All required local checks in the table were rerun for this fix. For `tsconfig.test.json`, an untouched `git archive` of master `33717f2` used the same installed dependencies. After normalizing checkout path prefixes, all 54 diagnostic file/line/column/code signatures and multiplicities match, with no additions or removals. The three previously documented structural-message differences remain; this check still exits with code 2. No suppression, disabled test or compiler configuration change was added.

## Regression coverage and stage journal

| Stage | Evidence |
| --- | --- |
| HF-005 | EN/RU lifecycle contract and compatibility table; documentation diff check |
| HF-006 | 41 focused Field tests; cast/validation counts, null/defaults, Dates/Luxon/plugins, structured cycles, commit/reset |
| HF-007 | 135 aggregate/collection/lifecycle tests; final focused rerun 26; hydrated baselines, direct children, add/remove/order and reset |
| HF-008 | 8 subscription regressions; full suite then 503; stable references, immutable errors/values, duplicate registrations, unsubscribe and listener failure |
| HF-009 | 10 initial batch regressions; 58 combined lifecycle/subscription/batch tests; nested batches, complete conditional validation, exceptions and explicit checks |
| HF-010 | 29 combined reactive regressions; full suite then 524; deep propagation, removal/replacement, shared children, retention links and reentrant writes |
| Final hardening | 3 further regressions; full suite **527**; shared built-in captures/sparse arrays, async callback rejection, competing callback/validation/listener errors |

Final structural review adds one more regression: shared versus independent equal nested references compare symmetrically. All required local checks rerun; full suite **528**, same 54 baseline type diagnostics, built ESM/CJS equality smoke passed.

Final ownership review additionally covers parent-driven clearing of global errors on an empty child Form: its own subscribers must be notified. Recursive error clearing now enters the shared mutation boundary. All required checks rerun; full suite **529** and the same 54 baseline test diagnostics.

Every implementation stage ran lint and source typecheck successfully before its commit. Test typecheck stayed at the baseline's 54 diagnostics. No tests/checks were disabled. The foundation added five test files with 52 cases; the review fix adds a sixth file with 34 cases (86 total). Values in tests are synthetic.

## Limits and next action

No measured performance benchmark or universal GC leak proof: nested snapshots recapture and compare, batch validation checks participating roots, and cost grows with values/nesting. Tests deterministically verify parent-link cleanup and removed-child isolation. Snapshots deliberately use a data union and opaque descriptions for unsupported classes. Existing legacy in-place mutations are not automatically intercepted. See [usage](../../ai/HEADLESS_STATE_USAGE.md).

Delivery: branch pushed and [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) opened against master. Inspect [live CI/GitGuardian checks](https://github.com/ArhiMEN/AdaptForm/pull/16/checks) on the final head, then independently review by commit. No merge, version bump, release, tag or npm publication is authorized. HF-004 and HF-011+ remain excluded.
