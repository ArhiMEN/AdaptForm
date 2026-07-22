# Changelog

All notable changes to this project will be documented in this file.

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
- `ErrorSchema.fromObject()` factory for quick mapping from plain objects
- `ErrorSchema.forArray()` factory for array field error patterns
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