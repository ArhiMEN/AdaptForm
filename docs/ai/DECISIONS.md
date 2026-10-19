# Decisions

[English](DECISIONS.md) · [Русский](DECISIONS.ru.md)

## Accepted process — 2026-10-17

- The owner discusses architecture and improvements in ChatGPT. Implementation happens through Codex Cloud only after separate explicit approval of the task and scope. Discussion, a backlog entry, or a skill does not authorize implementation.
- This task authorizes only the AI agent foundation: skills, project context documents, and minimal AGENTS additions. It authorizes no library, test, dependency, package-version, or framework-adapter changes.
- Keep public contracts and existing repository safety rules. Load skills selectively; use the smallest useful checks.
- Store only public, project-relevant outcomes. Never copy personal data, private conversations, secrets, tokens, or internal closed information into files, commits, or PRs.

## Release baseline

Version 2.1.0 was published on 2026-10-14. Future improvements are proposals; no next version, release date, framework, or implementation plan is approved here.

For later decisions, append a short dated outcome, rationale, approved scope, and public approval reference when available. Do not paste discussion transcripts. Keep the Russian companion aligned.

## Selected direction — 2026-10-17

- **Approved product direction:** AdaptForm evolves toward a framework-agnostic, class-based **headless form engine** (direction B). The core remains independent of UI libraries; optional adapters may be considered later.
- **Not approved by this direction alone:** code changes, specific new public APIs, versions, release dates, semantic migrations or framework dependencies. The 20 [roadmap tasks](HEADLESS_ROADMAP.md) are proposals with task-specific decision gates.
- Architecture is discussed in ChatGPT; Codex Cloud executes only separately scoped and approved changes. Keep this decision record free of private chat transcripts.

## HF-003 decimal input policy — 2026-10-17

- Approved scope: repair incomplete-decimal validation while preserving the existing Field/Form lifecycle and serialization contracts.
- Trailing-separator strings such as `123.`, `0.`, `-123.` and normalized `123,` remain editable: raw input is retained and casting still returns a normalized string. Every explicit validation rejects them as a format error, with or without numeric bounds, using `messages.invalid` or the existing default message for an empty decimal part.
- Completed values retain `gt`/`ge`/`lt`/`le`, precision and digit limits, negative-number support and numeric input behavior. Excess precision is rejected without rounding.
- Deferred assignment remains available through `setRawValue(value, false)` and `setFields(data, false)`. Applications must run `checkAndSetValid()` or `Form.checkValid()` before relying on final validity; `toJSON()` serializes without validating.
- Compatibility impact: incomplete decimals previously accepted by validation now fail intentionally. Public types and payload representations remain unchanged. Error display triggers, new parsing states, collection reset and touched semantics remain separate tasks. HF-003 completion requires successful checks, independent review and PR acceptance.

## Patch release preparation 2.1.1 — 2026-10-17

- **Approved preparation scope:** release candidate `adaptform@2.1.1` includes accepted HF-002 and HF-003 fixes and HF-001 characterization tests, plus aligned package metadata, changelog, README and release checks. HF-004 onward and headless engine API work remain excluded.
- This approval authorizes **preparation only**, not npm publication, enabling automated npm publishing, GitHub releases/tags or deleting branches. The publish workflow may run after a successful `master` push if `NPM_PUBLISH_ENABLED=true`; do not merge a version bump until that switch is verified disabled or publication is independently authorized.
- Release checklist and known compatibility change (trailing-dot decimals now fail explicit validation) are tracked in [2.1.1 release preparation](../roadmap/v2.1.1/RELEASE.md).

## 2.2.0 planning direction — 2026-10-17

- The proposed **2.2.0** feature milestone is a class-based, framework-independent headless state foundation: HF-005–HF-010 (state contract, dirty/baseline, aggregate Form state, subscriptions/snapshots, batch, nested propagation).
- This is **planning**, not advance approval to modify code, change public state semantics, create a tag or publish. [Scope and gates](../roadmap/v2.2.0/PLAN.md) define the next specification-only HF-005 task and explicit decision boundaries.
- HF-004 (resetting collection membership) is an unresolved compatibility decision and is not automatically included in 2.2.0. The 2.1.1 source was merged in PR #14; automatic npm publication skipped, and registry `latest` remained 2.1.0 at the latest check.

## HF-005–HF-010 combined implementation — 2026-10-18

Approved scope: implement the headless state foundation sequentially in one feature branch with reviewable commits and one integration PR. Preserve 2.1.1 touched, reset membership/targets, validation outside explicit batch, serialization and optional Luxon. Add cleaned baselines/dirty, data-only immutable snapshots, shared subscriptions, synchronous batches with deferred automatic final validation and no rollback on exceptions, and nested ownership cleanup. [Contract](HEADLESS_STATE_CONTRACT.md) and [usage](HEADLESS_STATE_USAGE.md) define the minimal additive API. Reinitialize is a proposal only; HF-004/HF-011+ and release work are excluded. No version bump, merge, tag, npm publication or branch removal.

## 2.2.0 source release preparation — 2026-10-19

- **Source candidate scope:** HF-005–HF-010 were accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); [PR #17](https://github.com/ArhiMEN/AdaptForm/pull/17) synchronized the EN/RU roadmap. No HF-004/reset-membership changes or HF-011+ features are part of the 2.2.0 release candidate.
- The owner requested the completed version's documentation and remaining preparation. Package manifest and root lockfile move from 2.1.1 to **2.2.0** in the dedicated release-preparation branch; README, changelog, state usage and the bilingual [release checklist](../roadmap/v2.2.0/RELEASE.md) must match. Keep ESM/CJS/TS/Luxon and serialization contracts.
- **Scope is source preparation and reviewed GitHub integration only:** no npm publish, GitHub Release, tag, publishing-credential change or automatic approval of HF-011. Last independently checked npm `latest` was 2.1.0; historically master publish jobs were skipped. Record actual PR/master CI and publishing workflow outcomes without claiming npm availability.
