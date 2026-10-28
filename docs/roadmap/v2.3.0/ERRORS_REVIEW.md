# HF-015 — independent review and repair, 2026-10-28

[English](ERRORS_REVIEW.md) · [Русский](ERRORS_REVIEW.ru.md)

**PASS_WITH_LIMITATIONS**. [PR #28](https://github.com/ArhiMEN/AdaptForm/pull/28) is technically ready for independent acceptance of the scoped implementation; its audit gate remains blocked. Reviewed head `66fcbd8`, repaired code `8909fdf`, current master/base `b9051dd`; master is an ancestor, no merge/rebase required. Version stays **2.2.0**. Dependencies, lockfile and workflows are unchanged. No merge, publication, tag, release or branch removal.

## Findings and fixes

| Severity | Confirmed defect | Minimal repair |
| --- | --- | --- |
| Medium | Module-wide server provenance leaked into unrelated manual writes from subclass setters/callbacks, including other global keys. | Scope provenance to the actual receiving node and, for global errors, its exact key. Scope each dispatched setter separately; restore nested scopes with `finally`. Preserve virtual setter dispatch and repeated superclass delegation. |
| Medium | Unknown prototype-named server paths (`constructor`, `__proto__`, `toString`) could throw during `allErrors`/snapshot publication; legacy routing also treated inherited objects as fields and wrote their `.error` property, and legacy schema projections could discard `__proto__`. | Route only own fields, test own error keys and define an ordinary own property safely; define schema projection keys safely too; retain ordinary object return shapes. |
| Low | The compatibility bridge for an overridden `parseErrors()` returned an unfrozen structured list. | Freeze the bridge result like the standard parser result. |

Each defect was reproduced with a failing test before its repair. Added nine focused review cases; previous HF-015 cases remain. No mechanism was replaced for style or speculative performance improvements.

Unconfirmed concerns: nested synchronous scope restoration and exception cleanup, post-commit reentrant subscriber provenance, duplicate-code retention, repeated equivalent server-import notifications, recursive replacement, scalar/form collections and current paths after move/remove. Existing tests plus review cases verify these contracts. New import uses the lossless parser; old `form.errors` retains the historical parser, transformers, last-message projection and scalar collection routing. Explicit typed paths disambiguate literal dotted names. Static/dynamic priorities, fallback, schema composition and legacy subclass parsing retain their existing owners/tests. Inputs cannot override server provenance.

## Synchronous boundary

The small module-local context is now receiver/key scoped, rather than a source for every manual write on the stack. Nested imports replace/restore it, and exceptions always restore it. Repeated superclass calls for the same receiver/key inside its dispatched setter are intentionally part of that server operation, including transformed messages. Arbitrary recursive writes to that identical setter/key cannot convey a distinct caller intent; use the explicit local `setErrors(inputs, source)` API when that distinction matters. Other nodes/keys and callbacks after scope exit get `external`. Notifications are committed after the outer synchronous mutation, so reentrant subscribers start after the scope has unwound.

This is a synchronous dispatch bridge, not an async context. It must not be held across `await`; delayed writes are external unless provenance is explicit. HF-016 will require an explicitly owned result and stale-result policy. No HF-016 implementation, AsyncLocalStorage or new dependency was introduced.

## Verification

All executed on Node **24.19.0** with the existing installed lockfile:

- `npm test`: **720 tests / 34 files**, including HF-011 identity, HF-013 dependencies and PR #26 performance regressions; focused structured suites: **60 tests**.
- PASS: `npm run lint`; `npx tsc --noEmit -p tsconfig.json`; `npx tsc --noEmit -p tsconfig.test.json`; `npm run check:demo`.
- PASS: `npm run build` (ESM/CJS/declarations); `npm run check:package` (**21 files**); `npm run build:demo`; demo output presence; `git diff --check`.
- Fresh `npm pack`, extracted outside the repository with no installed Luxon: strict NodeNext `.mts`/`.cts` consumers compile with `skipLibCheck: false`, structured imports/value inference/negative type cases pass, ESM/CJS runtimes pass, and `require.resolve('luxon')` fails as expected. Optional Luxon remains covered in unit tests.
- Same deterministic 1000-field probe on master, original PR and fixed source: three unchanged reads **0 validators / 0 notifications**; one validated write **1 / 1**; ten writes in a batch **1000 / 1** (legacy full validation). [Raw counts](hf015-review/counts.json), [probe](hf015-review/counts.mjs).

## Performance

Existing [full harness](../../../scripts/benchmark-headless.mjs) and [paired harness](../../../scripts/benchmark-error-model.mjs), unchanged settings. Separate builds from archived master/original PR and the repaired source share the same node_modules. No concurrent tests/builds/benchmarks during timing. AMD EPYC 9V74, 3 visible CPUs, Node 24.19.0, shared host. Full: 5 warmups, 7 samples, target 25 ms, up to 100 iterations; paired: 20 warmups, 9 alternating samples of 20 iterations. Original historical [measurements](ERRORS_VERIFICATION.md) and all raw files remain unchanged.

Full harness, master → repaired source (ms/op):

| Operation | Master | Fixed | Change |
| --- | ---: | ---: | ---: |
| 1000 fields, create | 1.4870 | 1.7930 | +20.6% |
| First snapshot | 2.9874 | 3.3256 | +11.3% |
| Unchanged snapshot | 1.1126 | 1.1944 | +7.4% |
| One unobserved field write | 0.00232 | 0.00228 | -1.7% |
| One observed write | 2.1658 | 2.3250 | +7.4% |
| Batch of ten | 2.9434 | 3.1570 | +7.3% |
| 1000 scalar items, add/remove | 1.6215 | 2.0088 | +23.9% |
| 1000 nested forms, add/remove | 9.9040 | 11.3496 | +14.6% |
| Five-level nested leaf write | 0.1634 | 0.1907 | +16.7% |

Paired probes (ms/op):

| Operation | Master → fixed | Change | Original PR → fixed | Change |
| --- | ---: | ---: | ---: | ---: |
| Unchanged snapshot | 1.1916 → 1.1324 | -5.0% | 1.1593 → 1.1429 | -1.4% |
| Observed write | 2.2706 → 2.3233 | +2.3% | 2.4400 → 2.2183 | -9.1% |
| Batch of ten | 4.7592 → 4.7117 | -1.0% | 4.7291 → 4.8333 | +2.2% |
| Scalar add/remove | 1.8063 → 1.9126 | +5.9% | 1.9143 → 1.8705 | -2.3% |
| Form add/remove | 10.6835 → 10.9405 | +2.4% | 10.9993 → 10.8265 | -1.6% |

[Full master](hf015-review/benchmark-master.json), [full fixed](hf015-review/benchmark-fixed.json), [paired master/fixed](hf015-review/paired-master-fixed.json), [paired original/fixed](hf015-review/paired-pr-fixed.json). Artifact SHA256s are recorded; harness-reported git metadata is retained separately because archives reside under the working repository.

Initial review-iteration raw fixed/paired measurements are also retained as `hf015-review/initial-*.json`; the tables use the final repaired artifact.

Post-GC heap, six fixed workloads: master **14,134,312–14,198,912 B**, fixed **14,418,176–14,474,096 B**, about **0.3 MiB** extra. This is not a leak test or allocation profile. One ErrorState per node, retained metadata and compatibility reconciliation explain a necessary constant cost for this design; exact attribution requires profiling. Shared empty lists and aggregate-path-on-demand optimization already exist. Review found no additional traversal/validator scheduling or obvious hot-path allocation to remove safely. Repair touches manual error ingestion, not unchanged-read scheduling. Sign changes between full/paired readings show noise; no speedup, zero-regression or universal latency guarantee is claimed. Scalar collection overhead remains measurable and must be accepted with the feature.

Reproduce after `npm run build` and building archives under `work/master` and `work/pr-head`:

```sh
# Full baseline: run from work/master so its relative dist import loads master.
node --expose-gc scripts/benchmark-headless.mjs /absolute/output/master.json
# Remaining commands: run from repository root.
node --expose-gc scripts/benchmark-headless.mjs work/fixed.json
node scripts/benchmark-error-model.mjs work/master/dist/index.mjs work/paired-master.json
node scripts/benchmark-error-model.mjs work/pr-head/dist/index.mjs work/paired-pr.json
node docs/roadmap/v2.3.0/hf015-review/counts.mjs
```

## CI and dependency plan — separate approval required

Original-head [CI run 40082651820](https://github.com/ArhiMEN/AdaptForm/actions/runs/40082651820), `66fcbd8`: install passed, audit failed, lint/tests/build/types skipped; GitGuardian passed. [Saved steps](hf015-review/ci-original-head.json). [Current PR checks](https://github.com/ArhiMEN/AdaptForm/pull/28/checks) remain authoritative after pushing the repair; local checks do not replace them.

Current [audit](hf015-review/audit.json) reports **one high vulnerable package**, `undici@7.29.1`, with **eight advisories**: GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c, GHSA-4w7w-5xrc-9h26, GHSA-2m5v-pch6-74hx, GHSA-qrxm-fqhp-jwvm, GHSA-9fm3-97px-rjf6, GHSA-55wc-3pg8-jfw6. [Untouched master audit](hf015-review/audit-master.json) confirms the same vulnerable undici plus a derived moderate jsdom entry. Both use byte-identical manifest/lockfile; aggregate parent findings can differ between audit invocations. [Production-only audit](hf015-review/audit-production.json): **zero vulnerabilities**.

Chain: direct dev `jsdom@29.1.1` → `undici@^7.25.0`, forced by root `overrides.undici = 7.29.1`; Vitest also consumes jsdom as an optional peer. No production runtime dependency introduces undici. Minimum fix for all eight observed advisory ranges: **undici 7.30.1**, confirmed present and without known findings by [NPMScan](https://npmscan.com/package/undici) and npm advisory ranges. No install/preinstall/postinstall scripts were found. A clean lookup is time-specific, not a guarantee.

Proposed separately approved change:

1. Change only `overrides.undici` **7.29.1 → 7.30.1**, retain **jsdom 29.1.1**, Vitest and other direct versions. Regenerate the corresponding lock resolution/integrity and review for unrelated churn. Updating jsdom alone cannot bypass the current override.
2. Run clean `npm ci`, both audits and the full existing lint/test/type/build/package/demo/packed checks, including CI Node 22. No workflow/threshold/exclusion changes.
3. Review jsdom HTTP/fetch/resource-loader behavior. Undici retains `engines.node >=20.18.1` across these two versions; jsdom already requires `^20.19.0 || ^22.13.0 || >=24.0.0`. This does not raise the dev Node floor or the library's declared **Node >=16** runtime floor; this review's local execution was Node 24, not an exhaustive Node-version matrix. The packed core has no mandatory undici or Luxon dependency.

This plan was not executed: no dependency or lockfile edits, no security gate bypass. Remaining acceptance limits: red audit CI pending separate approval, shared-host timing variance, ambiguous identical legacy-string edits and same-target setter intent, synchronous-only provenance, no async/stale-result fencing. Independent code acceptance can proceed with these explicit limits; merge should wait for the separately resolved audit gate and final-head review.
