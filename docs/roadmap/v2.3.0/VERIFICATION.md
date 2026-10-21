# Foundation verification — 2026-10-20

[English](VERIFICATION.md) · [Русский](VERIFICATION.ru.md)

Branch: `feature/v2.3.0-foundation`; base master `9942aac71dbd5b20121f634bbad5663a812ef6ee`. Source package version **2.2.0**, TypeScript 5.9.3, Node 24.19.0, npm 11.9.0. No dependency/version/publish-workflow changes. Independent review and PR acceptance remain separate.

## Stage checks actually run

| Stage | Checks / result |
| --- | --- |
| STAB-01 | Baseline test tsc: 54 errors; final test tsc: 0. Targeted 13 files: 313 tests passed; new type regressions separately 2 passed. Source tsc/lint passed. Initial lint rejected a bare negative-case expression; corrected with void, rerun passed. |
| STAB-02 | Lifecycle + nested tests: 16 passed; new lifetime file rerun: 4 passed. Test tsc/lint/build passed. Node harness completed with warmup, seven samples and expose-gc; baseline JSON retained. |
| HF-011 | Existing collections/nested/batch: 90 passed before new cases. Final targeted six files: 113 passed (including 19 new identity cases). Both tsc/lint/build/diff checks passed. An initial regression expected root reset to be clean; corrected the test to retain legacy hydrated-row defaults/baseline distinction. No reset code changed. |
| HF-012 | Documentation only; local Markdown targets, EN/RU sections and diff whitespace checked. No dependency engine/type exports implemented. |

## Final local gate

| Command | Actual result |
| --- | --- |
| npm test | **591/591 tests**, 30 files, 25 new cases over master |
| npm run lint | PASS, zero warnings |
| npx tsc --noEmit -p tsconfig.json | PASS |
| npx tsc --noEmit -p tsconfig.test.json | PASS, **0 diagnostics** |
| npm run build | PASS, ESM/CJS/declarations including optional Luxon entry |
| npm run check:package | PASS, 21 package files |
| npm run check:demo | PASS |
| npm run build:demo | PASS; index.html/assets exist |
| npm audit --audit-level=moderate | PASS, 0 vulnerabilities |
| git diff --check | PASS |

Additional actual checks: strict NodeNext consumers of built declarations in `.mts` and `.cts`, including scalar/nested value inference, insert return types, snapshot IDs, old structural snapshot producers, negative numeric typing and optional Luxon types. A local npm pack was installed with ignore-scripts/omit=optional in an isolated directory **outside repository ancestor node_modules**; both package-root ESM and CJS imports worked with Luxon absent, including move/insert/batch/snapshots. With Luxon present, matching ESM and CJS entry-point consumers passed DateTime and ISO input checks.

Additional smoke findings are not hidden: an initial no-Luxon assertion inside repository work resolved Luxon from ancestor devDependencies; the genuinely isolated rerun passed. An initial mixed-loader Luxon smoke failed because DateLuxonType uses instanceof DateTime and ESM/CJS Luxon have different constructors. This pre-existing cross-loader limitation was reproduced explicitly; source is identical to master, matching-loader consumers pass. It is not fixed opportunistically or advertised as universal cross-realm compatibility.

The raw Node registry preflight initially failed because Node fetch did not use this cloud runner's HTTP proxy. `NODE_USE_ENV_PROXY=1 node scripts/check-npm-release.mjs` then passed: **adaptform@2.2.0 is already published; skipping.** No workflow modification or publication occurred. The actual post-merge workflow is not run by this PR task; no future skip is falsely reported as already observed.

## Measurements and remaining decisions

[Benchmarks](BENCHMARKS.md) retain baseline and HF-011 rerun, environment, commands and limitations. Large observed collection operations and depth remain concerns, not release-blocking defects repaired here. Short GC measurements do not prove absence of leaks. [HF-011](../../ai/HEADLESS_COLLECTION_IDENTITY.md) lists the additive snapshot/event compatibility boundary. [HF-012](../../ai/HEADLESS_DEPENDENCIES.md) lists owner gates before HF-013; its APIs remain proposals. HF-004/reset redesign is excluded.

Integration CI must be read for the final pushed head in the single integration PR; local checks above do not claim GitGuardian or GitHub CI success. Delivery report records the actual PR URL, final SHA and observed check conclusions after push. No merge, force push, branch deletion, version bump, npm publish, tag or GitHub Release.

## PERF-01 — 2026-10-21

[Performance report](PERFORMANCE.md): 606 tests / 31 files, including 15 new regressions; lint, source/test/demo typechecks, library/demo builds, package check (21 files), audit (0 vulnerabilities), diff checks and full before/after benchmarks passed locally. Package 2.2.0 and public behavior preserved; no merge or publication. PR CI must be checked on the final head.
