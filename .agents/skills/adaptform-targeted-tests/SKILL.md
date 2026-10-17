---
name: adaptform-targeted-tests
description: Use when selecting validation commands for a scoped change or diagnosing a failing project check.
---

# Targeted verification

[English](SKILL.md) · [Русский](SKILL.ru.md)

- Read `package.json`, the changed-file list, and only relevant test paths. Follow the command rules in `AGENTS.md`.
- Map core behavior to `tests/unit/`, interactions to `tests/integration/`, and demo behavior to `tests/demo/`; start with the smallest relevant Vitest file.
- Expand checks only when scope or evidence justifies it. Select type checks, builds, and package checks for affected contracts; use coverage only when needed.
- For documentation or agent configuration alone, check Markdown, local links, bilingual consistency, skill frontmatter, and `git diff --check`; do not run library tests by default.
- Report exact commands and passed, failed, skipped, or unrun outcomes. A zero-test run does not demonstrate behavior.
