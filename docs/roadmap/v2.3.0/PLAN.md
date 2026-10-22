# AdaptForm 2.3.0 — foundation milestone

[English](PLAN.md) · [Русский](PLAN.ru.md)

Approved source scope on `feature/v2.3.0-foundation`, based on master `9942aac`. **Not a release candidate or npm publication.** Manifests and published version remain 2.2.0. One integration PR, no auto-merge, tags, release or branch removal.

| Stage | Source status | Evidence |
| --- | --- | --- |
| STAB-01 | Complete; 54 → 0 diagnostics | [Typing](TEST_TYPES.md), regression type tests and CI test typecheck |
| STAB-02 | Complete measurement/lifecycle scope; performance concerns deferred | [Benchmarks](BENCHMARKS.md), raw baseline/foundation JSON and lifecycle tests |
| HF-011 | Implemented, pending independent review | [Identity contract](../../ai/HEADLESS_COLLECTION_IDENTITY.md), insert/move/ordered snapshot IDs |
| HF-012 | Specification complete, owner decisions pending | [Dependency proposal](../../ai/HEADLESS_DEPENDENCIES.md); no engine code |

[Verification](VERIFICATION.md) records actual local checks and integration checks. Acceptance of this PR must not imply approval of the proposed HF-012 API. Owner gates include activation/disposal, missing/cyclic refs, opt-in purity and selective invalidation. Next safe work is independent review and those decisions; **do not start HF-013 automatically**.

Compatibility: existing replacement setters never match values; touched/reset/commitBaseline and JSON/FormData remain. Snapshot metadata gains optional itemIds and now observes equal-content identity changes; exact-key consumers must allow the addition. IDs are module-local, not domain identifiers. Factories should return distinct instances for distinct elements. Large observed collection updates remain expensive; profile before scheduler/cache redesign. Short GC samples do not prove absence of leaks.

HF-004 reset membership, reinitialize, HF-013+, UI/async/submission and release/version/publishing work are excluded. The unchanged automatic publication preflight reports published 2.2.0 and skips it; only an actual post-merge workflow can confirm its future outcome. Codex does not merge this PR.

## PERF-01 follow-up

The separately scoped performance task starts from accepted master `7d9a13b` (PR #25). [Results and limits](PERFORMANCE.md): unchanged snapshots 4.59×, observed single-field writes 2.78×, 1000-form add/remove 22.10× faster in same-host measurements; 606 tests pass. Version remains 2.2.0; HF-012 implementation and release work remain excluded.

## HF-013 follow-up

A separate explicit task authorizes the limited dependent-validation source implementation in `feature/v2.3.0-dependent-validation`, based on accepted master `30a45a2` (PERF-01, PR #26). It supersedes the historical HF-013 exclusion above for ordinary fields of one Form only. [API, examples and boundaries](../../ai/HEADLESS_DEPENDENCIES_USAGE.md): activation/disposal, literal one-property paths, deterministic selective checks and opt-in purity. The expanded HF-012 collection/direct-ref proposal is still excluded. Package stays 2.2.0; no merge, publication or branch deletion.
