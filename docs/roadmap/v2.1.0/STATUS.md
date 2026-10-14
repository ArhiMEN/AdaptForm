# AdaptForm 2.1.0 Status

## Current stage

**Stage 3 — Final verification and release readiness**

Branch: `v2.1.0`  
Baseline branch: `master`  
Starting package version: `2.0.5`  
Package version in this branch: `2.1.0` (prepared for maintainer release; not published)  
Release status: Release candidate prepared; npm publication, GitHub release, and release tagging have not been performed.

Interactive demo: [https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/) — live and verified against the `v2.1.0` source; deployment permissions allow `v2.1.0` and `master`.

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
- [x] Created a styled interactive demo at `demo/`, built directly against the branch source.
- [x] Added a GitHub Pages deployment workflow and independent demo type-check/build checks in CI.
- [x] Enabled GitHub Pages with GitHub Actions and allowed both `v2.1.0` and `master` in the `github-pages` deployment environment.
- [x] Added automatic demo deployment from `master` once the workflow is merged there; both branches publish to the same URL.
- [x] Completed the first live deployment and verified the live page and its JavaScript/CSS assets against the local production build.
- [x] Linked the demo from README, CHANGELOG, and project tracking; added deployment instructions in `docs/DEMO.md`.
- [x] Prepared `package.json` and `package-lock.json` with version `2.1.0` without publishing.
- [x] Updated README, CHANGELOG, and this tracker to describe the implemented behavior and deferred work.
- [x] Reviewed the branch comparison against `master`: no files are deleted, and no release, tag, or published package version was changed.

## Latest verified implementation

CI run: [38539391483](https://github.com/ArhiMEN/AdaptForm/actions/runs/38539391483)

Verified implementation commit: `8e80018a3952d6ce4d5b7c059e1ff00953e0387c`

The final code checks passed, including demo type-check and production build. The subsequent status-only bookkeeping update does not change implementation.

| Check | Status | Result |
|---|---|---|
| Reproducible install | Passed | `npm ci` succeeded |
| Dependency audit | Passed | `npm audit --audit-level=moderate` reported zero known vulnerabilities; the previous lockfile scan also reported zero |
| Lint | Passed | `npm run lint` |
| Tests | Passed | 339 tests across 16 test files |
| Build | Passed | ESM, CommonJS, and TypeScript declarations |
| Type-check | Passed | `npx tsc --noEmit -p tsconfig.json` |
| Package content | Passed | 18 packaged files; required entry points/declarations present; source, tests, docs, and GitHub workflow files excluded |
| Demo | Passed | Type-check, Vite production build, and output structure verified |

The final CI run verified 339 tests across 16 files, npm dependency auditing (zero known vulnerabilities), lint, package build, npm package contents, source type-check, demo type-check, and demo production build.

### Demo deployment follow-up — 2026-10-14

- Found that Pages was already enabled, but the `github-pages` environment allowed deployment only from `master`. Added `v2.1.0` while preserving the existing `master` policy.
- Reran [Deploy demo run 38536827525](https://github.com/ArhiMEN/AdaptForm/actions/runs/38536827525); build and deployment succeeded. Downloaded the live HTML, JavaScript, and CSS over HTTPS and verified that all three exactly match the local production build; the page identifies itself as the 2.1.0 demo.
- After pushing the workflow change, [CI run 38539391483](https://github.com/ArhiMEN/AdaptForm/actions/runs/38539391483) and the automatic [Deploy demo run 38539392190](https://github.com/ArhiMEN/AdaptForm/actions/runs/38539392190) both passed for commit `8e80018`.
- Added `master` to the deployment workflow's push triggers. No merge into `master` was performed; automatic deployment there becomes available when this branch is merged.
- Local checks passed: lint, demo type-check, demo production build, and all 339 tests across 16 files with coverage. No library source files changed, so per-file source coverage thresholds do not apply to this workflow/documentation change.

## Deferred follow-up — outside this branch's acceptance criteria

- Validation-message localization and any change to the public message contract.
- Structured error codes/parameters for localization.
- PlayLease integration tests, adapter changes, and application-specific compatibility checks.
- Package version bump, npm publication, and release tagging. These require explicit approval.

## Known limitations

- Both permitted branches share one live demo URL; the latest successful deployment replaces the previous site. The `master` deployment trigger must reach `master` through the normal merge process.

- Legacy callback APIs still contain some `any` types where replacing them with `unknown` would cause a source-compatibility change. Form value inference, serialization results, and nested collection values have been made more precise without broad callback API changes.
- No PlayLease application runtime or integration suite was run, by explicit scope decision.
- The latest published npm version remains `2.0.5`; this branch is prepared as `2.1.0` but has not been released.

## Final checklist

- [x] Correctness fixes have regression tests.
- [x] Lint, tests, build, type-check, dependency audit, and package-content validation pass in CI.
- [x] Documentation and tracking files are updated in English, excluding deferred user-facing validation/error text.
- [x] No duplicate implementation was added where existing logic could be improved.
- [x] Repository and branch safety constraints were preserved.
- [x] Confirm the final branch CI after the last code and documentation updates.
- [x] Prepare version `2.1.0` in package metadata and changelog without publishing or tagging.
- [x] Enable GitHub Pages in repository settings, allow both deployment branches, rerun deployment, and verify the live demo URL and assets.
- [ ] Obtain explicit approval before creating a GitHub release, tag, or npm publication.
