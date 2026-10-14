# AdaptForm 2.1.0 Improvement Plan

## Goal

Improve the reliability, type safety, maintainability, and release confidence of AdaptForm while preserving existing consumer behavior wherever practical. PlayLease currently consumes `adaptform@^2.0.5`; compatibility with that integration is a release requirement.

## Workstreams

### 1. Baseline and repository hygiene
- [ ] Inspect the current public API, package exports, build configuration, and existing test coverage.
- [ ] Run the existing test suite, build, and lint checks; record the actual baseline results.
- [x] Remove the machine-specific absolute path from Vitest configuration and use a portable project-relative path.
- [ ] Audit repository-authored text for English consistency.

### 2. Core correctness
- [ ] Review field validation and conditional-required behavior when dependent fields change.
- [ ] Make validity reads predictable and avoid hidden repeated validation side effects.
- [ ] Review reset semantics, error lifecycle, and nested-form error propagation.
- [ ] Fix `ErrorsSchema.forArray()` so its public contract is implemented correctly, or simplify the API if the argument is not part of the intended design.
- [ ] Add regression tests before or alongside each fix.

### 3. Serialization contracts
- [ ] Define and test JSON serialization for primitives, arrays, dates, nested forms, nulls, and optional values.
- [ ] Define and test FormData serialization, including the behavior of arrays, objects, dates, and files. (Implementation and regression tests started; execution still pending.)
- [ ] Preserve existing supported behavior or document migration steps for intentional changes.

### 4. Type safety
- [ ] Improve inference for form field values and keys without duplicating runtime field discovery logic.
- [ ] Reduce avoidable `any` types in public APIs.
- [ ] Add compile-time type tests for representative forms and field types.
- [ ] Ensure generated declaration files match the intended public API.

### 5. Error handling and localization
- [ ] Review error schema parsing for nested objects, arrays, unknown fields, and non-string values.
- [ ] Consider structured error codes and parameters as a path to localization without parsing human-readable messages.
- [ ] Keep existing PlayLease localization behavior compatible or document coordinated migration before changing message contracts.

### 6. Release readiness
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
