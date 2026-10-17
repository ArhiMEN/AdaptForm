# AdaptForm 2.1.1 — release preparation

[English](RELEASE.md) · [Русский](RELEASE.ru.md)

## Status

**Prepared release candidate; NOT published to npm.** This document tracks the 2.1.1 package metadata and release readiness; it is not a GitHub release or tag. The published npm `latest` was `2.1.0` when preparation began on 2026-10-17; the registry did not list `2.1.1`. Recheck at actual publication time.

## Release scope

| Item | Included | Reference |
| --- | --- | --- |
| HF-001 lifecycle characterization | Tests/documentation only | [PR #8](https://github.com/ArhiMEN/AdaptForm/pull/8) |
| HF-002 deferred `ArrayField` validation | Yes, bug fix | [PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10) |
| HF-003 incomplete `DecimalType` validation | Yes, bug fix | [PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12) |
| HF-004 and later / headless engine API | No | [Roadmap](../../ai/HEADLESS_ROADMAP.md) |
| npm authentication or publication workflow changes | No | [Publication guide](../../NPM_PUBLISH.md) |

No new public types, serialization format, mandatory runtime dependencies, framework adapters or demo features. In particular, `toJSON()` still serializes unchecked values; applications must validate before submitting. Trailing-point numbers now fail validation intentionally. `ArrayField.itemsValue` remains available.

## Package inputs

- `package.json` and the root entry of `package-lock.json` must both declare **2.1.1**.
- Changelog and README companions must remain aligned in EN/RU, and release notes must clearly state **Unreleased** until actually published.
- Existing package exports `.` and `./luxon` must retain ESM, CommonJS and TypeScript declarations.
- Keep the packaged file allowlist, `luxon` optional peer dependency and release workflow unchanged.

## Required gates

- [ ] PR for this release preparation reviewed; verify the diff contains only version metadata, release documentation and precise README notes.
- [ ] Release candidate GitHub Actions `verify` succeeds (includes `npm ci`, dependency audit, lint, full tests, build, package integrity, TypeScript source/demo checks and demo build).
- [ ] GitGuardian security check succeeds.
- [ ] Verify the package version is still unpublished; confirm `package.json`/`package-lock.json` agree.
- [ ] Confirm `NPM_PUBLISH_ENABLED` is **not `true`** before any version-bump merge intended as preparation only. The publish workflow automatically executes after successful `master` CI when that variable is enabled; the GitHub connector currently does not establish its value.
- [ ] Independently authorize the actual npm publication and decide release/tag policy; never treat a merge as authorization to publish.
- [ ] After publication, verify the npm registry version, dist tag and package tarball, then change this document/CHANGELOG from Unreleased to the actual date.

## Known technical debt

- The separate exploratory `npx tsc --noEmit -p tsconfig.test.json` reports **54 previously existing diagnostics** (not new in HF-002/HF-003); the CI source and demo type checks are distinct and pass. Resolve this separately, not in the patch release.
- No real browser E2E, dependent-application integration or HF-004 reset semantics regression was added specifically for this release.

## Safe publication handoff

Do not run `npm publish`, create GitHub Release, create tags, modify npm credentials or enable automated publishing as part of this preparation. Before actual publication, follow [NPM_PUBLISH.md](../../NPM_PUBLISH.md) and validate the released tarball. Keep all existing Git branches.
