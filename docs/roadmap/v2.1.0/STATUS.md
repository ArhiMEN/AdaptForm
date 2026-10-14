# AdaptForm 2.1.0 Status

## Current stage

**Stage 3 — Final verification and release readiness**

Branch: `v2.1.0`  
Baseline branch: `master`  
Starting package version: `2.0.5`  
Package version in this branch: `2.0.5` (intentionally unchanged until release approval)  
Release status: Not released; npm publication and release tagging are not authorized.

## Completed

- [x] Created the `v2.1.0` branch from `master` without changing existing branches.
- [x] Added repository safety, architecture, language, and workflow instructions in `AGENTS.md`.
- [x] Added the version plan and progress tracker.
- [x] Configured ESLint for TypeScript source and tests and added linting to CI.
- [x] Added dependency auditing to CI, patched known vulnerable transitive dependency versions, and aligned `package-lock.json` with `package.json`.
- [x] Replaced the machine-specific Vitest alias with a portable project-relative alias.
- [x] Improved validation correctness for stateful regular expressions, blank and non-finite numbers, decimal precision, conditional-required rules, collection mutation, and invalid array indices.
- [x] Made direct bulk form assignment validate against the completed form state and avoid duplicate validation of directly assigned fields.
- [x] Deferred nested-form assignment until the complete collection is ready for validation.
- [x] Corrected field and collection reset state, including clearing stale errors and leaving validity unvalidated until the next check.
- [x] Added recursive clearing of stale server errors across nested forms and array items.
- [x] Improved inferred form-value types, nullable array value typing, nested form collection value types, and JSON serialization return types.
- [x] Added regression tests for validation batching, reset behavior, nested error clearing, nullable collection values, nested Date serialization, and Blob/File FormData handling.
- [x] Completed the English-language audit for repository-authored documentation, comments, and test descriptions. Existing user-facing validation/error text and type names remain unchanged for a separate localization pass.
- [x] Added an npm package content check and integrated it into CI.
- [x] Updated README, CHANGELOG, and this tracker to describe the implemented behavior and deferred work.
- [x] Reviewed the branch comparison against `master`: no files are deleted, and no release, tag, or published package version was changed.

## Latest verified implementation

CI run: [38528184542](https://github.com/ArhiMEN/AdaptForm/actions/runs/38528184542)  
Verified branch commit: `3fedf9d3b2b1bc1563f371c31bc6b13bf817bd49`  
The run passed after the final code and documentation changes; the later status-only bookkeeping commit does not change implementation.

| Check | Status | Result |
|---|---|---|
| Reproducible install | Passed | `npm ci` succeeded |
| Dependency audit | Passed | `npm audit --audit-level=moderate` and the lockfile scan reported zero known vulnerabilities |
| Lint | Passed | `npm run lint` |
| Tests | Passed | 339 tests across 16 test files |
| Build | Passed | ESM, CommonJS, and TypeScript declarations |
| Type-check | Passed | `npx tsc --noEmit -p tsconfig.json` |
| Package content | Passed | 18 packaged files; required entry points/declarations present; source, tests, docs, and GitHub workflow files excluded |

The plan-only commit `70322702b643057191a378a91cce468b09e1f728` also passed CI. Documentation updates after the verified implementation are checked by the normal branch CI workflow.

## Deferred follow-up — outside this branch's acceptance criteria

- Validation-message localization and any change to the public message contract.
- Structured error codes/parameters for localization.
- PlayLease integration tests, adapter changes, and application-specific compatibility checks.
- Package version bump, npm publication, and release tagging. These require explicit approval.

## Known limitations

- Legacy callback APIs still contain some `any` types where replacing them with `unknown` would cause a source-compatibility change. Form value inference, serialization results, and nested collection values have been made more precise without broad callback API changes.
- No PlayLease application runtime or integration suite was run, by explicit scope decision.
- The published npm version remains `2.0.5`; this branch has not been released.

## Final checklist

- [x] Correctness fixes have regression tests.
- [x] Lint, tests, build, type-check, dependency audit, and package-content validation pass in CI.
- [x] Documentation and tracking files are updated in English, excluding deferred user-facing validation/error text.
- [x] No duplicate implementation was added where existing logic could be improved.
- [x] Repository and branch safety constraints were preserved.
- [x] Confirm the final branch CI after the last code and documentation updates.
- [ ] Obtain explicit approval before bumping the package version, tagging, or publishing.
