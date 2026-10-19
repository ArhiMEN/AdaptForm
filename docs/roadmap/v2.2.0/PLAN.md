# AdaptForm 2.2.0 — headless state foundation

[English](PLAN.md) · [Русский](PLAN.ru.md)

**HF-005–HF-010 implemented; independent review, integration CI and release preparation remain required.** Target version is 2.2.0; package manifests remain 2.1.1. No release or npm publication performed.

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

- [x] Implement HF-005–HF-010 with bilingual documentation and focused regressions.
- [ ] Independent review by commit and integration PR acceptance.
- [ ] Verify CI/GitGuardian on the final integration commit.
- [ ] Separate release-candidate review, packaging/documentation and version decision.
- [ ] Address or explicitly track the existing 54 exploratory test typecheck diagnostics; no new diagnostic locations/codes permitted here.
- [ ] Authorize version bump, tags/releases and npm publication separately. No automatic merge.
