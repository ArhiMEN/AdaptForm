# HF-005–HF-010 verification

[English](VERIFICATION.md) · [Русский](VERIFICATION.ru.md)

Local verification on 2026-10-18. Base: master `33717f2a88f04a3ad9c454b0477e52b299147432`. Package version remains 2.1.1; manifests and dependencies unchanged.

| Check | Result |
| --- | --- |
| Base npm test | 477 passed, 21 files |
| Final npm test | **529 passed, 26 files** (52 new regressions) |
| npm run lint | Passed |
| npx tsc --noEmit -p tsconfig.json | Passed |
| npm run build | Passed: ESM, CJS and declarations |
| npm run check:package | Passed: 21 files, required entry points/declarations |
| npm run check:demo | Passed |
| npm run build:demo | Passed |
| npm audit --audit-level=moderate | Passed: 0 vulnerabilities |
| git diff --check | Passed |
| npx tsc --noEmit -p tsconfig.test.json | **Fails: 54 existing diagnostics**; locations, codes and multiplicities match base; no new diagnostics |
| Built ESM/CJS runtime smoke | Passed: subscribe/batch/dirty/baseline, detach, both optional Luxon entries |
| Built ESM/CJS TypeScript consumers (NodeNext, strict) | New snapshot/subscription/batch APIs passed; readonly/async rejection checked |

Exploratory test diagnostics have the same file/line/column/code sequence as base. Three old structural errors now list additional missing Form members because the API grew; the diagnostic locations/codes did not change. This check is not claimed passing.

A broader declaration smoke additionally reads the legacy `form.fieldsValue.name`; it fails with TS2589. The same minimal consumer was built and checked against a detached archive of untouched master and fails with the same TS2589. This pre-existing mapped-type recursion is not fixed here. Source typecheck, new API declaration checks and runtime serialization pass.

Integration CI and GitGuardian passed on implementation commit `e067a34`: [CI run](https://github.com/ArhiMEN/AdaptForm/actions/runs/39153919017). The final documentation-only head is checked separately in the PR.

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

Every implementation stage ran lint and source typecheck successfully before its commit. Test typecheck stayed at the baseline's 54 diagnostics. No tests/checks were disabled. Five new test files contain 52 cases. Values in tests are synthetic.

## Limits and next action

No measured performance benchmark or universal GC leak proof: nested snapshots recapture and compare, batch validation checks participating roots, and cost grows with values/nesting. Tests deterministically verify parent-link cleanup and removed-child isolation. Snapshots deliberately use a data union and opaque descriptions for unsupported classes. Existing legacy in-place mutations are not automatically intercepted. See [usage](../../ai/HEADLESS_STATE_USAGE.md).

Delivery: branch pushed and [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) opened against master. Inspect [live CI/GitGuardian checks](https://github.com/ArhiMEN/AdaptForm/pull/16/checks) on the final head, then independently review by commit. No merge, version bump, release, tag or npm publication is authorized. HF-004 and HF-011+ remain excluded.
