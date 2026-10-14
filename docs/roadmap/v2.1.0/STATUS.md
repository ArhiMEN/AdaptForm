# AdaptForm 2.1.0 Status

[English](STATUS.md) · [Русский](STATUS.ru.md)

## Current stage

**Stage 3 — Source delivery complete; release publication pending**

Branch: `v2.1.0` (merged into `master`)
Baseline branch: `master`  
Starting package version: `2.0.5`  
Package version in this branch: `2.1.0` (prepared for maintainer release; not published)  
Release status: Source merged into `master`; npm publication, GitHub release, and release tagging have not been performed.

Interactive demo: [https://arhimen.github.io/AdaptForm/](https://arhimen.github.io/AdaptForm/) — live in English and Russian, verified after deployment from `master`; deployment permissions allow `v2.1.0` and `master`.

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

## Previous verified implementation (before bilingual extension)

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

## Bilingual extension — 2026-10-14

- [x] Completed the English/Russian demo, persistent language selection, shareable language URLs, localized documentation links, and complete companion documents.
- [x] Kept library built-in validation messages and public APIs unchanged. Language switching preserves entered values, collection items, validation state, and serialization selection.
- [x] Added demo regression tests, documentation completeness/link checks, and package-manifest tests. The package includes English/Russian README, CHANGELOG, and license information.
- [x] Verify the final CI and Pages deployment, then merge `v2.1.0` into `master` without deleting either branch.

### Verified delivery to master

Implementation commit: `fa8a39d82a2e7f742af08e4d171dc3dab21f49de`. Branch [CI 38543186144](https://github.com/ArhiMEN/AdaptForm/actions/runs/38543186144) and [Pages deployment 38543185730](https://github.com/ArhiMEN/AdaptForm/actions/runs/38543185730) passed before merging.

Merged into `master` as [117116a](https://github.com/ArhiMEN/AdaptForm/commit/117116a107e874af7ad2121091532644e9d4ecbe). Master [CI 38543404401](https://github.com/ArhiMEN/AdaptForm/actions/runs/38543404401) and [Pages deployment 38543404388](https://github.com/ArhiMEN/AdaptForm/actions/runs/38543404388) both passed. Both branches remain present.

Live HTML, JavaScript, and CSS returned HTTP 200. The downloaded production bundle matches the local build and passed RU/EN runtime checks in jsdom, including translated errors and language-specific documentation links. These checks do not constitute a real-browser e2e run. The remaining changes only record delivery status and do not change implementation.

### Local verification of the bilingual extension

- All 367 tests across 19 files passed, including 28 new checks for demo interactions, documentation, and package manifests.
- Lint, library build, source type-check, demo type-check/build, separate new-test type-check, and package-content verification passed. The package has 21 files, including the three Russian companion documents; no npm publication was performed.
- `npm audit --audit-level=moderate` reported zero known vulnerabilities.
- The same exploratory test type-check failures were reproduced against the pre-change commit `e829bad` in an isolated temporary snapshot.

| Changed runtime file | Lines | Branches | Functions |
|---|---|---|---|
| `demo/main.ts` | 100% | 95.89% | 100% |
| `demo/i18n.ts` | 100% | 100% | 100% |
| `demo/translations.ts` | 100% | 100% | 100% |
| `scripts/check-package-content.mjs` | 100% | 100% | 100% |

### Verification scope

The required source type-check and demo type-check pass. An additional exploratory `tsconfig.test.json` check exposes pre-existing test typing problems (such as zero-argument type constructors, intentionally asynchronous validators, and recursive type instantiation). This is not a configured CI gate; the runtime regression suite remains the test acceptance criterion. New test typing is checked separately. No standalone browser e2e framework is configured; demo interaction coverage uses the existing Vitest/jsdom setup.

## Deferred follow-up — outside this branch's acceptance criteria

- Validation-message localization and any change to the public message contract.
- Structured error codes/parameters for localization.
- PlayLease integration tests, adapter changes, and application-specific compatibility checks.
- Package version bump, npm publication, and release tagging. These require explicit approval.

## Known limitations

### npm publication automation — 2026-10-14

The maintainer requested automatic npm publication after merges into `master`, using the version in `package.json`. The guarded workflow and release preflight are prepared, with seven new regression tests. Activation remains pending: npm rejected Trusted Publisher management with HTTP 403, asking the account owner to enable 2FA. No GitHub npm secret is configured. The workflow skips publication until either the npm Trusted Publisher or a granular `NPM_TOKEN` secret is configured and `NPM_PUBLISH_ENABLED=true`. This setup does not create tags or GitHub releases. See [setup instructions](../../NPM_PUBLISH.md).


- Both permitted branches share one live demo URL; the latest successful deployment replaces the previous site. Automatic deployment from `master` has been verified.

- Legacy callback APIs still contain some `any` types where replacing them with `unknown` would cause a source-compatibility change. Form value inference, serialization results, and nested collection values have been made more precise without broad callback API changes.
- No PlayLease application runtime or integration suite was run, by explicit scope decision.
- The latest published npm version remains `2.0.5`; this branch is prepared as `2.1.0` but has not been released.

## Final checklist

- [x] Correctness fixes have regression tests.
- [x] Lint, tests, build, type-check, dependency audit, and package-content validation pass in CI.
- [x] Documentation and tracking files are updated in English and Russian, excluding deferred user-facing validation/error text.
- [x] No duplicate implementation was added where existing logic could be improved.
- [x] Repository and branch safety constraints were preserved.
- [x] Confirm the final branch CI after the last code and documentation updates.
- [x] Prepare version `2.1.0` in package metadata and changelog without publishing or tagging.
- [x] Enable GitHub Pages in repository settings, allow both deployment branches, rerun deployment, and verify the live demo URL and assets.
- [ ] Obtain explicit approval before creating a GitHub release, tag, or npm publication.
