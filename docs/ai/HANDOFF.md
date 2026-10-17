# Handoff

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

## HF-001 — Lifecycle characterization — 2026-10-17

**Completed:** passing baseline tests, observed behavior, gaps, and isolated reproductions satisfy HF-001 acceptance. This does not approve HF-002 or any behavior change.

Base: `master` at `d289b69`, containing foundation PR #5 and roadmap PR #7. The previous handoff records that conflicted PR #6 was replaced by the clean roadmap branch. Branch: `test/hf-001-form-lifecycle-baseline`.

Files: [baseline tests](../../tests/unit/form-lifecycle-baseline.test.ts), this handoff, and its Russian companion. No production code, dependencies, package version, demo, or public API changes.

### Confirmed behavior

- `Field.setRawValue(value, false)` still casts, marks touched, clears prior errors, and sets validity to `null`; type, required, and custom validation wait for an explicit check. Invalid cast produces a null clean value without immediate errors.
- `Form.setFields(data, false)` defers direct fields, retains omitted fields and global errors, and marks assigned fields touched. Normal bulk assignment validates direct fields once with complete new sibling values. `isValid` reads do not themselves rerun these validators.
- `ArrayField.itemsValue` checks an intermediate empty collection and then the rebuilt collection without parent context. With optional collection validation and one non-null item, the item validator runs twice (constructor plus collection check). Through `setFields(..., true)` a third item check and a final collection check receive parent context. With `false`, the premature checks still occur and the collection may already be valid while direct sibling validity remains null.
- Programmatic nonempty collection replacement marks the collection touched, while new ArrayField items remain untouched constructor defaults. Removing/clearing a pristine ArrayField does not mark it touched.
- ArrayFormField hydration of null-default child fields defers validation; the parent check validates them once with their own child form as context. Non-null class defaults validate during child construction even when hydration is deferred.
- Initially hydrated child forms are touched, but their ArrayFormField and parent can remain untouched. Subsequent direct child assignment does not propagate touched through that pristine collection. Child validity still affects parent validity.
- Both collection resets keep current element identities/order: removed elements stay removed and additions remain. ArrayField restores each retained item's constructor value; ArrayFormField restores class defaults (null for fields without defaults), not hydration data. Errors/global child errors clear, touched resets, and collection validity remains false until checked; reset does not invoke custom validators.
- Decimal strings retain string values, trim whitespace and normalize a comma; numeric inputs retain numbers. Malformed input casts to null, excess precision is rejected without rounding, integer digit limits still apply, and complete values honor inclusive/exclusive bounds. A trailing decimal point bypasses **all four numeric bounds**, may pass `Form.checkValid()`, and is retained in `toJSON()`.

### Reproductions and future regression expectations

Run from the repository with `export npm_config_cache=/workspace/.npm`. Prefix each filter below with `npx --no-install vitest run tests/unit/form-lifecycle-baseline.test.ts -t` for an isolated reproduction. All current assertions characterize existing behavior and pass.

| Filter | Minimal reproduction / future regression boundary |
| --- | --- |
| `'ArrayField assignment validation'` | Optional ArrayField with collection/item spies; assign `['new']` directly or via `setFields({ values: ['new'], sibling: 'ready' }, false/true)`. Observed collection snapshots: empty, rebuilt, then parent-aware only when enabled. HF-002 should assert no premature collection callbacks with false and one final parent-aware check with true; count factory constructor validation separately. |
| `'decimal input and submission'` | `new Field(DecimalType, null, { le: 122 })` accepts `'123.'`, while rejecting `'123'`; equivalent bypasses occur for gt/ge/lt. Future submit-safe regression must reject an out-of-bounds trailing-dot value only after HF-003 policy approval; preserve editing policy deliberately. |
| `'collection reset after structural changes'` | Initialize two elements, remove one, add another, edit, reset. Current membership remains; nested forms return to class defaults. A future test for restoring initial membership/hydration requires HF-004 approval. |
| `'nested form assignment and state'` | Hydrate an ArrayFormField child or edit it directly: child touched can be true while parent touched stays false. Future aggregation semantics require HF-005 approval. |

### Actual checks

- `npx --no-install vitest run tests/unit/form-lifecycle-baseline.test.ts` — **34 passed**, 1 file; rerun after test typing corrections, same result.
- `npx --no-install vitest run tests/unit/fields/Field.test.ts tests/unit/Form.test.ts tests/unit/fields/ArrayField.test.ts tests/unit/fields/ArrayFormField.test.ts tests/unit/types/DecimalType.test.ts` — **129 passed**, 5 files.
- `npx --no-install eslint tests/unit/form-lifecycle-baseline.test.ts --max-warnings 0` — passed.
- `npx --no-install tsc --noEmit -p tsconfig.test.json` — failed with **54 pre-existing diagnostics**, none in the new test. A temporary external config excluding only the new file (with absolute type-library paths for resolution outside the checkout) produced identical diagnostics. No test configuration was changed.
- `git diff --check` and local Markdown/link/EN-RU structure review — passed. Full library tests, build, demo checks, and audit were not run; production code was unchanged.

### Limits and next step

No exhaustive plugin, asynchronous, reordered-collection, subscription, or framework investigation was performed. No edit-versus-submit decimal policy or initial-versus-hydrated reset contract is decided. The baseline locks observations, not preferred future semantics; revise affected characterization assertions alongside explicitly approved fixes.

Recommend **HF-002 only** next: defer ArrayField collection checks during assignment, apply all sibling values before final parent-aware validation, preserve the public setter and existing Field constructor contract, and distinguish constructor calls from assignment checks in regression tests. Decimal, reset, and touched changes remain separately gated. No subsequent task has been implemented or automatically started.
