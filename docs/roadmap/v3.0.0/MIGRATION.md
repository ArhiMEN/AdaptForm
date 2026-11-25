# Migrate from AdaptForm 2.x to 3.0

[English](MIGRATION.md) · [Русский](MIGRATION.ru.md)

## Validation and display

- Replace `checkValid()` and `checkAndSetValid()` with `validate().valid`. Constructors and deferred setters leave inputs unchecked. Call `validate()` after assembly when you need a result. A current server or manual error also makes the result false.
- Return `[]` for success and an array of coded errors for failures. Choose the code for every former boolean, string or single-object result. Keep callbacks synchronous and move supported model writes outside them.
- Replace custom `FieldType.validate()` and `getTypeName()` with `validateErrors()` and a stable readonly `typeId`. A structural type must also supply `cast()` and `options`. Render built-in errors by code and params. Move `messages` and display formatting, including former Luxon `outputFormat`, into the application. Luxon `inputFormat` still controls parsing.
- Put only finite, plain JSON data in params. Convert Dates to ISO strings or timestamps, Maps to entries and Sets to arrays. Omit absent properties and provide an explicit representation for unsupported values.

```typescript
import { Field, StringType } from 'adaptform'

const name = new Field(StringType, 'new', {
  validate: value => value.length >= 3 ? [] : [{ code: 'app.short_name', params: { min: 3 } }],
})
const { valid } = name.validate()
void valid
```

## Error ownership and snapshots

- Replace mutable error arrays, `error`, `allErrors`, `globalErrors` and global setters with structured access. `getOwnErrors()` reads only the owner. Form and collection `getErrors()` return relative tuple paths, with `[]` identifying own errors. Group them for display in the application.
- `setErrors(entries)` replaces own manual errors. `clearErrors({ sources, recursive })` clears selected sources and descendants when requested. Migrate persisted filters from `client` to `type` and `external` to `manual`. Client validation leaves server/manual errors in place. A supported actual input change clears affected errors and disqualifies an earlier server operation.
- Read `snapshot.errors` for own structured errors and child snapshots for descendants. Collection snapshots require `itemIds`, aligned with current item order. Move, insert and remove preserve retained nodes and their stable IDs. State snapshots stay immutable and subscription updates run child first.
- Commit a baseline to accept clean values without clearing errors. Reset brings surviving items back to their original defaults, clears errors and invalidates pending server operations. Use supported setters and collection methods for revision tracking.

## Server responses

Use `ErrorsSchema.parse()` for extraction and `form.applyServerErrors()` for installation. Choose a records envelope and selectors, a tree leaf decoder, or a custom adapter. Normalize whole-leaf values inside the decoder or adapter; `ErrorTransform` operates on individual errors after extraction. Use tuple paths with numeric collection indexes. Dots and numeric-looking object keys are literal unless you configure a codec.

```typescript
import { ErrorsMapping, ErrorsSchema, Field, Form, StringType } from 'adaptform'

class Profile extends Form {
  email = new Field(StringType)
}

const form = new Profile()
const schema = new ErrorsSchema({
  kind: 'records',
  select: { at: ['issues'] },
  path: { at: ['path'] },
  code: { at: ['code'] },
  message: { at: ['message'] },
  mapping: ErrorsMapping.fromObject({ remote_email: ['email'], summary: [] }),
})

const operation = form.beginServerErrorOperation()
// Start the request here. The following object represents its response.
const parsed = schema.parse({
  issues: [{ path: ['remote_email'], code: 'app.taken', message: 'Email is already registered.' }],
}, { trace: true })
const result = form.applyServerErrors(parsed, { operation })
void result.notification
```

- Replace `form.errors = response`, server-shaped `Form.setErrors(response)` and `DefaultErrorsSchema` with an explicitly configured parser and operation. Use `parse(response, { trace: true })` in place of detailed legacy parsing.
- `ErrorsMapping` takes static/dynamic rules, explicit fallback and transforms. `fromObject()` maps literal keys to tuples. `nest()` strips a source prefix and adds a target prefix. `forArray()` handles item paths with an optional index decoder. `clone()` copies configuration. `merge()` requires an explicit policy for overlapping static rules or fallbacks.
- Default replace clears server errors in the operation scope, including when the parsed batch is empty. `mode: 'append'` keeps existing server errors. Pass `unknownPath: 'global'` to route unresolved targets to a Form within scope, or `'ignore'` to drop them. The default rejects unknown paths.
- Start a token before dispatch. A newer overlapping token, input edits, reset or affected collection moves make an older response stale. Tokens are single use. A failed preflight preserves an otherwise current token.
- Notification failures have a separate report. Inside a batch or a reentrant delivery, the report stays pending until its delivery cycle completes. `getErrorNotificationReports()` retrieves retained failures. Use `clearErrorNotificationReports()` after processing them.

## Package entry points

Use NodeNext, Node16 or Bundler module resolution with TypeScript. Package exports provide ESM and CommonJS declarations for `adaptform` and `adaptform/luxon`. Install Luxon when using the optional entry point.

[Complete migration ledger](PLAN.md) · [V3 contracts and limits](../../ai/V3_ARCHITECTURE.md)
