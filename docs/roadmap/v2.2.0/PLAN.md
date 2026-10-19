# AdaptForm 2.2.0 — headless state foundation

[English](PLAN.md) · [Русский](PLAN.ru.md)

**HF-005–HF-010 accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16), and the 2.2.0 source release candidate accepted in [PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18).** Master manifest and lockfile declare 2.2.0; **[adaptform@2.2.0 was published to npm](https://www.npmjs.com/package/adaptform/v/2.2.0)** via OIDC Trusted Publisher on 2026-10-19. No Git tag or GitHub Release was created. See [release checklist](RELEASE.md).

| Task | Actual deliverable | Status |
| --- | --- | --- |
| HF-005 | [State lifecycle/compatibility contract](../../ai/HEADLESS_STATE_CONTRACT.md) in EN/RU | Implemented |
| HF-006 | Cleaned Field baseline, semantic comparison, isDirty, commitBaseline | Implemented with regressions |
| HF-007 | Derived Form dirty and ordered collection content/descendant dirty | Implemented with regressions |
| HF-008 | Shared synchronous observer infrastructure and frozen detached snapshots | Implemented with regressions |
| HF-009 | Nested synchronous batches, final automatic validation, exception finalization | Implemented with regressions |
| HF-010 | Child propagation, membership reconciliation, last-observer cleanup | Implemented with regressions |

The explicitly approved combined scope uses `feature/v2.2.0-headless-state-foundation` based on master `33717f2`, sequential reviewable commits and one integration PR. This replaces the earlier specification-only / separate-PR gates for these six tasks only. [Handoff](../../ai/HANDOFF.md) records actual checks and remaining constraints. [Usage](../../ai/HEADLESS_STATE_USAGE.md) describes the API boundary.

Compatibility retains class construction, plugins/validators, rawValue/valueClear, setRawValue/setFields (including touched on deferred writes), validity/errors, reset targets/membership, serialization and optional Luxon. allErrors now copies child error arrays, preventing read-time accumulation or freezing of live errors during snapshot capture.

## Deferred and excluded

HF-004 reset membership and HF-011+ remain outside scope. No reinitialize method, stable collection IDs, dependency graph, async validation, submission or UI adapter is implemented. Snapshots use a safe data union and immutable descriptions for built-ins; arbitrary class values are opaque. External in-place mutations and arbitrary Form property replacement are not automatically observed. Nested Form ownership uses ArrayFormField. See the contract for baseline/reset and final batch validation details.

## Remaining release gates

After merge, [master CI #39197203071](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203071) and [demo #39197203110](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203110) passed; [npm publish #39197250143](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197250143) was skipped. The **2.2.0** source candidate was merged; [master CI #39199058088](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058088) PASS, [npm publication #39199123153](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199123153) SKIPPED. The separately authorized npm publication was later completed ([successful workflow](https://github.com/ArhiMEN/AdaptForm/actions/runs/39209185356)).



- [x] Implement HF-005–HF-010 with bilingual documentation and focused regressions.
- [x] Independent review by commit and integration PR acceptance; PR #16 squash merge `e6b596de5eceecf2c235000f3d683d4a745cb44e`.
- [x] Verify CI/GitGuardian on the final integration PR head `1db4ab5f1fe2ace394baf925bdab3d9b475796d3` (563 tests); post-merge master CI tracked separately.
- [x] Independently review [PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18): version metadata, bilingual docs and package exports; candidate CI/GitGuardian PASS; master CI PASS, npm publish skipped.
- [ ] Address or explicitly track the existing 54 exploratory test typecheck diagnostics; no new diagnostic locations/codes permitted here.
- [x] The 2.2.0 version bump and npm publication were independently authorized and completed using Trusted Publisher; no Git tag or GitHub Release was requested or created.
