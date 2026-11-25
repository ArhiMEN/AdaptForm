# AdaptForm

[English](README.md) · [Русский](README.ru.md)

[![npm version](https://img.shields.io/npm/v/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![npm downloads](https://img.shields.io/npm/dm/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**[Open the interactive demo](https://arhimen.github.io/AdaptForm/)** · **[Read the changelog](https://github.com/ArhiMEN/AdaptForm/blob/master/CHANGELOG.md)** · **[Browse the demo source](https://github.com/ArhiMEN/AdaptForm/tree/master/demo)**

Maintainers: [automatic npm publication setup](docs/NPM_PUBLISH.md).

AdaptForm is a TypeScript-first, framework-independent, class-based headless form engine inspired by Django Forms and Pydantic. Forms and fields manage values, casting, validation, errors, baselines, subscriptions and observable state without requiring UI framework components.

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
- Clean-value baselines with `isDirty` and `commitBaseline()` on fields, forms and collections.
- Stable immutable `getSnapshot()` data, `subscribe()` and unsubscribe for reactive UIs.
- Synchronous nested `Form.batch()` and propagation of nested form/collection updates.

## Installation

Install the published npm package:

```bash
npm install adaptform
```

Luxon integration is optional:

```bash
npm install luxon
```

This guide targets AdaptForm 3.0. For upgrades from 2.x, see the [migration guide](docs/roadmap/v3.0.0/MIGRATION.md). The interactive demo runs from repository source.

The demo supports English and Russian with a persistent language selector: [English](https://arhimen.github.io/AdaptForm/?lang=en) · [Русский](https://arhimen.github.io/AdaptForm/?lang=ru). Switching languages preserves form data and validation state.

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
  console.log(form.getErrors())
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

Supports `gt`, `ge`, `lt`, `le`, `decimalPlaces`, and `maxDigits`. Numeric inputs with excess precision are rejected rather than silently rounded. String inputs may use a comma or a period as the decimal separator. Incomplete values such as `"123."` retain their editable text but fail explicit validation; call `form.validate()` before submitting. `toJSON()` does not validate automatically.

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

Field options support `isRequired` and a synchronous `validate(value, form)`. Return `[]` for success or an array of structured errors with explicit codes.

```typescript
class PasswordForm extends Form {
  password = new Field(StringType, null, { minLength: 8 })
  confirmation = new Field(StringType, null, {
    validate: (value, form?: PasswordForm) => value === form?.password.valueClear
      ? []
      : [{ code: 'app.password_mismatch' }],
  })
}
```

Required, type and custom callbacks may read form state. Writes through supported node APIs and recursive validation throw `ValidationMutationError`. For asynchronous rules, use a separate server operation.

## Structured errors

A field returns its own pathless errors. Forms and collections return ordered errors with relative tuple paths. Duplicate codes and optional application messages are preserved. Built-in rules return codes and params for application-owned display.

```typescript
const email = new Field(StringType, 'x', { minLength: 2 })
const { valid } = email.validate()
for (const error of email.getErrors()) {
  console.log(error.code, error.params, error.message, error.source)
}
```

`errors` and `getOwnErrors()` expose only the node’s own errors. `setErrors([...])` sets own manual errors. Sources are read in type, custom, server, manual order. `clearErrors()` accepts source and recursive options.

## Validation lifecycle and state

- Constructors cast defaults and capture baselines. They run zero validation callbacks.
- Empty strings and whitespace-only strings count as empty inputs. Explicit validation checks required, cast, type and custom rules in that order.
- `validate().valid` reports effective validity across all sources. A field starts at `isValid === null`; reading validity and snapshots runs zero checks.
- Bulk assignment hydrates all requested values before validation. Use `setRawValue(value, false)` or `setFields(data, false)` to defer checking.
- Validation preserves server and manual errors. Actual value changes invalidate the check and clear the affected value’s errors.
- Insertion checks the new branch and collection rules; removal, move and clear check own rules. An explicit collection check visits every child.
- `reset()` restores defaults for surviving nodes, clears errors and leaves the subtree unchecked.

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

Options include `isRequired`, `minItems`, `maxItems`, and a synchronous `validate(values, form)` callback. `itemsValue` returns an array whose entries may be `null`.

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

Options include `isRequired`, `minForms`, `maxForms`, and a synchronous `validate(forms, form)` callback.

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

Choose records, tree or adapter extraction. A mapping can route errors to another tuple path or `[]` for a Form-level error. Start the operation before dispatching the request and apply the parsed response once.

```typescript
import { ErrorsMapping, ErrorsSchema, Field, Form, StringType } from 'adaptform'

class AccountForm extends Form {
  email = new Field(StringType)
}

const form = new AccountForm()
const schema = new ErrorsSchema({
  kind: 'records',
  path: { at: ['path'] },
  code: { at: ['code'] },
  message: { at: ['message'] },
  mapping: ErrorsMapping.fromObject({ email_address: ['email'], summary: [] }),
})

const operation = form.beginServerErrorOperation()
const batch = schema.parse([
  { path: ['email_address'], code: 'app.taken', message: 'Email already registered.' },
  { path: ['summary'], code: 'app.update_failed' },
])
form.applyServerErrors(batch, { operation })
console.log(form.getErrors())
```

Apply defaults to replacing server errors across the receiver. Use a scope when beginning the operation for a subtree. Parsed paths remain relative to the receiver. Unknown paths throw by default. `unknownPath: "global"` or `"ignore"` is an explicit alternative. Subscribers receive the coherent committed state and notification failures are available on the result.

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
| `Form` | `setFields()`, `fieldsValue`, `validate()`, `batch()`, `beginServerErrorOperation()`, `applyServerErrors()`, `subscribeErrorNotifications()`, `toJSON()`, `toFormData()` |
| `Field` | `rawValue`, `setRawValue()`, `valueClear`, `options`, `validate()`, `isEmpty` |
| `ArrayField` | `items`, `itemsValue`, `add()`, `insert()`, `move()`, `remove()`, `clear()`, `validate()` |
| `ArrayFormField` | `forms`, `formsFieldsValue`, `add()`, `insert()`, `move()`, `remove()`, `clear()`, `validate()` |
| `ErrorsSchema` | `parse()` |
| `ErrorsMapping` | `fromObject()`, `forArray()`, `nest()`, `clone()`, `merge()` |

Every node supports `errors`, `getOwnErrors()`, `getErrors()`, `setErrors()`, `clearErrors()`, `isValid`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()` and `reset()`.

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

The demo is built by GitHub Actions from `master`. See [Demo and GitHub Pages notes](https://github.com/ArhiMEN/AdaptForm/blob/master/docs/DEMO.md).

## Links

- **[Interactive demo](https://arhimen.github.io/AdaptForm/)**
- [GitHub repository](https://github.com/ArhiMEN/AdaptForm)
- [npm package](https://www.npmjs.com/package/adaptform)
- [Issue tracker](https://github.com/ArhiMEN/AdaptForm/issues)
- [Changelog](https://github.com/ArhiMEN/AdaptForm/blob/master/CHANGELOG.md)
- [License](https://github.com/ArhiMEN/AdaptForm/blob/master/LICENSE.md)

## License

MIT © Stanislav Orlov

## Headless form state

Snapshots carry own structured errors and stable collection `itemIds`. A batch publishes the final affected snapshots before notifying subscribers.

```typescript
import {Field, Form, NumberType, StringType} from 'adaptform'

class SettingsForm extends Form {
  displayName = new Field(StringType, 'Alex')
  notifications = new Field(NumberType, 1)
}

const form = new SettingsForm()
const unsubscribe = form.subscribe(() => {
  const snapshot = form.getSnapshot()
  console.log(snapshot.isDirty, snapshot.isValid, snapshot.fieldsValue)
})

form.batch(() => {
  form.displayName.rawValue = 'Alexandra'
  form.notifications.rawValue = 2
}) // One coherent notification after final automatic validation

form.commitBaseline() // Accept current cleaned values; isDirty becomes false
unsubscribe()        // Release the listener
```

`isTouched` keeps its former semantics. `commitBaseline()` changes the dirty-comparison baseline, **not** the constructor defaults restored by `reset()`; a reset may leave `isDirty=true`. Snapshots are detached read-only descriptions, not mutable source objects; `toJSON()` still does not validate.

Automatic validation inside `Form.batch()` is deferred. Explicit `validate()` runs immediately. A synchronous batch preserves completed writes after an exception. Use node mutation APIs for observable changes.

## Dependent validation

Configure `dependsOn` and call `enableDependencies()` for direct scalar fields of the same Form.

```typescript
class Registration extends Form {
  password = new Field(StringType)
  confirmation = new Field(StringType, null, {
    dependsOn: [{path: ['password']}],
    validate: (value: string, form?: Registration) =>
      !form || value === form.password.valueClear ? [] : [{code: 'app.password_mismatch'}],
  })
}
const form = new Registration()
const disable = form.enableDependencies()
form.setFields({password: 'secret', confirmation: 'secret'})
form.password.rawValue = 'changed' // Also revalidates confirmation
// On disposal:
disable()
```

Activation does not validate or change flags. Automatic checks select changed sources and reachable targets, including chains/diamonds, once per completed batch. `setRawValue(value, false)` / `setFields(data, false)` suppress originating requests; explicit checks remain immediate. Missing fields, cycles and overlapping enabled trees throw `DependencyConfigurationError`; mutating graph validators throw `ValidationMutationError`. Validators must be synchronous and pure. Without activation, existing scheduling is preserved. Paths are single literal Field names; collections and direct node references are excluded. See [complete behavior, examples and limits](docs/roadmap/v3.0.0/MIGRATION.md).
