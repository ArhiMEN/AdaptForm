# AdaptForm: Headless Form Engine roadmap (draft)

[English](HEADLESS_ROADMAP.md) · [Русский](HEADLESS_ROADMAP.ru.md)

**Status: direction B (headless engine) selected; tasks below are a proposed decomposition, not blanket implementation approval.** Each code task needs separately approved scope via ChatGPT and runs only in Codex Cloud. No release version or date is committed.

## Current status — 2026-10-24

HF-011 was accepted in [PR #25](https://github.com/ArhiMEN/AdaptForm/pull/25), PERF-01 optimizations in [PR #26](https://github.com/ArhiMEN/AdaptForm/pull/26), and limited HF-013 in [PR #27](https://github.com/ArhiMEN/AdaptForm/pull/27), master `b9051dd`. HF-012 remains an expanded proposal; only the HF-013 subset is implemented. HF-015 is implemented in a separate PR: [error contract](HEADLESS_ERRORS.md). Dated sections below describe historical scope, not current master status. Package stays 2.2.0; HF-014/016/017 and publication are excluded.

## STAB-01/02 + HF-011/012 foundation — 2026-10-20

The separately approved combined scope is implemented in `feature/v2.3.0-foundation` with sequential stage commits and one integration PR. STAB-01 fixes all 54 baseline test diagnostics; STAB-02 measures performance/lifecycle (large observed collections remain expensive); HF-011 adds retained-node identity and insert/move; HF-012 is a specification proposal only. See [2.3.0 milestone](../roadmap/v2.3.0/PLAN.md), [identity](HEADLESS_COLLECTION_IDENTITY.md), [dependency proposal](HEADLESS_DEPENDENCIES.md) and [verification](../roadmap/v2.3.0/VERIFICATION.md). Source completion is not PR acceptance or publication. Package stays 2.2.0. This scoped run supersedes the earlier stop-between-cards rule; HF-004 and HF-013+ remain excluded.

## HF-005–HF-010 implementation — 2026-10-18

The explicitly approved combined task implements HF-005–HF-010 in one branch with sequential commits and one integration PR. These six cards are **accepted and merged in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16)** after independent review and correction of HF-009 batch validation; this scoped approval supersedes their earlier planning-only gates and the one-PR-per-task execution policy below. See [state contract](HEADLESS_STATE_CONTRACT.md), [usage](HEADLESS_STATE_USAGE.md) and [handoff](HANDOFF.md). HF-004 and HF-011 onward remain excluded. No version bump or release is authorized.

## Target boundaries

- Preserve the class-based `Form` / `Field` façade; optional UI adapters for Vue/React/Electron only.
- Model raw input, cleaned value, baseline, validation status and errors; derive aggregate Form state from descendants.
- Framework-independent selectors/subscriptions, stable snapshots and synchronous batched mutations; commit once before notifying. No required RxJS/Vue/React.
- Explicit validation dependencies, one collection lifecycle, stable item identities, fenced async results and optional submission orchestration.
- No private data, secrets, raw field-value logs, automatic npm publish or unapproved breaking API changes.

## Decisions still required

- Touched/dirty/baseline and reset compatibility are specified by HF-005. Collection reset membership and reinitialize remain deferred.
- Handling incomplete numeric edit strings such as `123.`, typed `valueClear` and final submit validity.
- Subscribe/snapshot API and batch exceptions are specified by HF-005–HF-010. Dependency cycles, error lifetime and trigger defaults remain future decisions.
- Async cancellation semantics, duplicate submits and adapter distribution approach.

## Phases

- **P0: Contract stabilization** — Tests and defect isolation before changing observable behavior.
- **P1: State and notifications** — Dirty/baseline, snapshots, batching, nested subscriptions and collection identity.
- **P2: Validation intelligence** — Explicit dependencies, triggers and structured errors.
- **P3: Async and submission** — Race-safe asynchronous checks and user-controlled submit handler.
- **P4: Integration and quality gates** — Vue integration design/pilot and measured acceptance.

## Small task cards

Every task is independent in scope but must obey its prerequisites. No task may opportunistically implement later tasks. **Proposed / not started** is the default except for tasks explicitly confirmed complete in HANDOFF. Size S/M is relative and not a time estimate. A decision gate means stop for explicit approval before a public behavioral/API change.

### HF-001 — Characterize existing behavior

**Status: completed in PR #8; see [HANDOFF](HANDOFF.md) for evidence.**

