# AdaptForm 3.0 — Architecture Direction and Decision Gates

[English](V3_ARCHITECTURE.md) · [Русский](V3_ARCHITECTURE.ru.md)

Status: **direction approved; public API not yet finalized**. V3-01 is a read-only audit. This document is not implementation or release authorization.

## Release direction

- Target next major version **3.0.0**, replacing the earlier 2.3.0 plan. Published 2.2.0 remains unchanged.
- Consolidate validation and error handling into a single structured-error architecture; eliminate redundant legacy validation/error compatibility after auditing dependencies and migration paths.
- Preserve accepted headless state, collection identity, performance improvements, and dependency validation. Do not expand scope to deferred async validation, submit lifecycle, UI adapters, or unrelated reset changes without approval.
- Keep the core TypeScript-first and framework-agnostic. No server-framework-specific behavior.

## Proposed error contract (not final)

A normalized error has a stable `code`, optional `message`, optional `params`, optional path where appropriate, and source provenance (`type`, `custom`, `server`, `manual`). Use ordered collections to allow repeated codes. Distinguish field-local storage from full paths at Form level. Avoid binding localization to raw message text. Exact signatures, mutability and method names require V3-02 approval.

## Server errors

- The developer configures how an arbitrary API response encodes errors. AdaptForm must not guess a framework's format.
- Audit and evolve existing `ErrorsSchema` before proposing a competing API. Support configurable extraction of code/message/params/path, field mapping, global errors, nested objects/arrays, multiple errors, and custom transformation where declarative rules are insufficient.
- Separate parsing/normalization from applying errors to a Form where this improves correctness and reuse. Treat external-format normalization as necessary functionality, not legacy.
- Make object-key and path handling safe, including prototype-sensitive names.

## Error lifecycle direction

- Changing a field clears that field's server errors, not other fields' errors.
- Ordinary revalidation does not silently erase server errors.
- Manual, type, custom, server and global errors have explicit, independently specified invalidation rules.
- Replacement semantics for new API responses, reset, nested edits, collection identity and stale responses must be resolved before implementation.

## Known audit risks

- A01: structural legacy field types without `validateErrors()` break; this can be an intentional **documented major-version migration**, not a forced compatibility bridge.
- A02: mutation guard can be bypassed through direct field validation; design a consistent fix.
- A03: nested error merging with prototype-sensitive keys needs safe handling.
- A04: structured-error overhead needs measurement and an explicit performance decision.

## Gates and release sequence

1. **V3-01** read-only inventory and architecture audit.
2. **V3-02** owner approval of exact public API, server schema, lifecycle and migration.
3. **V3-03** core validation/error refactor in small reviewed tasks.
4. **V3-04** configurable server error normalization, mapping and application.
5. **V3-05** regression tests, types, ESM/CJS consumers, migration guide and aligned EN/RU docs.
6. **V3-06** independent release-candidate review, correctness/security/performance gates.
7. **V3-07** separately approved version bump, merge and npm publication verification.
8. **PL-01** downstream PlayLease adoption after package verification; not part of the AdaptForm release.

Do not merge a version bump without explicit publication approval: the master CI workflow may automatically publish a new npm version.

## No-silent-legacy rule

Any proposed compatibility bridge, fallback, deprecated alias, duplicate representation or workaround must be disclosed to the owner **before implementation**, with evidence, options, costs and migration impact. Stop the affected work pending a decision. A major release does not authorize dropping useful behavior without a replacement. See `AGENTS.md`.
