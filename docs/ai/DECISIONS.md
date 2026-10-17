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
