---
name: adaptform-core-contract
description: Use when an approved task changes public exports, field or form types, serialization, errors, or optional Luxon integration.
---

# Public contracts

[English](SKILL.md) · [Русский](SKILL.ru.md)

- Start at `src/index.ts` and `src/luxon.ts`; follow only the exports affected by the task into `src/core/`.
- Identify the existing contract and its consumers before editing. Check the corresponding README section and focused tests, rather than reading the entire library.
- Preserve typed value inference, serialization shapes, public names, and validation messages. Keep Luxon optional and independent of the main entry point.
- For an approved contract change, record compatibility impact and migration in the relevant documentation; use `adaptform-targeted-tests` to select checks.
