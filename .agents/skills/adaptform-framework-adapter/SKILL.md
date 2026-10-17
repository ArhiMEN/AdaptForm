---
name: adaptform-framework-adapter
description: Use only for an explicitly approved framework adapter design or implementation task; no adapter is approved by this skill.
---

# Framework adapter boundary

[English](SKILL.md) · [Русский](SKILL.ru.md)

- Read the approved scope and `docs/ai/DECISIONS.md` before exploring a framework. If implementation is not separately approved, document the proposal and stop before editing code.
- Identify the smallest mapping between framework events or reactivity and existing Field/Form APIs. Keep validation and casting in the library.
- Keep framework dependencies outside the core entry point; do not add dependencies or a new public contract without explicit approval.
- Specify value updates, validation timing, errors, reset, and disposal where applicable. Compare against the existing lifecycle rather than inventing parallel rules.
- Select focused adapter and integration checks only after the target framework and behavior are agreed; do not scaffold unused adapters.
