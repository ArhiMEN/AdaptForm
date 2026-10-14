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

## Completed

- [x] Establish the executable test/build/type-check baseline through GitHub Actions.
- [x] Inspect test configuration and replace the machine-specific absolute alias path with a portable path.
- [x] Add regression tests for FormData collection serialization and omission of nullish values.
- [x] Replace the machine-specific Vitest alias with a portable path derived from `import.meta.url`.
- [x] Add regression tests for default and custom array-error index extraction, dotted index notation, and item-schema field mappings.
- [x] Add regression coverage for array error mapping, inferred field/array/nested-form value types, and Date serialization.
- [x] Add regression tests for regex statefulness, blank/non-finite numbers, decimal precision, conditional required fields, collection mutation, and invalid removal indices.
- [x] Configure ESLint and add a CI dependency audit.

## Recent implementation notes

- Updated `ErrorsSchema.forArray()` to honor custom index extractors, use explicit bracket/dotted indices by default, apply item-schema mappings and transformers, and reject malformed default index keys.
- Added regression tests for the above behaviors, the single-call fallback contract, public exports, inferred types, recursive Date serialization, conditional validation, regex determinism, numeric edge cases, and collection mutation. The latest verified run passed 329 tests across 16 files.

## Latest verified code baseline

The run for commit `e6d1ae883ff3cdc31d7306e034ff648645a66f74` passed: 329 tests across 16 files, ESLint, dependency audit, ESM/CommonJS/declaration builds, and `tsc --noEmit`.

The lockfile is aligned with `package.json`. `npm audit --audit-level=moderate` reported zero vulnerabilities, and the independent lockfile scan also found zero known OSV vulnerabilities.

## Verification log

| Check | Status | Notes |
|---|---|---|
| Repository and branch | Passed | Branch created from `master`; no existing branch changed. |
| Reproducible install | Passed | `npm ci` succeeded with the aligned lockfile. |
| Test suite | Passed | Latest verified baseline: 329 tests passed across 16 test files. |
| Build | Passed | ESM, CommonJS, and TypeScript declaration output built successfully. |
| Type-check | Passed | `npx tsc --noEmit -p tsconfig.json` passed. |
| Lint | Passed | ESLint flat config checks `src` and `tests`; `npm run lint` passes. |
| Dependency audit | Passed | `npm audit --audit-level=moderate` and the lockfile vulnerability scan report zero known vulnerabilities. Patched transitive dependencies are pinned with overrides. |
| PlayLease integration tests | Not run | Review only; no application runtime was started. |

## Decisions and constraints

- Keep the current published version unchanged until a release is explicitly approved.
- Prefer backward-compatible improvements for the 2.1.0 minor release.
- Do not change validation-message language without assessing the PlayLease adapter and documenting a migration path.
- Record verified results only; never mark a check as passed based on inspection alone.

## Next actions

1. Review reset semantics and remaining type-safety gaps, including avoidable `any` types.
2. Finish the repository-wide English-language audit, excluding default validation messages as explicitly deferred.
3. Leave PlayLease integration and validation-message localization unchanged for the later coordinated pass.
4. Review package contents and final diff before release readiness.
