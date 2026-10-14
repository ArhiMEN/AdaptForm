# AdaptForm 2.1.0 Improvement Plan

## Goal

Improve the reliability, type safety, maintainability, and release confidence of AdaptForm while preserving existing consumer behavior wherever practical. PlayLease currently consumes `adaptform@^2.0.5`; compatibility with that integration is a release requirement.

## Workstreams

### 1. Baseline and repository hygiene
- [x] Inspect the current public API, package exports, build configuration, and existing test coverage.
- [x] Run the existing test suite, build, and TypeScript type-check through GitHub Actions; record the actual results.
- [x] Repair `npm run lint` with ESLint flat config and TypeScript ESLint; lint source and tests in CI.
- [x] Remove the machine-specific absolute path from Vitest configuration and use a portable project-relative path.
- [ ] Audit repository-authored text for English consistency.

### 2. Core correctness
- [x] Validate conditional-required rules after bulk assignment and document explicit `checkValid()` use after individual dependent-field changes.
- [x] Make `isValid` reads side-effect-free; explicitly revalidate collections after mutations.
- [ ] Review reset semantics, error lifecycle, and nested-form error propagation.
- [x] Fix `ErrorsSchema.forArray()` to honor its custom index extractor and supplied item schema, with regression coverage.
- [x] Add regression tests for the implemented validation, array-index, numeric precision, and regex correctness fixes.

### 3. Serialization contracts
- [x] Define and test JSON serialization for primitives, arrays, nested forms, and Date values, including recursive Date conversion.
- [x] Define and test FormData serialization for arrays, nested form values, Date values, and omission of nullish values. Blob/File handling is implemented; broader edge-case coverage remains to be added.
- [ ] Preserve existing supported behavior or document migration steps for intentional changes.

### 4. Type safety
- [x] Improve inference for form field values and keys without duplicating runtime field discovery logic.
- [ ] Reduce avoidable `any` types in public APIs.
- [x] Add compile-time type tests for representative forms, arrays, and nested forms.
- [x] Ensure generated declaration files match the intended public API.

### 5. Error handling and localization
- [x] Review error schema parsing for nested objects, arrays, unknown fields, and non-string values; add regression coverage for array mappings and fallback invocation.
- [ ] Consider structured error codes and parameters as a path to localization without parsing human-readable messages.
- [ ] Keep existing PlayLease localization behavior compatible or document coordinated migration before changing message contracts.

### 6. Dependency health
- [x] Replace vulnerable transitive dependency versions with patched versions using reviewed overrides; `npm audit` and the lockfile vulnerability scan now report zero known vulnerabilities.

### 7. Release readiness
- [ ] Expand regression and integration coverage for identified edge cases.
- [x] Verify lint, tests, build, and TypeScript type-check through GitHub Actions; package-content review remains outstanding.
- [ ] Update README and CHANGELOG in English to reflect implemented behavior only.
- [ ] Review the final diff and document remaining risks.
- [ ] Do not publish or tag a release without explicit user approval.

## Acceptance criteria

- Existing tests pass, or any pre-existing failures are clearly documented and distinguished from regressions.
- New behavior has regression tests, including relevant edge cases.
- Build and generated TypeScript declarations succeed.
- Public API and serialization behavior are documented accurately.
- No duplicate implementation is introduced where an existing implementation can be improved.
- Repository-authored text is in English.
- PlayLease compatibility risks are documented and addressed before release.
- No repository or branch deletion, history rewrite, or npm publication occurs.
