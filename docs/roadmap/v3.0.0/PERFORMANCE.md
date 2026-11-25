# AdaptForm 3.0 performance review

[English](PERFORMANCE.md) · [Русский](PERFORMANCE.ru.md)

## Paired core measurements

Baseline `f13e862970869a0bab73ddab5730713979dde15b` is the completed client-validation stage. Built packages ran in one Node 24.19.0 process on an AMD EPYC 9V45. The paired harness used 1,000 fields or items, 20 warm-up operations, and nine samples of 20 operations. It alternated baseline and candidate order.

| Operation | Baseline median | Candidate median |
| --- | ---: | ---: |
| Unchanged snapshot | 0.826 ms | 0.930 ms |
| Observed field write | 1.745 ms | 1.648 ms |
| Batch of 10 writes | 4.802 ms | 4.274 ms |
| Scalar item add/remove | 1.078 ms | 1.041 ms |
| Nested Form add/remove | 7.837 ms | 9.367 ms |

Safe field discovery and operation position tracking add work on some paths. The remaining median increase in this run was about 13% for an unchanged large snapshot and 20% for nested Form add/remove. Collection membership refresh reuses retained links; field discovery is shared within a snapshot wave. Results are single-host measurements and do not set CI thresholds.

## Server pipeline measurements

Timed acquisition, parsing and application separately. Each scenario used five warmups and seven measured operations. The harness asserts entry counts, one notification per replacement and completed delivery. Flat scenarios contain 1,000 fields; nested depth is five collections.

| Scenario | Begin median | Parse median | Apply median |
| --- | ---: | ---: | ---: |
| 500 errors on one field | 1.62 ms | 2.96 ms | 6.16 ms |
| 5,000 errors on one field | 1.33 ms | 23.17 ms | 13.10 ms |
| 1,000 errors across 1,000 fields | 0.93 ms | 3.60 ms | 7.51 ms |
| 1,000 errors through 1,000 static mappings | 1.07 ms | 8.03 ms | 12.29 ms |
| 100 errors at depth five | 0.03 ms | 0.52 ms | 0.55 ms |

A token sample on 100 scopes measured approximately 10.12 MiB of heap before issuing 1,000 tokens, 10.52 MiB while retaining all tokens, and 9.90 MiB after dropping references and forcing GC. These process-level readings include allocation and GC noise. The active ledger uses weak keys and preserves at most the latest operation per scope node.

```bash
npm run build
node scripts/benchmark-error-model.mjs /path/to/baseline/dist/index.mjs paired.json
node --expose-gc scripts/benchmark-v3-server.mjs server.json
```
