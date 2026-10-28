# Repository Agent Instructions

[English](AGENTS.md) · [Русский](AGENTS.ru.md)

## Safety and scope

- Never delete this repository or delete, rename, force-update, or otherwise remove an existing Git branch. Never rewrite shared history or force-push.
- Work on the current task branch unless the user requests another branch. Preserve unrelated and already staged changes.
- Do not publish to npm, create a release or tag, or change the published package version without explicit authorization. The `prepublishOnly` script builds the package; avoid `npm publish` during verification.
- Keep changes within the requested task. Ask before changing public contracts or taking irreversible external actions.

## Project map

- AdaptForm is a TypeScript validation library. Public entry points are `src/index.ts` and `src/luxon.ts`; implementation lives in `src/core/`.
- `luxon` is an optional peer dependency. Keep the main entry point independent of it. Builds emit ESM, CommonJS, and declarations to `dist/`.
- Tests live in `tests/unit/`, `tests/integration/`, and `tests/demo/`. The interactive demo lives in `demo/` and imports library source.
- Package checks live in `scripts/`; CI is in `.github/workflows/ci.yml`. Consult `docs/roadmap/v2.2.0/` for the current published release, and historical `docs/roadmap/v2.1.0/` only when relevant.

## Selective AI context

- Start with [project context](docs/ai/PROJECT_CONTEXT.md); load only task-relevant files and README sections. Do not read the whole repository, test suite, or commit history by default.
- Load `.agents/skills/<name>/SKILL.md` only when its trigger matches: `adaptform-core-contract` for public API; `adaptform-validation-lifecycle` for state and validation flow; `adaptform-targeted-tests` for check selection; `adaptform-framework-adapter` for approved adapter work; `adaptform-release-guard` for packaging and release work. Skills supplement these instructions, without granting approval or requiring unrelated skills.
- Follow [decisions](docs/ai/DECISIONS.md): the owner discusses architecture and improvements in ChatGPT; implement through Codex Cloud only after separate explicit scope approval. Backlog proposals do not authorize code changes.
- At completion, keep [handoff](docs/ai/HANDOFF.md) concise with results, actual checks, limitations, and next action; update [decisions](docs/ai/DECISIONS.md) and [backlog](docs/ai/BACKLOG.md) only when needed. Align EN/RU; retain only public project facts, never personal data, private conversations, secrets, tokens, or internal closed information.

## Implementation

- Find the existing owner of behavior before editing. Reuse or refactor it instead of duplicating business or validation logic.
- Keep public APIs explicit and type-safe; avoid `any` where a safe generic or `unknown` works. Preserve backward compatibility unless the user approves a breaking change; document unavoidable changes and migration steps.
- Preserve existing user-facing validation and error messages and public type names unless the user explicitly authorizes a contract change and migration plan.
- Add or update regression tests for bug fixes and meaningful behavior changes. Documentation and agent-configuration edits do not need behavior tests.


## Legacy and compatibility escalation

- Before adding a fallback, compatibility bridge, duplicate state, deprecated alias, or workaround, identify the old contract and why it is still needed. Report the finding to the owner **immediately**, with affected API, evidence, alternatives, migration impact, and recommendation.
- Do **not** silently implement legacy support or a temporary workaround. Stop the affected design/implementation and request an explicit decision: remove, replace, retain with justification, or defer. Continue independent approved work only if safe.
- A major-version direction is not blanket permission to remove functionality: preserve useful behavior through a designed replacement and document migration. Do not introduce a breaking change outside the approved task scope.
- For AdaptForm 3.0, prefer one structured error model and one validation contract. Server response normalization is a supported integration boundary, **not** legacy compatibility; keep it configurable and backend-agnostic.

## Language and documentation

- Write code comments, test descriptions, and examples in English. Keep English documentation and complete Russian companions (`*.ru.md`) aligned. Preserve user-provided and language-neutral values.

## Verification and delivery

- Start with the smallest relevant Vitest file: `npx vitest run <test-file>`. Expand to `npm test` when a change crosses modules or public behavior.
- For affected code, run the relevant checks: `npm run lint`, `npm run build`, `npx tsc --noEmit -p tsconfig.json`, `npm run check:package`; for demo changes, also `npm run check:demo` and `npm run build:demo`. Use `npm run test:coverage` when coverage matters. CI additionally runs `npm audit --audit-level=moderate`.
- Do not report a check as passed unless you ran it and inspected the result. Mention unrun checks or known limitations.
- For current release work, keep `docs/roadmap/v2.2.0/PLAN.md` and `PLAN.ru.md` plus `RELEASE.md` and `RELEASE.ru.md` consistent with actual checks, publication status and limitations.
- Review the final diff for accidental changes, duplicated logic, missing tests, and language drift. Make small, reviewable commits with descriptive English messages when committing is part of the task; do not include unrelated staged changes.
