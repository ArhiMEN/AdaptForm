# AdaptForm 2.1.0 Status

## Current stage

**Stage 2 — Core correctness and type-safety improvements**

Branch: `v2.1.0`  
Baseline branch: `master`  
Starting package version: `2.0.5`  
Release status: Not released; npm publication is not authorized by this plan.

## Completed

- [x] Created the `v2.1.0` branch from `master`.
- [x] Added repository safety, architecture, language, and workflow instructions in `AGENTS.md`.
- [x] Added the v2.1.0 plan and progress tracker.
- [x] Identified priority areas from source review: type inference, serialization, validation side effects, array error schema composition, and localization compatibility.
- [x] Confirmed PlayLease consumes `adaptform@^2.0.5` and has a custom adapter that currently translates Russian validation messages.

## In progress

- [x] Establish the executable test/build/type-check baseline through GitHub Actions.
- [x] Inspect test configuration and replace the machine-specific absolute alias path with a portable path.
- [x] Add regression tests for FormData collection serialization and omission of nullish values.
- [x] Replace the machine-specific Vitest alias with a portable path derived from `import.meta.url`.
- [x] Add regression tests for default and custom array-error index extraction, dotted index notation, and item-schema field mappings.
- [x] Add regression coverage for array error mapping, inferred field/array/nested-form value types, and Date serialization.
- [ ] Turn remaining source-review findings into minimal reproducible regression tests.

## Recent implementation notes

- Updated `ErrorsSchema.forArray()` to use its custom index extractor, accept bracket/angle-bracket/dotted index notation, and apply the supplied item schema's field mappings and value transformers.
- Added regression tests for the above behaviors. The implementation and regression tests passed in GitHub Actions.

## Latest verified code baseline

The run for commit `438a9ba07c6102a134db158c03e40fa48a2a44e0` passed: 312 tests across 16 files, ESM/CommonJS/declaration builds, and `tsc --noEmit`. This baseline includes the new array-schema behavior, typed `fieldsValue`, nullable `valueClear`, and Date serialization tests.

The lockfile metadata was aligned with `package.json`, and the updated `npm ci` workflow passed in GitHub Actions (run `38523206183`).

## Verification log

| Check | Status | Notes |
|---|---|---|
| Repository and branch | Passed | Branch created from `master`; no existing branch changed. |
| Reproducible install | Passed | `npm ci` succeeded with the aligned lockfile. |
| Test suite | Passed | Latest verified code baseline: 312 tests passed across 16 test files. |
| Build | Passed | ESM, CommonJS, and TypeScript declaration output built successfully. |
| Type-check | Passed | `npx tsc --noEmit -p tsconfig.json` passed. |
| Lint | Blocked | Existing `npm run lint` script fails because ESLint is not installed/configured. |
| Dependency audit | Warning | `npm install` reported 11 vulnerabilities: 2 moderate, 6 high, 3 critical. Needs triage; no automatic fixes applied. |
| PlayLease integration tests | Not run | Review only; no application runtime was started. |

## Decisions and constraints

- Keep the current published version unchanged until a release is explicitly approved.
- Prefer backward-compatible improvements for the 2.1.0 minor release.
- Do not change validation-message language without assessing the PlayLease adapter and documenting a migration path.
- Record verified results only; never mark a check as passed based on inspection alone.

## Next actions

1. Repair the pre-existing `npm run lint` command without introducing an inconsistent lockfile.
2. Continue the English-language audit, preserving a coordinated migration plan for Russian default validation messages used by PlayLease.
3. Review validity getter side effects and remaining type-safety gaps.
