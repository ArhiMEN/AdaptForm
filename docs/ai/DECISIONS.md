# Decisions

[English](DECISIONS.md) · [Русский](DECISIONS.ru.md)

## Accepted process — 2026-10-17

- The owner discusses architecture and improvements in ChatGPT. Implementation happens through Codex Cloud only after separate explicit approval of the task and scope. Discussion, a backlog entry, or a skill does not authorize implementation.
- This task authorizes only the AI agent foundation: skills, project context documents, and minimal AGENTS additions. It authorizes no library, test, dependency, package-version, or framework-adapter changes.
- Keep public contracts and existing repository safety rules. Load skills selectively; use the smallest useful checks.
- Store only public, project-relevant outcomes. Never copy personal data, private conversations, secrets, tokens, or internal closed information into files, commits, or PRs.

## Release baseline

Version 2.1.0 was published on 2026-10-14. Future improvements are proposals; no next version, release date, framework, or implementation plan is approved here.

For later decisions, append a short dated outcome, rationale, approved scope, and public approval reference when available. Do not paste discussion transcripts. Keep the Russian companion aligned.

## Selected direction — 2026-10-17

- **Approved product direction:** AdaptForm evolves toward a framework-agnostic, class-based **headless form engine** (direction B). The core remains independent of UI libraries; optional adapters may be considered later.
- **Not approved by this direction alone:** code changes, specific new public APIs, versions, release dates, semantic migrations or framework dependencies. The 20 [roadmap tasks](HEADLESS_ROADMAP.md) are proposals with task-specific decision gates.
- Architecture is discussed in ChatGPT; Codex Cloud executes only separately scoped and approved changes. Keep this decision record free of private chat transcripts.

## HF-003 decimal input policy — 2026-10-17

- Approved scope: repair incomplete-decimal validation while preserving the existing Field/Form lifecycle and serialization contracts.
- Trailing-separator strings such as `123.`, `0.`, `-123.` and normalized `123,` remain editable: raw input is retained and casting still returns a normalized string. Every explicit validation rejects them as a format error, with or without numeric bounds, using `messages.invalid` or the existing default message for an empty decimal part.
- Completed values retain `gt`/`ge`/`lt`/`le`, precision and digit limits, negative-number support and numeric input behavior. Excess precision is rejected without rounding.
- Deferred assignment remains available through `setRawValue(value, false)` and `setFields(data, false)`. Applications must run `checkAndSetValid()` or `Form.checkValid()` before relying on final validity; `toJSON()` serializes without validating.
- Compatibility impact: incomplete decimals previously accepted by validation now fail intentionally. Public types and payload representations remain unchanged. Error display triggers, new parsing states, collection reset and touched semantics remain separate tasks. HF-003 completion requires successful checks, independent review and PR acceptance.
