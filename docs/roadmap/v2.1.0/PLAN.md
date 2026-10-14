# AdaptForm 2.1.0 Improvement Plan

[English](PLAN.md) · [Русский](PLAN.ru.md)

## Goal

Improve the reliability, type safety, maintainability, and release confidence of AdaptForm while preserving existing consumer behavior wherever practical. This branch covers library-level work only; application-specific integration testing is tracked separately.

Interactive demo: [https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/) (GitHub Pages and deployment permissions are configured for `v2.1.0` and `master`; see [docs/DEMO.md](../../DEMO.md)).

## Workstreams

### 1. Baseline and repository hygiene
- [x] Inspect the current public API, package exports, build configuration, and existing test coverage.
- [x] Run the existing test suite, build, and TypeScript type-check through GitHub Actions; record the actual results.
- [x] Repair `npm run lint` with ESLint flat config and TypeScript ESLint; lint source and tests in CI.
- [x] Remove the machine-specific absolute path from Vitest configuration and use a portable project-relative path.
- [x] Audit repository-authored text for English consistency, excluding validation messages explicitly deferred for a later localization pass.

### 2. Core correctness
- [x] Validate conditional-required rules after bulk assignment and document explicit `checkValid()` use after individual dependent-field changes.
- [x] Make `isValid` reads side-effect-free; explicitly revalidate collections after mutations.
- [x] Review reset semantics, error lifecycle, and nested-form error propagation; add regression coverage for reset state and recursive error clearing.
- [x] Fix `ErrorsSchema.forArray()` to honor its custom index extractor and supplied item schema, with regression coverage.
- [x] Add regression tests for the implemented validation, array-index, numeric precision, and regex correctness fixes.

### 3. Serialization contracts
- [x] Define and test JSON serialization for primitives, arrays, nested forms, and Date values, including recursive Date conversion.
- [x] Define and test FormData serialization for arrays, nested form values, Date values, Blob/File values, and omission of nullish values.
- [x] Document intentional validation and serialization behavior changes in README and CHANGELOG.

### 4. Type safety
- [x] Improve inference for form field values and keys without duplicating runtime field discovery logic.
- [x] Reduce avoidable `any` usage in form value inference, serialization return types, nullable array values, and nested collection values. Retain legacy callback `any` types where replacing them with `unknown` would be a source-compatibility change.
- [x] Add compile-time type tests for representative forms, arrays, and nested forms.
- [x] Ensure generated declaration files match the intended public API.

### 5. Error handling and localization
- [x] Review error schema parsing for nested objects, arrays, unknown fields, and non-string values; add regression coverage for array mappings and fallback invocation.
- [deferred] Consider structured error codes and parameters as a path to localization without parsing human-readable messages; validation-message changes are outside this branch's scope.
- [deferred] Review PlayLease adapter compatibility and coordinate any validation-message contract changes in a separate integration pass.

### 6. Dependency health
- [x] Replace vulnerable transitive dependency versions with patched versions using reviewed overrides; `npm audit` and the lockfile vulnerability scan now report zero known vulnerabilities.

### 7. Release readiness
- [x] Expand regression coverage for identified reset, nested-error, validation batching, nullable-array, and serialization edge cases. Application-specific integration testing is deferred.
- [x] Verify lint, tests, build, TypeScript type-check, dependency audit, and npm package contents through GitHub Actions.
- [x] Update README and CHANGELOG in English and Russian to reflect implemented behavior only, and link the interactive demo from the main documentation.
- [x] Review the final diff and document remaining risks in `STATUS.md`.
- [x] Prepare package metadata and lockfile for version `2.1.0` without publishing or tagging a release.
- [x] Build an interactive demo from branch source and add automated GitHub Pages deployment plus CI verification.

### 8. Bilingual demo and documentation (maintainer-requested extension)
- [x] Add a persistent English/Russian language selector to the demo without changing entered data or library validation contracts.
- [x] Provide complete English/Russian versions of README, CHANGELOG, demo guide, release plan, status log, repository instructions, and license information.
- [x] Add regression coverage for language selection, switching, validation messages, collections, and serialization.
- [ ] Recheck the 2.1.0 acceptance criteria, pass local and CI checks, then push and merge `v2.1.0` into `master` without deleting either branch.

## Deferred follow-up (outside this branch's acceptance criteria)

- Validation-message localization and any structured error-code contract.
- PlayLease integration tests and adapter changes.
- Release version bump, npm publication, and release tagging; all require explicit approval.

## Acceptance criteria

- Existing tests pass, or any pre-existing failures are clearly documented and distinguished from regressions.
- New behavior has regression tests, including relevant edge cases.
- Build and generated TypeScript declarations succeed.
- Public API and serialization behavior are documented accurately.
- No duplicate implementation is introduced where an existing implementation can be improved.
- Documentation and the demo are available in English and Russian. Comments, test descriptions, and code examples remain in English; library validation-message localization is explicitly deferred.
- Application-specific integration work and validation-message localization are explicitly deferred to a separate pass.
- No repository or branch deletion, history rewrite, GitHub release, or npm publication occurs.
