# AdaptForm 2.1.1 — release preparation

[English](RELEASE.md) · [Русский](RELEASE.ru.md)

## Status

**Source prepared and merged into `master`; NOT published to npm.** The 2.1.1 package metadata was squash-merged in [PR #14](https://github.com/ArhiMEN/AdaptForm/pull/14) as `a048dfef779ebc62669d4ed38ab36f81cf7d6d25`. No GitHub release or tag was created. The published npm `latest` was `2.1.0` when preparation began on 2026-10-17; the registry did not list `2.1.1`. Recheck at actual publication time.

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

- [x] PR for this release preparation reviewed; verify the diff contains only version metadata, release documentation and precise README notes.
- [x] Release candidate GitHub Actions `verify` succeeds (includes `npm ci`, dependency audit, lint, full tests, build, package integrity, TypeScript source/demo checks and demo build).
- [x] GitGuardian security check succeeds.
- [x] Verify the package version is still unpublished; confirm `package.json`/`package-lock.json` agree.
- [ ] Confirm `NPM_PUBLISH_ENABLED` is **not `true`** before any version-bump merge intended as preparation only. The publish workflow automatically executes after successful `master` CI when that variable is enabled; the GitHub connector currently does not establish its value.
- [ ] Independently authorize the actual npm publication and decide release/tag policy; never treat a merge as authorization to publish.
- [ ] After publication, verify the npm registry version, dist tag and package tarball, then change this document/CHANGELOG from Unreleased to the actual date.

## Verified result after merge — 2026-10-17

- [Master CI #39022290980](https://github.com/ArhiMEN/AdaptForm/actions/runs/39022290980) succeeded; [demo deployment #39022290982](https://github.com/ArhiMEN/AdaptForm/actions/runs/39022290982) succeeded.
- [Publish npm package #39022327944](https://github.com/ArhiMEN/AdaptForm/actions/runs/39022327944) **skipped**. Historical runs also skipped, but the actual `NPM_PUBLISH_ENABLED` variable is not readable through the connector. This is evidence of no GitHub Actions publication from the merge, not proof of permanent configuration.
- Public registry's `latest` remained `2.1.0` when rechecked after merging. The 2.1.1 source lives in master, not yet npm.
- The final PR CI passed all **477 tests**, lint, source and demo types, package verification, builds, dependency audit and GitGuardian. The existing 54 diagnostics in the separate test type-check were not fixed.

## Known technical debt

- The separate exploratory `npx tsc --noEmit -p tsconfig.test.json` reports **54 previously existing diagnostics** (not new in HF-002/HF-003); the CI source and demo type checks are distinct and pass. Resolve this separately, not in the patch release.
- No real browser E2E, dependent-application integration or HF-004 reset semantics regression was added specifically for this release.

## Safe publication handoff

Do not run `npm publish`, create GitHub Release, create tags, modify npm credentials or enable automated publishing as part of this preparation. Before actual publication, follow [NPM_PUBLISH.md](../../NPM_PUBLISH.md) and validate the released tarball. Keep all existing Git branches.
