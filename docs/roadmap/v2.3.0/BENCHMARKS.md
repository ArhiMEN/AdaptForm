# STAB-02 — headless engine measurements

[English](BENCHMARKS.md) · [Русский](BENCHMARKS.ru.md)

Baseline: STAB-01 `51dc501`, unchanged package 2.2.0. Full data (each median/min/max, iteration count, environment and heap samples): [JSON](benchmark-baseline.json).

```sh
npm ci
npm run build
mkdir -p work
node --expose-gc scripts/benchmark-headless.mjs work/benchmark.json
```

Run from repository root. Without `--expose-gc`, timings still run and the memory section reports unavailable. Do not compare unbuilt source with stale dist. No required dependency or package-script change.

Environment: Linux 6.18.55 x64, Intel Xeon Platinum 8573C (3 visible CPUs), Node 24.19.0, V8 13.6.233.17-node.51. Shared cloud runner; no CPU pinning or exclusive host. Five warmup operations, seven measured samples; 1–100 operations per sample chosen from warmed timing toward 25 ms. Tables report median sample mean; raw JSON gives spread. Each operation has its own performance.now timer (overhead included); fixture preparation and cleanup excluded. Creation excludes first snapshot. First snapshot uses a fresh fixture each time. Warm unchanged reads reuse a primed form. Mutation cases change values every iteration. `oneField` is an unobserved root; notification cases include a fully observed root. `batch10` uses validation-disabled writes to isolate mutation/snapshot cost; automatic full validation is covered by collection remove. Notification tests cover 1/10/100 empty callbacks and callbacks reading the committed snapshot (reads during delivery do not recapture). Add/remove measures a pair: add with validation disabled, then remove with existing automatic validation; the collection is observed. Depth fixtures use one nested form per level and a leaf with a scalar plus two array items.

| Operation / операция (ms/op, median) | 10 | 100 | 1000 |
| --- | ---: | ---: | ---: |
| Create / создание | 0.0462 | 0.1611 | 1.2854 |
| First snapshot / первый snapshot | 0.0359 | 0.1885 | 3.9882 |
| Unchanged snapshot / неизменённый snapshot | 0.0286 | 0.2504 | 4.7935 |
| One unobserved field / одно ненаблюдаемое поле | 0.0038 | 0.0017 | 0.0018 |
| Batch 10 writes / batch 10 записей | 0.0812 | 0.4835 | 8.8103 |
| 1 subscriber / 1 подписчик | 0.0345 | 0.2609 | 5.6588 |
| 100 subscribers / 100 подписчиков | 0.0346 | 0.2774 | 6.2947 |

Observed collection add/remove pair at 10/100/1000: ArrayField **0.0970 / 1.7809 / 162.1769 ms**; ArrayFormField **0.3209 / 4.3226 / 238.4105 ms**. Observed leaf change at depths 0/1/3/5: **0.0206 / 0.0810 / 0.4502 / 1.3108 ms**. First snapshot at those depths: **0.0189 / 0.0396 / 0.1412 / 0.3084 ms**. These are measurements, not latency promises or universal complexity proofs.

## Findings and limits

Unchanged snapshot identity is stable, but reads still recapture/compare; they are not O(1). A 1000-field unchanged read costs 4.79 ms here. Large observed collection structural updates and deeper nesting are material performance concerns. Source inspection suggests repeated child membership reconciliation, aggregate traversals, capture/freezing/comparison and full validation amplify cost; this is a hypothesis for profiling, not a measured allocation/call-stack attribution. No premature scheduler/cache rewrite is included. A follow-up should profile 1000-item validation, count reconciliations/captures, and propose commit-time membership/version caching while preserving immediate detach, arbitrary-read refresh, exceptions and reentrant delivery. Do not set CI timing thresholds on this shared host.

Subscription regressions verify independent registrations of the same callback, idempotent unsubscribe, last-observer recursive link cleanup, unsubscribe during delivery, reconnect cycles, immediate detach inside batch, continued use of removed nodes and their own subscriptions. Existing nested lifecycle regressions remain passing. No runtime defect requiring a safe local correction was isolated; production scheduler is unchanged.

With `--expose-gc`, after warmup and each 200-cycle create/subscribe/add/remove/detached-edit/unsubscribe workload (depth 2), two explicit GC calls yielded heapUsed **11,489,392 → 11,533,792 bytes** across six samples (range 11,489,392–11,544,704). This short result does not prove absence of leaks, retained listeners in consumer code, long-lived retained detached nodes, native allocations or different workloads. Deterministic ownership tests provide narrower evidence about link cleanup; no forced-GC finalization deadline is asserted.

HF-011 adds identity metadata and structural operations after this baseline; final measurements are recorded separately when rerun. STAB-02 does not implement HF-020 or a performance acceptance SLA.

## Foundation rerun after HF-011

[Final raw data](benchmark-foundation.json), measured at `23b88bc` with the same harness/environment: 1000 fields create **1.3319 ms**, first snapshot **3.8017 ms**, unchanged snapshot **4.8409 ms**, batch10 **8.9550 ms**, 100 subscribers reading snapshots **5.7124 ms**. Observed 1000-item add/remove pair: fields **164.1700 ms**, forms **244.7660 ms**; depth-5 leaf change **1.4634 ms**. Heap samples **11,619,080 → 11,667,312 bytes**, range **11,619,080–11,677,872**. Timing spread/shared-host noise prevents attributing small differences to HF-011. This rerun confirms the large-collection/depth concerns remain; it is not a performance improvement or leak-proof claim.

## PERF-01 follow-up — 2026-10-21

[Measured optimization results](PERFORMANCE.md) supersede the historical unchanged-read/collection performance concerns above: same-host before/after data, CPU profile findings, compatibility regressions and memory tradeoff. Historical STAB-02 numbers remain unchanged.
