# AdaptForm

[![npm version](https://img.shields.io/npm/v/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![npm downloads](https://img.shields.io/npm/dm/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**[Open the interactive demo](https://arhimen.github.io/AdaptForm/)** · **[Read the 2.1.0 changelog](https://github.com/ArhiMEN/AdaptForm/blob/v2.1.0/CHANGELOG.md)** · **[Browse the demo source](https://github.com/ArhiMEN/AdaptForm/tree/v2.1.0/demo)**

AdaptForm is a TypeScript-first form modeling library inspired by Django Forms and Pydantic. Define forms as classes with typed fields. Each field owns its value, casting, validation, transformation plugins, errors, and state.

## Features

- Class-based form models with inferred TypeScript value types.
- Field-level and cross-field validation.
- Conditional required rules and custom synchronous validators.
- String, number, decimal, boolean, and JavaScript Date field types.
- Dynamic arrays of fields and arrays of nested forms.
- Input transformation plugins, including `MaskPlugin`.
- Server-error mapping with `ErrorsSchema`.
- JSON and `FormData` serialization.
- Optional Luxon integration through the `adaptform/luxon` entry point.
- Framework-agnostic core with no required runtime dependencies.

## Installation

Install the published npm package:

```bash
npm install adaptform
```

Luxon integration is optional:

```bash
npm install luxon
```

The [interactive demo](https://arhimen.github.io/AdaptForm/) runs from this repository's `v2.1.0` source branch. The npm package version remains independent until a release is published.

## Quick start

```typescript
import { BooleanType, Field, Form, StringType } from 'adaptform'

class RegistrationForm extends Form {
  name = new Field(StringType, null, {
    isRequired: true,
    minLength: 2,
    maxLength: 50,
  })

  email = new Field(StringType, null, {
    isRequired: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })

  acceptedTerms = new Field(BooleanType, false, {
    mustBeTrue: true,
  })
}

const form = new RegistrationForm()
form.fields = {
  name: 'Alex Morgan',
  email: 'alex@example.com',
  acceptedTerms: true,
}

if (form.isValid) {
  console.log(form.fieldsValue)
  console.log(form.toJSON())
} else {
  console.log(form.allErrors)
}
```

`form.fields` assigns the supplied values and validates the completed form. Values for fields omitted from the assignment are left unchanged.

## Field types and options

All field types are constructed using `new Field(TypeConstructor, defaultValue?, options?)`.

### StringType

```typescript
const username = new Field(StringType, null, {
  isRequired: true,
  minLength: 3,
  maxLength: 32,
  pattern: /^[a-z0-9_]+$/i,
  messages: {
    isRequired: 'Enter a username.',
    minLength: 'Use at least 3 characters.',
    pattern: 'Use only letters, numbers, and underscores.',
  },
})
```

Supported constraints: `isRequired`, `minLength`, `maxLength`, and `pattern`.

### NumberType

```typescript
const age = new Field(NumberType, null, {
  isRequired: true,
  ge: 18,
  le: 120,
})
```

Supported constraints: `gt`, `ge`, `lt`, and `le`. Values must be finite integers; blank strings and non-finite numbers are rejected.

### DecimalType

```typescript
const price = new Field(DecimalType, null, {
  decimalPlaces: 2,
  maxDigits: 8,
  ge: 0,
})
```

Supports `gt`, `ge`, `lt`, `le`, `decimalPlaces`, and `maxDigits`. Numeric inputs with excess precision are rejected rather than silently rounded. String inputs may use a comma or a period as the decimal separator.

### BooleanType

```typescript
const accepted = new Field(BooleanType, false, {
  mustBeTrue: true,
})
```

Supports `mustBeTrue` and `mustBeFalse`.

### DateType

```typescript
const birthday = new Field(DateType, null, {
  isDatetime: false,
  minDate: new Date('1900-01-01T00:00:00.000Z'),
  maxDate: new Date(),
})
```

Supports `minDate`, `maxDate`, and `isDatetime`. When `isDatetime` is false, comparisons use calendar dates; when true, timestamps are compared. Invalid dates are rejected.

### Custom validation and messages

Field options support `isRequired`, `messages`, and a synchronous `validate(value, form)` callback. A custom validator returns `true` for success, `false` for the configured validation message, or a string for a specific error.

```typescript
class PasswordForm extends Form {
  password = new Field(StringType, null, { minLength: 8 })

  confirmation = new Field(StringType, null, {
    isRequired: true,
    validate: (value, form) =>
      value === form?.password.valueClear || 'Passwords do not match.',
  })
}
```

Validators are synchronous; returning a Promise is not supported. For asynchronous checks such as server-side uniqueness, call the service separately and apply the response through the form's error API.

## Validation lifecycle and state

- Constructor defaults begin untouched.
- Empty strings and whitespace-only strings count as empty values.
- Global and sticky regular-expression flags do not make repeated string validation stateful.
- `form.checkValid()` validates every field and returns `false` when a field is invalid or global server errors remain.
- Reading `isValid` does not run validators. A field's `isValid` is `null` when its state has not yet been validated or has been reset.
- Bulk assignment validates after direct field values have been assigned, so conditional-required rules can inspect the complete form state.
- If you change dependent fields one at a time, call `form.checkValid()` after the changes to recompute cross-field rules.
- `field.setRawValue(value, false)` and `form.setFields(data, false)` allow advanced callers to defer validation. Call `checkValid()` before relying on the validity state.
- `reset()` restores defaults, clears errors, and leaves validity unset until the next validation. Collection validity is false after reset until the collection is checked again.
- Adding, removing, or clearing collection items refreshes collection validation. Invalid removal indices are ignored.

## Dynamic collections

### ArrayField

Use `ArrayField` for a dynamic list of similarly typed fields.

```typescript
import { ArrayField, Field, StringType } from 'adaptform'

const tags = new ArrayField(
  (value?: string) => new Field(StringType, value, {
    isRequired: true,
    minLength: 2,
  }),
  { minItems: 1, maxItems: 5 },
)

tags.add('typescript')
tags.add('forms')
console.log(tags.itemsValue)
console.log(tags.isValid)
```

Options include `isRequired`, `minItems`, `maxItems`, `messages`, and a synchronous `validate(values, form)` callback. `itemsValue` returns an array whose entries may be `null`.

### ArrayFormField

Use `ArrayFormField` for a list of nested form instances.

```typescript
import { ArrayFormField, Field, Form, StringType } from 'adaptform'

class AddressForm extends Form {
  city = new Field(StringType, null, { isRequired: true })
  postalCode = new Field(StringType, null, { isRequired: true })
}

const addresses = new ArrayFormField(AddressForm, {
  minForms: 1,
  maxForms: 3,
})

addresses.add({ city: 'Berlin', postalCode: '10115' })
console.log(addresses.formsFieldsValue)
```

Options include `isRequired`, `minForms`, `maxForms`, `messages`, and a synchronous `validate(forms, form)` callback.

## Input masks

Plugins transform input before it is cast and validated. The built-in `MaskPlugin` supports fixed mask characters and digit or custom pattern placeholders.

```typescript
import { Field, MaskPlugin, StringType } from 'adaptform'

const phone = new Field(StringType, null, {
  plugins: [
    new MaskPlugin({
      maskFormat: '+1 (___) ___-____',
      maskPlaceholder: '_',
      digitPattern: /\d/,
    }),
  ],
})

phone.rawValue = '4155550134'
console.log(phone.rawValue)
console.log(phone.valueClear)
```

## Server-side errors with ErrorsSchema

`ErrorsSchema` maps error keys returned by a backend to form fields. By default, unmatched keys fall back to their original names.

```typescript
import { ErrorsSchema, Form, Field, StringType } from 'adaptform'

class AccountForm extends Form {
  email = new Field(StringType)
  username = new Field(StringType)
}

const form = new AccountForm()
form.errorsShema = new ErrorsSchema()
  .staticKey('email_address', 'email')
  .staticKey('user_name', 'username')
  .fallback(key => key)

form.errors = {
  email_address: 'This email is already registered.',
  user_name: 'This username is unavailable.',
  request_id: 'The request could not be completed.',
}

console.log(form.allErrors)
```

Available schema methods:

- `staticKey(errorKey, fieldName)` maps an exact key.
- `dynamicKey(pattern, mapping, options?)` maps keys using a regular expression and optional priority.
- `fallback(handler)` handles keys that do not match configured rules.
- `transformValue(transformer)` normalizes server error values before mapping.
- `nest(prefix)` creates a schema for nested field paths.
- `clone()` and `merge(other)` compose schemas.
- `ErrorsSchema.fromObject(mapping)` creates a schema from a key-to-field map.
- `ErrorsSchema.forArray(itemSchema, arrayFieldName, indexExtractor?)` maps array-item errors, including bracket and dotted index notation.

Assigning a new `form.errors` object clears previously applied errors before applying the new payload. Unknown field keys become global errors.

## Serialization

### JSON

`toJSON()` returns a JSON-compatible object. JavaScript `Date` instances are recursively converted to ISO 8601 strings, including dates nested in arrays and plain objects.

```typescript
const payload = form.toJSON()
await fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

### FormData

`toFormData()` omits `null` and `undefined` values, appends scalar values as strings, serializes dates as ISO 8601 strings, preserves `Blob` and `File` values, and JSON-encodes arrays and nested objects.

```typescript
const body = form.toFormData()
await fetch('/api/profile', {
  method: 'POST',
  body,
})
```

Do not set the multipart `Content-Type` header manually; the browser supplies the boundary.

## Optional Luxon integration

Install Luxon separately, then import the additional date type from the dedicated subpath:

```bash
npm install luxon
```

```typescript
import { Field } from 'adaptform'
import { DateLuxonType } from 'adaptform/luxon'
import { DateTime } from 'luxon'

const date = new Field(DateLuxonType, null, {
  isDatetime: false,
  minDate: DateTime.fromISO('1900-01-01'),
  maxDate: DateTime.now(),
  inputFormat: 'dd.MM.yyyy',
})
```

## API overview

| Class | Main API |
| --- | --- |
| `Form` | `fields`, `setFields()`, `fieldsValue`, `checkValid()`, `isValid`, `allErrors`, `globalErrors`, `errors`, `setGlobalError()`, `clearGlobalErrors()`, `reset()`, `toJSON()`, `toFormData()` |
| `Field` | `rawValue`, `setRawValue()`, `valueClear`, `errors`, `error`, `isValid`, `isTouched`, `isEmpty`, `checkValid()`, `reset()` |
| `ArrayField` | `items`, `itemsValue`, `add()`, `remove()`, `clear()`, `checkValid()`, `reset()` |
| `ArrayFormField` | `forms`, `formsFieldsValue`, `add()`, `remove()`, `clear()`, `checkValid()`, `reset()` |
| `ErrorsSchema` | `staticKey()`, `dynamicKey()`, `fallback()`, `transformValue()`, `parseErrors()`, `parseErrorsDetailed()`, `nest()`, `clone()`, `merge()`, `forArray()`, `fromObject()` |

## Development

Requirements: Node.js 22 (used by CI) and npm.

```bash
npm ci
npm run lint
npm test
npm run build
npx tsc --noEmit -p tsconfig.json
npm run check:demo
npm run build:demo
```

To run the interactive demo locally:

```bash
npm run dev -- --config demo/vite.config.ts
```

The demo is deployed from the `v2.1.0` branch by GitHub Actions. See [Demo and GitHub Pages notes](https://github.com/ArhiMEN/AdaptForm/blob/v2.1.0/docs/DEMO.md).

## Links

- **[Interactive demo](https://arhimen.github.io/AdaptForm/)**
- [GitHub repository](https://github.com/ArhiMEN/AdaptForm)
- [npm package](https://www.npmjs.com/package/adaptform)
- [Issue tracker](https://github.com/ArhiMEN/AdaptForm/issues)
- [Changelog](https://github.com/ArhiMEN/AdaptForm/blob/v2.1.0/CHANGELOG.md)
- [License](https://github.com/ArhiMEN/AdaptForm/blob/v2.1.0/LICENSE.md)

## License

MIT © Stanislav Orlov
