---
name: adaptform-validation-lifecycle
description: Use when an approved task affects assignment, casting, validation order, reset, touched or validity state, or collection updates.
---

# Validation lifecycle

[English](SKILL.md) · [Русский](SKILL.ru.md)

- Locate the affected owner in `src/core/fields/Field.ts`, `src/core/Form.ts`, or the relevant collection class; read only that flow and its focused tests.
- Trace raw input, casting, assignment, validation, errors, and state. Distinguish validity inspection from validation execution.
- Preserve bulk assignment before cross-field validation, deferred validation options, and reset semantics documented in README.
- Check validator invocation counts and dependent fields when relevant; for collections include affected add, remove, and reset behavior.
- Add a focused regression test only for an approved behavior change or fix; do not redesign lifecycle incidentally.
