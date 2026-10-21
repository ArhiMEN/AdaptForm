# PERF-01 — reactive engine performance

[English](PERFORMANCE.md) · [Русский](PERFORMANCE.ru.md)

Measured 2026-10-21 on `feature/v2.3.0-performance`, based on master `7d9a13bfd9578e0119a59cc4550b305906fe1e39` (accepted foundation PR #25). Runtime/test commit: `6fd81ccb2fd264cf45b5290724735a1541f24639`. Package remains **2.2.0**; no public API, dependency, validation, reset, serialization or collection identity changes. No merge, publication, release, tag or branch removal.

## Evidence and causes

The unchanged [harness](../../../scripts/benchmark-headless.mjs) runs built ESM. Full seven-sample medians/min/max, iteration counts and GC samples: [before](benchmark-performance-before.json), [after](benchmark-performance-after.json). Both reports use the same environment: Linux 6.18.55 x64, Intel Xeon Platinum 8370C (3 visible CPUs), Node 24.19.0 / V8 13.6.233.17-node.51. Five warmups, seven samples, target 25 ms, at most 100 iterations per sample; per-operation timer overhead included, fixture preparation/cleanup excluded. Add/remove is a pair: unvalidated add followed by existing full automatic remove validation. These runs have no concurrent verification commands; the shared host is not exclusive. Earlier 4.84/5.82/245 ms figures came from a different run/CPU and are not used as this comparison's denominator.

A separate CPU-profiled baseline run identified self-sample hotspots: `reconcile` (4477), `freezeSnapshot` (2175), `_fields` discovery (1981), `equalValue` (1316). These counts cover the entire mixed harness, not percentages or attribution for an individual scenario; the timed baseline above was rerun without profiling.

- Every child validation propagated `changed()` through ancestors and rebuilt their child sets. Validating N children repeatedly scanned N siblings, amplifying observed collection updates toward quadratic work.
- Unchanged reads recaptured all values/errors/metadata and descendants, then recursively froze and structurally compared the new graph. Stable identity alone did not avoid capture work.
- Form capture repeatedly rediscovered fields for separate aggregate getters. Nested capture and flush repeated child refreshes and freezing of already immutable subtrees.

## Optimizations

- Separate local membership reconciliation from ancestor invalidation. Direct structural mutations still reconcile immediately, including removal inside batch; subscribe/unsubscribe and public reads still reconcile ownership.
- Mark dirty stores and use one check epoch per public pull/flush wave. Refresh each reachable store once per wave; preserve snapshot-reference equality for equivalent state and use reference comparison for notification selection after refresh.
- Reuse scalar Field snapshots and unchanged Form/collection aggregates based on child snapshot references, metadata, errors and ordered collection IDs. Reuse field discovery only within a Form capture, with `finally` cleanup.
- Use a weak registry of recursively frozen snapshot objects to skip repeated freezing of engine-owned immutable subtrees; shallow-frozen caller objects are not assumed deeply frozen.
- Preserve compatibility checks for externally edited values/errors/legacy arrays, property replacement/addition/removal, mutable Date/Map/Set/cyclic values, and custom getters/capture overrides. Public pulls and mutation finalization still probe descendants; cached aggregates do not bypass custom derived getters. No Proxy, dependency graph, scheduler redesign or new public cache API.

## Results

Median sample means, ms per operation:

| Operation | Before, ms | After, ms | Before / after |
| --- | ---: | ---: | ---: |
| Create 1000 fields | 2.0607 | 1.6806 | 1.23× |
| First snapshot, 1000 fields | 6.0533 | 4.0629 | 1.49× |
| Unchanged snapshot, 1000 fields | 6.4259 | 1.3986 | 4.59× |
| Unobserved field write | 0.0030 | 0.0030 | 1.02× |
| Field write, 1 root subscriber | 7.5920 | 2.7286 | 2.78× |
| Field write, 100 snapshot-reading subscribers | 7.7227 | 2.6617 | 2.90× |
| Batch of 10 writes, 1000 fields | 12.0986 | 3.2163 | 3.76× |
| Add/remove, 1000 fields | 195.5018 | 2.6473 | 73.85× |
| Add/remove, 1000 nested forms | 297.7387 | 13.4752 | 22.10× |
| Leaf change, depth 5 | 2.0575 | 0.2983 | 6.90× |

Reproduce on the revision being measured (build each revision separately):

```sh
npm run build
node --expose-gc scripts/benchmark-headless.mjs work/benchmark.json
```

## Verification

**606 tests passed / 31 files**, including **15 new PERF-01 regressions**. The new file covers stable cached aggregates, nested unobserved writes and unsubscribe/reconnect, direct property/legacy membership edits, detached ownership, mutable/cyclic values and external errors, sibling refresh on a library mutation, batch equivalent-state/exception/validation counts, reentrant delivery/shared children, baseline/reset/serialization, custom getters/capture overrides, dynamic fields and a deterministic bound on membership discovery during 100-child validation. Existing identity, collection-batch, nested lifecycle, validation and serialization suites also pass.

Executed successfully: `npm test`, `npm run lint`, `npx tsc --noEmit -p tsconfig.json`, `npx tsc --noEmit -p tsconfig.test.json`, `npm run build`, `npm run check:package` (**21 files**), `npm run check:demo`, `npm run build:demo`, `npm audit --audit-level=moderate` (**0 vulnerabilities**), `git diff --check`, and the existing complete benchmark harness with `--expose-gc` before/after. Remote PR checks are tracked separately; local checks do not pre-claim CI success.

## Remaining limits and tradeoffs

- Unchanged public root reads still probe descendants in O(N) for compatibility with arbitrary external edits. Mutable structured values still require capture/comparison. The optimization does not promise O(1) snapshots.
- Collection remove still validates every surviving child, preserving invocation counts and validation context. Aggregate dirty/content checks and changed snapshots remain proportional to supported content/depth; no selective validation or dependency engine.
- Weak caches add memory overhead. Six post-GC heap samples before: **11,604,088–11,661,480 bytes** (first → last 11,604,088 → 11,650,472); after: **14,050,648–14,085,472 bytes** (14,050,648 → 14,085,472). The higher warmed heap is an observed tradeoff, not a retained-object/leak attribution. Short fixed GC workloads cannot prove absence of leaks or represent all consumer lifetimes.
- Shared-host timings vary; raw ranges are retained, small changes (especially the unobserved write) are inconclusive. No CI timing thresholds or universal latency guarantee. Custom getter/capture overrides intentionally use the compatible capture path and may benefit less.
