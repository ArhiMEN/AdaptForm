# Changelog

[English](CHANGELOG.md) · [Русский](CHANGELOG.ru.md)

All notable changes to AdaptForm are documented here. Version `2.1.0` was published to npm on 2026-10-14.

**[Interactive demo](https://arhimen.github.io/AdaptForm/)** · [Demo source](https://github.com/ArhiMEN/AdaptForm/tree/master/demo) · [Documentation](https://github.com/ArhiMEN/AdaptForm/blob/master/README.md)

## [2.1.1] - Unreleased (prepared)

### Fixed

- **HF-002:** Defer `ArrayField` collection validation during `Form.setFields(data, false)`; with enabled validation, check the final collection once after all form values are assigned, using the parent form as context. Avoid validation against a transient empty array, while preserving the public `itemsValue` setter and its immediate validation of the completed replacement. ([PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10))
- **HF-003:** Reject incomplete decimal strings such as `"123."`, `"0."` and `"-123."` on explicit validation, including with `gt`/`ge`/`lt`/`le` bounds. Preserve the editable input, comma normalization, existing format-error messages and complete-number precision checks. ([PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12))

### Tests and verification

- Add the HF-001 lifecycle characterization baseline and update its expectations after the two targeted fixes. ([PR #8](https://github.com/ArhiMEN/AdaptForm/pull/8))
- The accepted HF-003 branch passed **477 tests in 21 files**, lint, source type-check, package build, package-content verification and npm audit (0 reported vulnerabilities). The 2.1.1 release candidate must pass its own CI before publication.

### Compatibility and release status

- **Intentional behavior change:** trailing-decimal values may still be entered and serialized, but no longer pass `Field.checkAndSetValid()` or `Form.checkValid()`. Applications must validate before submitting; `toJSON()` itself does not validate.
- Public types, `rawValue`/`valueClear` representations, serialization shapes and the optional Luxon entry point are unchanged. No new runtime dependencies.
- The separate test type-check `tsconfig.test.json` has **54 existing diagnostics** unchanged by HF-002/HF-003; it is not part of required CI. These are tracked as technical debt, not represented as passing.
- **Release not yet published.** Version `2.1.1` is being prepared; do not infer npm publication, a GitHub release or a tag from this entry.

## [2.1.0] - 2026-10-14

### Added

- Prepare gated npm publication after successful `master` CI, using the version in `package.json` and either npm Trusted Publisher or a repository-scoped npm secret; activation awaits authentication setup.

- Add English/Russian demo localization with persistent language selection and language-specific documentation links, preserving entered values and validation state.
- Add complete Russian companion documentation, changelog, release tracking, repository instructions, and license information alongside the English originals.

- Add a browser-based interactive playground covering field validation, conditional requirements, field state, arrays, nested forms, server-error handling, serialization, and input masks.
- Add a GitHub Actions workflow to build and deploy the playground to GitHub Pages from `v2.1.0` and `master`.
- Add dedicated demo type-checking and production-build commands, and run both as part of CI.
- Add automated npm package-content verification to ensure required ESM, CommonJS, and TypeScript declaration files are present while development sources and tests stay out of the published package.
- Export `ErrorsSchema` from the public package entry point.
- Infer `Form.fieldsValue` from declared `Field`, `ArrayField`, and `ArrayFormField` properties.

### Changed

- Configure ESLint for TypeScript source, tests, and demo code; run linting and dependency audits in CI on Node.js 22.
- Upgrade Vitest, Vite, ESLint, and TypeScript lint tooling; pin patched transitive dependency versions and align the lockfile.
- Replace the machine-specific absolute Vitest alias with a portable project-relative path.
- Batch direct field values before form-level validation so conditional-required rules can inspect the complete form state without invoking those direct field validators twice.
- Add `Form.setFields(data, validate?)` and `Field.setRawValue(value, validate?)` for controlled assignment with optional deferred validation.
- Make reset behavior explicit: field defaults are restored without running custom validators, errors are cleared, and validity remains unset until validation runs again.
- Clear stale server errors recursively when a new error payload is assigned.
- Revalidate collections after mutations, avoid hidden repeated validation when reading `ArrayFormField.isValid`, ignore invalid removal indices, and leave collection validity unset after reset until the next check.
- Improve inferred form-value types, nullable array values, nested form collection types, and JSON serialization return types.
- Serialize arrays and nested objects as JSON in `FormData`; omit `null`/`undefined`; preserve `Blob`/`File` values; recursively serialize nested JavaScript `Date` values to ISO 8601 strings in JSON output.
- Rewrite the README to document supported APIs, validation lifecycle, collection options, error mapping, serialization, development commands, and the interactive demo.

### Fixed

- Make string validation deterministic when patterns contain global or sticky regular-expression flags.
- Reject blank and non-finite values in `NumberType`.
- Reject numeric decimal values with excess precision instead of silently rounding them; correctly handle `decimalPlaces: 0`.
- Treat whitespace-only strings as empty and keep constructor defaults untouched.
- Correct conditional-required validation after bulk form assignment.
- Refresh array validation after adding items/forms and avoid invalid negative, fractional, or out-of-range removal indices.
- Fix `ErrorsSchema.forArray()` to honor custom index extractors, apply item-schema mappings and transformers, and support bracket, dotted, and custom index notation.
- Invoke an `ErrorsSchema` fallback handler only once when it declines an error.
- Correct regression coverage for a date-time boundary test and add tests for reset state, nested error clearing, assignment batching, nullable arrays, Date serialization, and Blob/File handling.

### Security and maintenance

- Support both array and keyed-object npm pack JSON manifests in the package-content check; require English/Russian package documentation.

- Add `npm audit --audit-level=moderate` to CI and update vulnerable transitive dependency versions using reviewed overrides. The final verified workflow reports zero known vulnerabilities from npm audit; the previous lockfile scan also reported zero.
- Verify lint, tests, ESM/CJS build, declaration generation, source type-checking, demo type-checking/build, and npm package contents in CI.

### Compatibility notes

- Built-in library validation messages and their language have not been changed in this release. Localization and any structured error-code contract are deferred to a separate coordinated task.
- PlayLease-specific integration work is explicitly out of scope for this branch.
- Version `2.1.0` was published manually to npm. No GitHub release or release tag has been created.

## [2.0.5] - 2026-07-22

### Added

- `ErrorsSchema` class for flexible server error parsing and mapping
- Static error mapping with `staticKey()` for exact key matching
- Dynamic error mapping with `dynamicKey()` supporting regex patterns and priority
- `fallback()` handler for unmatched error keys
- `transformValue()` for normalizing error messages (array to string, removing prefixes, etc.)
- `parseErrors()` method returning flat `Record<string, string>`
- `parseErrorsDetailed()` method returning `ParsedError` objects with metadata (sourceKey, matchedBy)
- `nest()` method for creating prefixed schemas for nested forms
- `clone()` and `merge()` methods for schema composition and reuse
- `ErrorsSchema.fromObject()` factory for quick mapping from plain objects
- `ErrorsSchema.forArray()` factory for array field error patterns
- Predefined schemas: `DefaultErrorSchema`, `LaravelErrorSchema`, `GraphQLErrorSchema`
- Priority system for dynamic rules to control matching order
- Value transformers chain for sequential error message normalization
- Support for nested error objects with recursive parsing
- Pydantic-style error format support out of the box

### Changed

- `Form.errors` setter now uses `ErrorsSchema` for intelligent error mapping
- `Form.errorsShema` property added for per-form error schema configuration
- `Form.applyErrorToField()` now supports nested field paths (e.g., `accounts.0.email`)
- `Form.applyNestedError()` handles `ArrayFormField` recursively with proper error context
- `Form.allErrors` getter now recursively collects errors from nested `ArrayFormField`
- `Form.reset()` now properly clears all field errors and global errors
- Error clearing logic improved: setting empty errors object clears all previous errors
- Global errors are now properly scoped to their target form instance
- `DefaultErrorsSchema` uses `fallback((key) => key)` for backward compatibility

### Fixed

- Fixed nested error propagation for `ArrayFormField` with out-of-range indices
- Fixed error context when applying errors to fields inside nested forms
- Fixed `allErrors` not including errors from nested forms in `ArrayFormField`
- Fixed global errors not being properly cleared when setting new errors
- Fixed null/undefined error values causing unexpected behavior
- Fixed error mapping for array fields (ArrayField) with index-based keys

## [2.0.0 - 2.0.4] - 2026-05-29

### Added

- Complete TypeScript rewrite with full type inference
- Plugin system with MaskPlugin, FieldPlugin, and DecoratorPlugin
- ArrayField for dynamic field arrays
- ArrayFormField for nested form arrays
- New field types: DecimalType, DateLuxonType, BooleanType
- Optional Luxon integration via `adaptform/luxon` subpath export
- Input mask support with flexible configuration
- Conditional required fields based on form state
- Custom validation messages for all field types
- Global error handling for server-side errors
- Form serialization (`toJSON()`, `toFormData()`)
- Tree-shakeable exports for smaller bundles
- ESM and CJS module support
- Full TypeScript declarations with proper types

### Changed

- **Complete API redesign** - new class-based architecture
- Field creation now uses `new Field(TypeClass, defaultValue, options)` pattern
- Form validation now requires explicit field declarations in class body
- Plugin system replaces old middleware approach
- Error handling unified across all field types
- Validation methods now return string arrays instead of boolean
- Options interface restructured for better type inference

### Breaking Changes

- **Full rewrite from v1.x** - no backward compatibility
- Form must extend base `Form` class with field declarations
- Field constructors require TypeClass as first argument
- `validate()` now returns `string[]` instead of `boolean`
- Plugin API completely redesigned
- Import paths changed for tree-shaking support
- Luxon date type moved to separate entry point `adaptform/luxon`

### Removed

- Legacy function-based API
- Old validation middleware system
- Global configuration singleton
- Automatic Luxon dependency (now optional)

[2.0.4]: https://github.com/ArhiMEN/adaptform/releases/tag/v2.0.4