- Depends on: none; phase/size: P0 / S; model/effort: Sol / Medium; API decision gate: no.
- Scope: Read focused Form/Field/ArrayField/ArrayFormField/DecimalType tests and add only passing characterization tests; document reproducible suspected defects without changing production code.
- Acceptance: Baseline tests pass; report actual observed behavior, gaps, and isolated reproduction commands.

### HF-002 — Defer ArrayField validation correctly

**Status: completed in [PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10); CI passed, details in [HANDOFF](HANDOFF.md).**

- Depends on: HF-001; phase/size: P0 / S; model/effort: Sol / Medium; API decision gate: no.
- Scope: Ensure form.setFields(data,false) does not invoke collection validators through itemsValue/clear; apply values before optional validation.
- Acceptance: Regression tests confirm zero premature validation calls and one final check when enabled; preserve public setter.

### HF-003 — Specify decimal edit vs submit validity

**Status: completed in [PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12), CI and GitGuardian passed; [HANDOFF](HANDOFF.md) contains the evidence.**

- Depends on: HF-001; phase/size: P0 / S; model/effort: Sol / High; API decision gate: yes.
- Scope: Test 123. and boundary bypass; propose minimal backward-compatible policy for incomplete decimal input before modifying behavior.
- Acceptance: Tests cover incomplete input, min/max bounds, locale separators, casting and submission-safety; behavior change requires approval.

### HF-004 — Define and repair collection reset

- Depends on: HF-001; phase/size: P0 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Specify whether reset restores initial element count/order and distinguish initial baseline from later server hydration; fix only the approved semantics.
- Acceptance: Focused tests for add/remove/reorder/reset on both collection classes, nested fields and no leaked subscriptions.

### HF-005 — Freeze Field/Form state semantics

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-001; phase/size: P1 / S; model/effort: Sol / High; API decision gate: yes.
- Scope: Document raw/clean/initial, dirty/touched/focused/visited, validity tri-state, validation status and state transition table; no code changes.
- Acceptance: Document explicitly distinguishes programmatic assignment from user interaction and records compatibility/migration decisions.

### HF-006 — Add Field baseline and dirty tracking

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-005; phase/size: P1 / S; model/effort: Sol / Medium; API decision gate: yes.
- Scope: Implement baseline comparison and explicit reinitialize/commit semantics if approved; retain reset and existing isTouched behavior unless migrated.
- Acceptance: Tests cover edit/revert, defaults, null, transformed inputs and programmatic updates without unexpected touched changes.

### HF-007 — Aggregate Form state safely

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-006; phase/size: P1 / S; model/effort: Sol / Medium; API decision gate: no.
- Scope: Derive isDirty, isTouched and validation metadata from children and global errors; avoid independent duplicated mutable truth.
- Acceptance: Nested forms/collections propagate aggregate state correctly; existing isValid contract remains stable.

### HF-008 — Implement subscription snapshots

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-005, HF-007; phase/size: P1 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Introduce a tiny framework-free subscribe/unsubscribe/getSnapshot mechanism with referentially stable unchanged snapshots.
- Acceptance: One notification per actual committed change; no notification for identical states; unsubscribe works, no sensitive logging.

### HF-009 — Implement atomic batches

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-008; phase/size: P1 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Implement nested-safe synchronous batch semantics for multi-field writes and failure handling; publish only consistent final snapshots.
- Acceptance: Cross-field validators see complete new values; subscribers see no intermediate state; exception policy tested.

### HF-010 — Propagate nested state updates

**Status: accepted in [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16); CI and GitGuardian passed.**

- Depends on: HF-008, HF-009; phase/size: P1 / M; model/effort: Sol / High; API decision gate: no.
- Scope: Wire child Field/Form changes to parents without circular notifications, duplicate owners or memory leaks.
- Acceptance: Direct child edits notify relevant parents once; detach/remove stops obsolete notifications.

### HF-011 — Stabilize dynamic collection identity

**Accepted and merged in PR #25.** [Contract](HEADLESS_COLLECTION_IDENTITY.md).

- Depends on: HF-010; phase/size: P1 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Add internal stable element identity across reorder and index shifts, without changing existing indexed serialization.
- Acceptance: Insert/delete/reorder retain surviving item identity and appropriate subscriptions; index paths stay accurate.


### HF-012 — Specify dependency graph semantics

