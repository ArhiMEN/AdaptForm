# HF-015 — verification and performance

[English](ERRORS_VERIFICATION.md) · [Русский](ERRORS_VERIFICATION.ru.md)

Base: master `b9051dd9f8eae4894a75356e03f5247447db7bf0`; verified source: `934b378b847749aef3f256ab36fca79d448fa459`. Version **2.2.0**, dependencies and lockfile unchanged. [Contract](../../ai/HEADLESS_ERRORS.md).

## Checks

[PR #28](https://github.com/ArhiMEN/AdaptForm/pull/28) is open against master. [CI #40082508903](https://github.com/ArhiMEN/AdaptForm/actions/runs/40082508903) on `69f0878` failed at Audit dependencies: undici, 1 high + transitive jsdom moderate; subsequent checks were skipped. Logs confirm the dependency blocker, not a failing HF-015 test. [PR checks](https://github.com/ArhiMEN/AdaptForm/pull/28/checks) are authoritative for later documentation-only commits.

- `npm test`: **711 tests / 33 files**, including 51 new HF-015 regressions. The final full run includes the empty-error optimization.
- PASS: `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, `npx tsc --noEmit -p tsconfig.test.json`, `npm run check:demo`, `npm run build`, `npm run check:package` (21 files), `npm run build:demo`, demo output presence, `git diff --check`, local Markdown links and matching EN/RU examples.
- Fresh `npm pack` checked in an isolated temporary directory: strict NodeNext `.mts`/`.cts` consumers compile with `skipLibCheck: false`; ESM/CJS run without installed Luxon. Verified type exports, new callbacks/paths/server errors/snapshots, value inference and negative declaration cases. Optional Luxon is covered by unit tests and source compilation.
- `npm audit --audit-level=moderate`: **FAIL**, existing high-severity `undici 7.29.1` findings (GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472, GHSA-xjj6-f33q-929c). The same high-severity findings reproduce on an untouched master archive with a byte-identical lockfile; that run also reported a transitive jsdom moderate. `npm audit --omit=dev --audit-level=moderate`: **0 vulnerabilities**. This existing dev-dependency issue can stop PR CI at audit; dependencies/workflows were not changed.

Regressions cover duplicate codes, multiple errors, missing messages, params/data detachment, every built-in code family and Luxon, legacy JS results and FieldType/subclass setters, mutable errors, new callbacks, both server inputs and schemas/transformers, globals, nested/literal paths, scalar/form collections, move/remove, clearing, immutable/stable snapshots, metadata-only notifications, batch/HF-013 and unchanged rule counts on 1000 fields.

## Full benchmark

Unchanged [harness](../../../scripts/benchmark-headless.mjs), separately built baseline/current, no concurrent tests/builds during measurement. Node v24.19.0, INTEL(R) XEON(R) PLATINUM 8573C, 3 visible CPUs; shared host is not exclusive. Five warmups, seven samples, at most 100 iterations, target 25 ms. Raw results: [before](benchmark-errors-before.json), [after](benchmark-errors-after.json). Baseline commit metadata is corrected to the actual archived runtime revision: the harness reads git SHA from the caller cwd; the original is preserved as `harnessReportedCommit`. Both loaded ESM artifact SHA256 values are included.

| Operation | Before, ms | After, ms | Change |
| --- | ---: | ---: | ---: |
| `flat/1000/create` | 2.3938 | 2.5128 | +5.0% |
| `flat/1000/firstSnapshot` | 4.2662 | 4.5073 | +5.7% |
| `flat/1000/unchangedSnapshot` | 1.6434 | 1.9798 | +20.5% |
| `flat/1000/notify1/empty` | 2.9376 | 3.0557 | +4.0% |
| `flat/1000/batch10` | 4.4880 | 5.1457 | +14.7% |
| `collection/fields/1000/addRemove` | 2.8272 | 3.9020 | +38.0% |
| `collection/forms/1000/addRemove` | 14.3237 | 21.8226 | +52.4% |

## Paired comparison

The full harness showed timing drift, especially in later collection operations. An additional [paired probe](../../../scripts/benchmark-error-model.mjs) loads both builds in one process, alternates baseline/current order, and uses 20 warmups and 9 samples of 20 iterations for each 1000-node scenario. [All samples](benchmark-errors-paired.json).

| Operation | Before, ms | After, ms | Change |
| --- | ---: | ---: | ---: |
| `unchangedSnapshot` | 1.5923 | 1.7364 | +9.0% |
| `observedWrite` | 4.0814 | 3.9617 | -2.9% |
| `batch10` | 6.8733 | 6.8300 | -0.6% |
| `fieldAddRemove` | 2.7187 | 3.0018 | +10.4% |
| `formAddRemove` | 13.7967 | 14.8258 | +7.5% |

```sh
npm run build
node --expose-gc scripts/benchmark-headless.mjs work/errors-after.json
node scripts/benchmark-error-model.mjs /path/to/baseline/dist/index.mjs work/errors-paired.json
```

Build the baseline separately from master `b9051dd`. The caller creates the output directory. Reproducibility covers scenarios, not exact milliseconds.

## Model cost and limits

Constant overhead is expected: one ErrorState per node, mutable string-facade reconciliation and an additional structured-metadata reference check during capture. The empty immutable list is shared; empty reads allocate no callbacks/params/paths. Aggregate paths are created only on `getErrors()`, not at every ancestor during mutations. Scheduling, validation traversal and subscription infrastructure are not expanded; deterministic tests verify unchanged rule and notification counts.

The paired probe shows about 9% cost for unchanged snapshots, 8–10% for collection operations and no observed write/batch slowdown in that run. The full harness contains larger deviations (including about 52% for form add/remove); these are retained rather than claimed to be absent regressions. Few iterations of expensive cases and shared-host drift limit conclusions. Metadata has measurable cost; there is no claim of zero slowdown or universal latency thresholds. The initial substantial allocation overhead from empty arrays/closures was reduced before final measurement.

Six full-harness post-GC heap samples: baseline **14,091,176–14,125,872 bytes**, current **14,416,864–14,487,984 bytes**. Additional state objects cost memory; short probes cannot establish presence/absence of leaks. Reconciliation of a changed legacy array with many duplicates may be quadratic; normal unchanged reads remain proportional to nodes/errors as described in the contract. Remote CI and independent PR acceptance are tracked separately; no merge/publication performed.
