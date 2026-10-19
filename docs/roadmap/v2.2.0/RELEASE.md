# AdaptForm 2.2.0 — release candidate checklist

[English](RELEASE.md) · [Русский](RELEASE.ru.md)

## Status and authority

**2.2.0 source/package metadata merged into `master`; npm NOT published.** [Release PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18) was accepted as squash commit `f717b8d590d1b753d5958b2ba19aa1b3e3aeef0a`. This is a prepared source version, not a published npm version, Git tag or GitHub Release.

The last independently verified public npm `latest` is **2.1.0** (checked 2026-10-19). The repository previously prepared **2.1.1** in `master` but the publish job was skipped. There is no requirement to publish 2.1.1 before 2.2.0; npm version publication, if ever authorized, still requires checking registry state and npm ownership.

## Approved scope

The accepted [HF-005–HF-010 PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) provides:

| Workstream | User-facing change |
| --- | --- |
| HF-005 | Lifecycle, touched/dirty/baseline semantics and compatibility contract |
| HF-006 | `Field.isDirty` and cleaned `commitBaseline()` |
| HF-007 | `Form`, `ArrayField`, `ArrayFormField` dirty and baseline aggregation |
| HF-008 | `subscribe()`, unsubscribe, immutable stable `getSnapshot()` and exported snapshot types |
| HF-009 | Synchronous nested `Form.batch()`, final automatic validation and no rollback on errors |
| HF-010 | Parent-child change propagation and cleanup for removed/replaced descendants |
| Independent-review repair | `remove()/clear()` defer automatic collection validation inside batch |
| Error aggregation | `Form.allErrors` copies child error arrays to prevent read-time mutation/freezing |

No HF-004 reset membership redesign, `reinitialize()`, HF-011+, async validators, submission lifecycle, framework adapters, new mandatory runtime dependencies or new serialization format.

## Developer contract / migration

- Existing class-based Form and Field setup works without migration. `isTouched`, synchronous validation outside batches, `isValid`, `reset()`, serialization and optional `adaptform/luxon` are unchanged.
- `commitBaseline()` accepts current cleaned values for dirty comparison, **not** `reset()` defaults. Thus `reset()` can leave a changed `isDirty`.
- Snapshots are detached immutable data representations; Dates, Maps, Sets, binary data and opaque custom instances are not necessarily the original data objects.
- `Form.batch()` delays **automatic** final validation and notifications. Explicit `checkValid()` calls still run immediately; callbacks must be synchronous and completed changes do not roll back on exceptions.
- Direct in-place mutations of legacy arrays/options, custom objects or arbitrary Form-property replacement are not automatically observed. Invoke supported methods or re-read the snapshot.
- Validate before submitting: `toJSON()` still does not validate. See [usage](../../ai/HEADLESS_STATE_USAGE.md), [contract](../../ai/HEADLESS_STATE_CONTRACT.md) and [changelog](../../../CHANGELOG.md).

## Packaging

- `package.json`, `package-lock.json.version`, and `package-lock.json.packages[""].version` must match **2.2.0**.
- Preserve the `.` and `./luxon` exports (ESM, CJS and .d.ts), optional Luxon peer dependency, package allowlist and no required runtime dependencies.
- Keep README, changelog, usage guides, decisions and release docs in English and Russian. Mark npm distribution **unpublished** until independently verified.
- Do not change the GitHub Actions npm publishing workflow, its credentials or `NPM_PUBLISH_ENABLED`.

## Release acceptance checks

- [x] HF-005–HF-010 independently reviewed and merged: [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16), `e6b596de5eceecf2c235000f3d683d4a745cb44e`.
- [x] Accepted implementation CI: **563/563 tests across 27 files**, lint, source/demo types, ESM/CJS/TS builds, package check and audit 0. [CI after merge](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203071) PASS. [Documentation PR #17](https://github.com/ArhiMEN/AdaptForm/pull/17) accepted; [master CI](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197519427) PASS, npm publish skipped.
- [x] Review the **2.2.0 release candidate** diff and approve documentation and package metadata ([PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18)).
- [x] Release candidate [CI #39198931542](https://github.com/ArhiMEN/AdaptForm/actions/runs/39198931542) `verify` and GitGuardian passed with updated manifest/lockfile, README and changelog (563/563 tests).
- [x] Post-merge [master CI #39199058088](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058088) PASS, [demo deploy #39199058150](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058150) PASS, [npm publish workflow #39199123153](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199123153) SKIPPED.
- [ ] If publishing to npm becomes an explicit request, recheck registry versions and configured publishing permissions before starting; decide whether to create a tag/GitHub Release.

## Known limits and debt

- Exploratory `npx tsc --noEmit -p tsconfig.test.json` retains **54 earlier diagnostics**. They were compared to the unmodified base during HF-005–HF-010; this check is **not** green. The historical mapped-type `TS2589` also reproduces on the old base.
- No dedicated profiling/GC-proof, benchmark, real-world dependent-application integration or stress performance result is claimed. Snapshot traversal/recomparison costs increase with form size/depth.
- HF-004 (collection reset membership), `reinitialize()`, stable IDs, trigger policies, dependency DAG and async/submission/UI adapters are not part of this release.

## Trusted Publisher activation — 2026-10-19

- The maintainer confirmed configuring npm Trusted Publisher and enabling the repository variable `NPM_PUBLISH_ENABLED=true`. This is a **reported setting**, not a GitHub-variable/API read.
- The maintainer explicitly requested the first automatic publication attempt for version **2.2.0**. This documentation-only merge is intended to trigger new CI on `master`, followed by the guarded `Publish npm package` workflow. Record success only after inspecting the publish run and public npm registry.
- Do not create a GitHub Release or tag or remove any branch during this activation.

## Publication restriction

**Version 2.2.0's first automatic npm publication was separately requested and is authorized for this trigger. This does not authorize tags, GitHub Releases or unreviewed future code changes.** The [publication workflow](../../NPM_PUBLISH.md) can auto-publish an unpublished version only if `NPM_PUBLISH_ENABLED=true` following master CI; historically it has been skipped. Verify the workflow outcome after merge, rather than inferring a permanent configuration state. Preserve every existing Git branch.
