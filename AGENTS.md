# Repository Agent Instructions

[English](AGENTS.md) · [Русский](AGENTS.ru.md)

## Non-negotiable safety rules

- Never delete this repository.
- Never delete, rename, force-update, or otherwise remove any existing Git branch.
- Never rewrite shared history or force-push.
- Do not publish to npm, create a release, or change the published package version unless explicitly authorized.
- Work only on the task branch requested by the user. Preserve all unrelated work.

## Code quality and architecture

- Do not duplicate business logic or validation logic. Before adding behavior, locate and reuse the existing implementation; refactor the existing implementation when that is the cleaner design.
- Prefer one clear source of truth over parallel implementations, compatibility shims that duplicate behavior, or repeated special cases.
- Keep public APIs explicit, predictable, and type-safe. Avoid `any` when a safe generic or `unknown` is practical.
- Preserve backward compatibility unless a breaking change is explicitly approved. Document unavoidable behavior changes and migration steps.
- Add or update regression tests for every bug fix and meaningful behavior change.
- Do not claim tests, builds, linting, or runtime checks passed unless they were actually run and their results were inspected.

## Language

- Keep comments, identifiers where practical, test descriptions, and code examples in English. Maintain English documentation with complete Russian companion files (`*.ru.md`), as authorized by the maintainer. Keep both versions aligned when documentation changes.
- Preserve existing user-facing validation/error messages and type names during the v2.1.0 library-only pass. Their localization is deferred to a separately coordinated task; do not change their language or public message contract without explicit approval and a compatibility/migration plan.
- Keep language-neutral data and user-supplied values unchanged.

## Workflow and tracking

- Keep the release plan and progress log in `docs/roadmap/v2.1.0/`.
- Update the status document whenever a workstream changes state; record completed checks and known limitations.
- Work in small, reviewable commits with descriptive English commit messages.
- Before completion, review the diff for accidental changes, duplicated logic, non-English repository text, and missing tests.
