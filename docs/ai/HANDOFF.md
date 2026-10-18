# Handoff

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

Integration [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) is open against master; branch pushed. [Live checks](https://github.com/ArhiMEN/AdaptForm/pull/16/checks) are authoritative for the final head. No merge or publication performed.

## HF-005–HF-010 foundation — 2026-10-18

**All six tasks implemented, pending independent review and integration CI.** One approved integration branch: `feature/v2.2.0-headless-state-foundation`, based on master `33717f2a88f04a3ad9c454b0477e52b299147432`. Package version stays **2.1.1**; manifests/dependencies unchanged. No merge, branch removal, tag, release or npm publication.

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

Final equality review also verifies symmetric structural comparison when shared-reference topology changes. Each implementation stage passed focused tests, lint and source typecheck before commit. Final checks: **528 tests passed (26 files, 51 added cases)**; lint, source typecheck, library build, package check (21 files), demo typecheck/build, audit (0 vulnerabilities), ESM/CJS runtime smoke and new API declaration consumers passed. `git diff --check` passed.

`tsconfig.test.json` **still fails with 54 baseline diagnostics**. File/position/code/multiplicity sequence matches untouched master; three old structural diagnostics list more missing Form members due to additive methods. A separate consumer of the legacy `fieldsValue` mapped type also triggers TS2589 on both this branch and a separately built untouched master archive. New snapshot/subscription/batch declaration consumers pass in strict NodeNext ESM/CJS. No type checks or tests disabled.

## Architecture and compatibility

Field owns cached cleaned values and detached baselines. Form derives dirty from nodes; collections compare ordered cleaned content and child dirty. Shared synchronous mutation scheduling updates all affected snapshots before external callbacks. Parent links activate on subscription and reconcile membership; removal/last unsubscribe releases them. Batch defers automatic validation to one participating ancestor check; explicit validators remain immediate. Exceptions retain completed writes, finalize, then propagate. Callback failures take precedence over finalization failures.

Legacy touched (including setRawValue(value, false)), validity/errors, constructor/plugin behavior, reset membership/targets, serialization and optional Luxon remain. `allErrors` copies child arrays to prevent read-time accumulation or freezing of live errors during snapshot capture. No UI dependencies.

Limits: snapshot values use a safe immutable data union, arbitrary classes are opaque; snapshots recapture/compare and nested/batch containment work can exceed one linear traversal. External in-place legacy array/value/options edits and arbitrary Form-property replacement are not automatically intercepted. Nested ownership uses existing ArrayFormField; cyclic model ownership/mutating validators unsupported. Deterministic tests verify link cleanup and removed-node isolation; no universal GC or benchmark claim.

HF-004 and HF-011+ were not implemented. `reinitialize` is a proposal only. Owner decisions: independent review by commit, acceptance of the documented additive snapshot/batch boundaries, separate handling of existing typing debt, then a separately authorized release candidate. Never auto-start later tasks or merge/publish.

## Prior baseline

HF-001, HF-002 ([PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10)) and HF-003 ([PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12)) were accepted. 2.1.1 source preparation was merged in [PR #14](https://github.com/ArhiMEN/AdaptForm/pull/14); its npm publish job skipped. This work makes no new registry-publication claim. Target 2.2.0 planning entered master through PR #15; this task explicitly authorized the combined implementation, without release authorization.
