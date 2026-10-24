# Project context

[English](PROJECT_CONTEXT.md) · [Русский](PROJECT_CONTEXT.ru.md)

AdaptForm is a framework-independent TypeScript-first, class-based headless form engine. Version **2.1.0 was published on 2026-10-14**; **2.1.1 source** was prepared in GitHub but not published, and **2.2.0** was accepted in [PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18) after HF-005–HF-010 and published to npm 2026-10-19 with OIDC Trusted Publisher ([successful run](https://github.com/ArhiMEN/AdaptForm/actions/runs/39209185356)). See [CHANGELOG](../../CHANGELOG.md) and [2.2.0 release checklist](../roadmap/v2.2.0/RELEASE.md). npm publication is a separate action; further tasks remain proposals until approved.

- Public entry points: `src/index.ts`, `src/luxon.ts`; implementation: `src/core/`. Luxon is optional.
- Tests: `tests/unit/`, `tests/integration/`, `tests/demo/`; interactive source demo: `demo/`.
- Commands and dependencies: `package.json`; CI: `.github/workflows/ci.yml`; distribution: ESM, CommonJS, and declarations in `dist/`.
- Start with [AGENTS](../../AGENTS.md). Read only relevant README sections, files, and skills; this map is not a code audit.

Use [DECISIONS](DECISIONS.md) for the agreed process, [BACKLOG](BACKLOG.md) for proposals, and [HANDOFF](HANDOFF.md) to resume work. These documents retain public project facts, not private ChatGPT conversations.

Current master includes HF-011 (PR #25), PERF-01 (PR #26) and limited HF-013 (PR #27). HF-015: [structured errors](HEADLESS_ERRORS.md), separate branch/PR, version 2.2.0 without publication.
