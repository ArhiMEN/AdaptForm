# Handoff

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

## HF-003 — Incomplete decimal validation — 2026-10-17

**Accepted and merged:** independent review, all GitHub Actions checks and GitGuardian passed. [PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12) was squash-merged into `master` as `80f4ee63993b30dfa0a22c1a9e92f1302ede8266`. HF-003 is complete; no npm release or version change.

Base: `origin/master` at `0e69f07`, containing accepted HF-001 and HF-002. Branch: `fix/hf-003-decimal-validation`; target: `master`.

### Changes and compatibility

- `src/core/types/DecimalType.ts`: remove the early successful return for trailing-dot input. The existing empty-decimal-part check now returns `messages.invalid` or `После точки должен быть минимум 1 знак`. Integer digit checks still apply; complete values keep the existing precision, total-digit and numeric-bound checks.
- `tests/unit/types/DecimalType.test.ts`: regressions for incomplete dot/comma input with and without each bound, strict/inclusive boundaries for strings and numbers, complete/negative/zero values, malformed strings, digit/precision limits, zero decimal places and custom messages.
- `tests/unit/form-lifecycle-baseline.test.ts`: replace the four old trailing-dot acceptance expectations, add deferred Field/Form checks, raw/clean representation assertions, completion recovery and a serialization validation spy. Other baseline tests remain intact.
- This handoff and EN/RU decisions record the approved policy. `rawValue`, normalized string/number `valueClear`, casting, deferred assignment and serialization contracts are unchanged. Validation intentionally rejects previously accepted incomplete decimals; applications must run final validation before submission. `toJSON()` still serializes even invalid or unchecked values.
- Production changes are limited to DecimalType. Package version remains 2.1.0; dependencies, Field/Form implementation, collections, reset and touched behavior are unchanged.

### Actual checks

- `npx --no-install vitest run tests/unit/types/DecimalType.test.ts tests/unit/form-lifecycle-baseline.test.ts` on the base — **53 passed**, 2 files.
- Initial regressions before the production fix — **22 failed, 88 passed**, confirming the defect. After the fix — **110 passed**; after adding four further bound cases, final focused run — **114 passed**, 2 files.
- `npm test` — **477 passed**, 21 files (**61 more than the base's 416**).
- `npm run lint`, `npx --no-install tsc --noEmit -p tsconfig.json`, `npm run build` — passed.
- `npm run check:package` — passed; **21 package files**, required entry points and declarations present.
- `npx --no-install tsc --noEmit -p tsconfig.test.json` — fails with **54 existing diagnostics**, exactly matching the untouched base log, including positions and multiplicities. No new diagnostics, unrelated typing fixes or configuration changes.
- `npm audit --audit-level=moderate` — passed, **0 vulnerabilities**.
- `git diff --check` and final diff/Markdown/local-link/EN-RU review — passed.

### Limits and next action

HF-003 PR #12 was reviewed and accepted. Next proposed task is HF-004 (collection reset), pending a separate product contract decision. Error visibility and onChange/onBlur/onSubmit policies, richer parsing states, collection reset membership, touched aggregation and existing test typing diagnostics remain outside scope. Demo-specific builds/typechecks and coverage were not run. No later task has been started; do not merge, release or publish automatically.
