# Backlog

[English](BACKLOG.md) · [Русский](BACKLOG.ru.md)

All items below are **proposals, not approved implementation tasks**. No priority, target version, or delivery date is assigned.

| Proposal | Before implementation |
| --- | --- |
| Explore a framework adapter | Owner discussion in ChatGPT, selection of a framework and lifecycle boundary, then separate scope approval for Codex Cloud. |

No other improvements are specified by this foundation task. Add only concrete project proposals; promote one to implementation only after explicit approval, recording the scope in [DECISIONS](DECISIONS.md). Do not infer defects or commitments from this list.

## Proposed headless engine track

- Direction B was selected in ChatGPT on 2026-10-17. The [Headless Engine roadmap](HEADLESS_ROADMAP.md) splits the work into **HF-001 through HF-020** with prerequisites and acceptance criteria. This is not approval of implementation or any release.
- **HF-001 completed** in [PR #8](https://github.com/ArhiMEN/AdaptForm/pull/8): 34 characterization tests, no production code changes, CI passed. See [HANDOFF](HANDOFF.md). **HF-002 completed** in [PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10): 416 tests passed in CI, deferred `ArrayField` assignment fixed, existing APIs preserved. **HF-003 completed** in [PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12): final validation rejects incomplete decimals, CI and GitGuardian passed; no release/version changes. Next release-planning track is **2.2.0** ([scope and gates](../roadmap/v2.2.0/PLAN.md)), with **HF-005–HF-010** for headless state, snapshots and batching. **HF-005 is specification-only** and requires explicit review of state semantics before implementation. **HF-004** (collection reset) remains a separate unresolved behavior decision, not auto-included in 2.2.0.
- Owners approve one task at a time before Codex Cloud work. Do not auto-advance.
