---
name: adaptform-release-guard
description: Use when a task touches release documentation, package metadata, distribution contents, or publication workflows.
---

# Release guard

[English](SKILL.md) · [Русский](SKILL.ru.md)

- Read `package.json` and the relevant changelog or release document only. Version 2.1.0 was published on 2026-10-14; future improvements are proposals, not a new release commitment.
- Distinguish verification from publication: builds and package-content checks do not authorize publishing, version changes, tags, or releases.
- For an approved packaging change, inspect ESM, CommonJS, declarations, the optional Luxon entry point, and the package file allowlist; use existing checks without publishing.
- Consult `docs/NPM_PUBLISH.md` only for a publication task and `docs/roadmap/v2.1.0/` only when relevant under AGENTS rules.
- Record actual checks and limitations; do not mark historical workstreams complete or select a future version merely because a proposal exists.
