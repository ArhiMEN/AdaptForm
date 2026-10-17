# AdaptForm 2.2.0 — headless state foundation plan

[English](PLAN.md) · [Русский](PLAN.ru.md)

**Status: planned, not implemented or published.** Version 2.2.0 is a target, not the current package version. Version 2.1.1 metadata was merged into `master` in [PR #14](https://github.com/ArhiMEN/AdaptForm/pull/14); npm publication was not executed by GitHub Actions (publish job skipped). Check the registry before any future claims about the latest published version.

## Release goal

Deliver the first coherent **framework-independent, class-based headless form state engine** on top of `Form` and `Field`, without requiring React/Vue/Electron or changing serialization formats. This release is about state, subscriptions and atomic notifications, **not** async validators, submission orchestration, dependency graphs or UI adapters.

## Target workstream

| Order | Task | Deliverable | Decision boundary |
| --- | --- | --- | --- |
| 1 | [HF-005](../../ai/HEADLESS_ROADMAP.md) | Field/Form state transition and compatibility **specification only**, no production code | Approve semantics of baseline, touched, dirty, validity, programmatic updates and reinitialize |
| 2 | HF-006 | Baseline and dirty tracking for Field, with deterministic reset/edit/revert rules | Explicit API and migration approval after HF-005 |
| 3 | HF-007 | Aggregated Form state and nested change accounting | Preserve 2.1.x `isValid` contract |
| 4 | HF-008 | Small framework-independent subscription and stable snapshot interface | Approve public API shape before implementing |
| 5 | HF-009 | Atomic sync batching, consistent final snapshots and documented exception handling | Approve batch/exception policy |
| 6 | HF-010 | Propagation and correct unsubscribe/dispose for nested Field/Form/collections | Avoid duplicate notifications and detached-node leaks |

Each HF item is an independent, reviewable Codex Cloud PR with focused tests and bilingual documentation. Acceptance gates and dependencies remain authoritative in [HEADLESS_ROADMAP.md](../../ai/HEADLESS_ROADMAP.md). Completing HF-005 **does not** authorize implementation of HF-006.

## Deliberate exclusions

- HF-004 (resetting collection *membership, order and hydration baseline*) is a **separate, unresolved behavior decision** and not implicitly part of 2.2.0. Existing `reset()` behavior must remain stable until approved. This may be revisited after baseline design or deferred to a compatibility-breaking release.
- HF-011–HF-020 (stable collection IDs, validation dependencies, error presentation, structured errors, async checks, submission lifecycle, Vue adapter, final benchmarks) are out of scope and should be assigned to later releases only after compatibility review.
- No new required runtime dependencies, no mandatory observable framework, no independent validation truth duplicated between Form and Field, no transport/network ownership and no PlayLease integration.
- The existing 54 diagnostics in the exploratory `tsconfig.test.json` check need a separate tracked fix; never declare that check passing without an actual successful run.

## Compatibility principles (proposals, not yet decisions)

- Retain `Form`/`Field` class construction, synchronous validation, `setRawValue`, `setFields`, `errors`, `isValid`, `toJSON()`, `toFormData()` and optional `adaptform/luxon`.
- In 2.1.x, programmatic `Field.setRawValue(value, false)` still sets `isTouched=true`. Do not silently redefine it: HF-005 must explicitly decide whether to preserve legacy touched and how to expose independent `isDirty`/user-interaction state.
- Derived state and snapshots should be deterministic, immutable from the subscriber's perspective, stable when unchanged and updated only after the current mutation is committed.
- Keep parent/child notifications coherent for nested and dynamic collections. Rejected subscriptions cannot retain removed child nodes or expose values in logs.
- New functionality should be additive where possible. If a semantic migration is unavoidable, stop and propose a versioned compatibility plan before coding.

## Release gates

- [ ] HF-005 public state contract/compatibility approved in ChatGPT and documented in EN/RU.
- [ ] HF-006–HF-010 accepted via separate PRs, with targeted regressions and CI for each.
- [ ] Full test suite, lint, type checks, source+demo builds, ESM/CJS/TypeScript package checks, dependency audit and GitGuardian pass on the release candidate.
- [ ] Subscription stability, one-notification-per-batch, nested detach/disposal and absence of stale snapshot regressions demonstrated in deterministic tests.
- [ ] README, demo/examples, changelog and migration notes (if needed) updated in English and Russian.
- [ ] Release version bumped in both package manifest and lockfile **only during the later release-candidate task**; no npm publication, GitHub Release or tag without distinct permission.

## Next task

**HF-005 only:** prepare an EN/RU state contract table, contrast actual 2.1.x behavior with proposed 2.2.0 semantics, and surface any product choices. Do not implement state fields or change tests/source in HF-005. Work can begin from current `master` in a new task branch after approval of the exact spec-only scope.