**Expanded specification remains a proposal; its limited subset was accepted as HF-013 in PR #27.** [Proposal](HEADLESS_DEPENDENCIES.md).

- Depends on: HF-005, HF-009; phase/size: P2 / S; model/effort: Sol / High; API decision gate: yes.
- Scope: Specify explicit dependsOn paths, cycle handling, nested/array paths and invalidation rules before implementation.
- Acceptance: Decision record includes cycle handling, non-mutating validators and backward-compatibility boundary.

### HF-013 — Implement selective dependency revalidation

**Accepted and merged in PR #27; ordinary fields of one Form only.** [Contract](HEADLESS_DEPENDENCIES_USAGE.md).

- Depends on: HF-012, HF-011; phase/size: P2 / M; model/effort: Sol / High; API decision gate: no.
- Scope: Revalidate explicit dependents once per committed batch; do not introduce implicit Proxy tracking.
- Acceptance: Diamond dependencies, chained changes and cycles are deterministic; unrelated validators do not run.

### HF-014 — Add validation trigger policies

- Depends on: HF-013; phase/size: P2 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Design and implement opt-in onChange/onBlur/onSubmit/manual triggers, separating validation truth from error visibility.
- Acceptance: Default 2.1.0 semantics retained; targeted tests for untouched fields, blur, submit and dependency changes.

### HF-015 — Introduce structured error internals

**Source implemented; PR acceptance and independent review pending.** [Model, compatibility and retained clearing policy](HEADLESS_ERRORS.md).

- Depends on: HF-005, HF-011; phase/size: P2 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Model path/code/source/params/message internally; keep errors, allErrors and ErrorsSchema compatibility façade.
- Acceptance: Multi-error and indexed paths retained; server-error invalidation policy explicitly approved and tested.

### HF-016 — Implement async validation fencing

- Depends on: HF-009, HF-014; phase/size: P3 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Add opt-in async validation with value/version fencing and cancellation; stale results cannot overwrite new state.
- Acceptance: Out-of-order responses, aborts, rapid edits and removed nodes covered with deterministic tests.

### HF-017 — Add submission lifecycle

- Depends on: HF-016, HF-015; phase/size: P3 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Implement opt-in submit orchestration, full validation, frozen submission payload and duplicate-submit protection; do not own transport.
- Acceptance: Submit flags/counts reflect success, failure and cancellation; no double handler execution.

### HF-018 — Design a Vue integration boundary

- Depends on: HF-008, HF-014; phase/size: P4 / S; model/effort: Sol / Medium; API decision gate: yes.
- Scope: Evaluate Vue 3 shallowRef/subscription integration and disposal; produce API design without adding a dependency to core.
- Acceptance: Design and minimal usage example reviewed before any adapter package code.

### HF-019 — Build optional Vue adapter pilot

- Depends on: HF-018, HF-017; phase/size: P4 / M; model/effort: Sol / High; API decision gate: yes.
- Scope: Implement only approved Vue 3 binding surface as optional package/subpath; exercise actual multi-field and nested form cases.
- Acceptance: Framework-independent core stays dependency-free; lifecycle/disposal and TypeScript examples pass.

### HF-020 — Run integrity and performance gates

- Depends on: HF-009, HF-011, HF-013, HF-015, HF-017, HF-019; phase/size: P4 / M; model/effort: Sol / High; API decision gate: no.
- Scope: Define baselines and run API/types, real-browser integration, dependency and snapshot efficiency benchmarks; release choice separate.
- Acceptance: Measured results and regressions published without unsupported speed claims; no version change or release.

## Execution and verification policy

1. Before each HF task read `AGENTS.md`, `docs/ai/PROJECT_CONTEXT.md`, the relevant skill, and **only task-specific source/tests**. Do not scan full repo/history.
2. Use one focused branch and small PR per task. Never auto-merge, delete branches, publish npm, rename public APIs or bump version.
3. Start with `npx vitest run <test-file>`, expand to typechecks/build/lint/integration only as required by changed behavior. CI success alone is not sufficient review.
4. Summarize ID, files, actual checks, limitations, risk, next task in `docs/ai/HANDOFF.md` and Russian companion. Update `DECISIONS` only after approval; do not include private discussion in public git.
5. Do not automatically start the next task. ChatGPT Library is not synced with GitHub: this roadmap is the public plan and Library holds a separate copy.

**Next action:** review HF-015 and its PR CI. HF-011/013 are already merged; do not auto-start further tasks, merge or publish.
