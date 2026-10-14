# AdaptForm 2.1.0 Improvement Plan

## Goal

Improve the reliability, type safety, maintainability, and release confidence of AdaptForm while preserving existing consumer behavior wherever practical. PlayLease currently consumes `adaptform@^2.0.5`; compatibility with that integration is a release requirement.

## Workstreams

### 1. Baseline and repository hygiene
- [ ] Inspect the current public API, package exports, build configuration, and existing test coverage.
- [x] Run the existing test suite, build, and TypeScript type-check through GitHub Actions; record the actual results.
- [ ] Repair the pre-existing `npm run lint` command: ESLint is not installed or configured.
- [x] Remove the machine-specific absolute path from Vitest configuration and use a portable project-relative path.
- [ ] Audit repository-authored text for English consistency.

### 2. Core correctness
- [ ] Review field validation and conditional-required behavior when dependent fields change.
- [ ] Make validity reads predictable and avoid hidden repeated validation side effects.
- [ ] Review reset semantics, error lifecycle, and nested-form error propagation.
- [x] Fix `ErrorsSchema.forArray()` to honor its custom index extractor and supplied item schema, with regression coverage.
- [ ] Add regression tests before or alongside each fix.

### 3. Serialization contracts
- [ ] Define and test JSON serialization for primitives, arrays, dates, nested forms, nulls, and optional values. Primitive and Date cases are covered; array/nested JSON cases remain to be added.
- [x] Define and test FormData serialization for arrays, nested form values, Date values, and omission of nullish values. Blob/File handling is implemented; broader edge-case coverage remains to be added.
- [ ] Preserve existing supported behavior or document migration steps for intentional changes.

### 4. Type safety
- [x] Improve inference for form field values and keys without duplicating runtime field discovery logic.
- [ ] Reduce avoidable `any` types in public APIs.
- [x] Add compile-time type tests for representative forms, arrays, and nested forms.
- [x] Ensure generated declaration files match the intended public API.

### 5. Error handling and localization
- [ ] Review error schema parsing for nested objects, arrays, unknown fields, and non-string values.
- [ ] Consider structured error codes and parameters as a path to localization without parsing human-readable messages.
- [ ] Keep existing PlayLease localization behavior compatible or document coordinated migration before changing message contracts.

### 6. Dependency health
- [ ] Investigate the 11 npm audit findings reported during CI dependency installation (2 moderate, 6 high, 3 critical); identify direct/transitive causes and safe upgrades without blindly applying breaking fixes.

### 7. Release readiness
- [ ] Expand regression and integration coverage for identified edge cases.
- [ ] Verify tests, build, lint, and package contents in the available environment.
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
