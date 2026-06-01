# Changelog

All notable changes to this project will be documented in this file.

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