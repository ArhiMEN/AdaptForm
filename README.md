# AdaptForm

[![npm version](https://img.shields.io/npm/v/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![npm downloads](https://img.shields.io/npm/dm/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![bundle size](https://img.shields.io/bundlephobia/minzip/adaptform)](https://bundlephobia.com/package/adaptform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

TypeScript-first adaptive form validation library with plugin system, input masks, and optional Luxon integration.
Lightweight, tree-shakeable, and fully typed.

## Features

- **Full TypeScript Inference** - All types are inferred automatically
- **Plugin System** - Extend functionality with plugins (masks, decorators, custom validators)
- **Input Masks** - Built-in MaskPlugin for formatted input (phone, date, etc.)
- **Date Handling** - Optional Luxon integration via `adaptform/luxon`
- **Array Fields** - Support for arrays of fields and nested forms
- **Tree-shakeable** - Import only what you need
- **Strict Validation** - Rich validation rules with custom messages
- **Framework Agnostic** - Works with Vue, React, Angular, or vanilla JS
- **Zero Dependencies** - Luxon is optional and importable separately

## Installation

```bash
npm install adaptform
```

## Optional: Luxon integration

```Bash
npm install luxon
```

## Quick Start

```TypeScript
import {Form, Field, StringType, NumberType} from 'adaptform';

class LoginForm extends Form {
  login = new Field(StringType, null, {maxLength: 50});
  password = new Field(StringType, null, {minLength: 8});
  remember = new Field(BooleanType, false);
}

const form = new LoginForm();

form.fields = {
  login: 'john_doe',
  password: 'securepass123'
};

console.log(form.isValid); // true
console.log(form.fieldsValue); // { login: 'john_doe', password: 'securepass123', remember: false }
```

## Usage Examples

## Field Types

```TypeScript
import {Field, StringType, NumberType, BooleanType, DecimalType, DateType} from 'adaptform';

// String with validation
const name = new Field(StringType, null, {
  minLength: 2,
  maxLength: 50,
  pattern: /^[a-zA-Z]+$/
});

// Number with range
const age = new Field(NumberType, null, {
  gt: 0,    // greater than
  lt: 120   // less than
});

// Boolean with requirement
const agreed = new Field(BooleanType, false, {
  mustBeTrue: true,
  messages: {
    mustBeTrue: 'You must agree to the terms'
  }
});
```

## Custom Validation

```TypeScript
const email = new Field(StringType, null, {
  validate: (value) => {
    return value.includes('@') || 'Invalid email format';
  }
});

// Async validation with form context
const passwordConfirmation = new Field(StringType, null, {
  validate: (value, form) => {
    return value === form?.password?.valueClear || 'Passwords do not match';
  }
});
```

## Conditional Required Fields

```TypeScript
class SignUpForm extends Form {
  country = new Field(StringType, null);

  state = new Field(StringType, null, {
    isRequired: (form) => form?.country?.valueClear === 'USA',
    messages: {
      isRequired: 'State is required for USA residents'
    }
  });
}
```

## Input Masks

```TypeScript
import {Field, StringType, MaskPlugin} from 'adaptform';

const phone = new Field(StringType, null, {
  plugins: [
    new MaskPlugin({
      maskFormat: '+7 (___) ___-__-__',
      maskPlaceholder: '_',
      digitPattern: /\d/
    })
  ]
});

phone.rawValue = '9991234567';
console.log(phone.valueClear); // '+7 (999) 123-45-67'
```

## Nested Forms

```TypeScript
import {ArrayField, Field, NumberType} from 'adaptform';

const gameIds = new ArrayField(
  (value?: number) => new Field(NumberType, value, {gt: 0}),
  {minItems: 1}
);

gameIds.itemsValue = [1, 2, 3];
gameIds.add(4);
console.log(gameIds.itemsValue); // [1, 2, 3, 4]
```

## Luxon Date Integration

```Bash
npm install luxon
```

```TypeScript
import {DateLuxonType} from 'adaptform/luxon';
import {DateTime} from 'luxon';

const birthdate = new Field(DateLuxonType, null, {
  isDatetime: false,
  minDate: DateTime.fromISO('1900-01-01'),
  maxDate: DateTime.now(),
  inputFormat: 'dd.MM.yyyy',
  messages: {
    minDate: 'Date must be after 1900',
    maxDate: 'Date cannot be in the future'
  }
});

birthdate.rawValue = '15.06.1990';
console.log(birthdate.valueClear); // Luxon DateTime object
```

## Form Submission

```TypeScript
class ContactForm extends Form {
  name = new Field(StringType, null, {maxLength: 100});
  email = new Field(StringType, null, {
    pattern: /^[^@]+@[^@.]+\.[^@.]+$/
  });
  message = new Field(StringType, null, {maxLength: 1000});
}

const form = new ContactForm();
form.fields = {
  name: 'John',
  email: 'john@example.com',
  message: 'Hello!'
};

if (form.checkValid()) {
  // Submit form
  const formData = form.toFormData();
  const json = form.toJSON();

  await fetch('/api/contact', {
    method: 'POST',
    body: formData
  });
} else {
  console.log(form.allErrors);
  // {
  //   name: [],
  //   email: [],
  //   message: []
  // }
}
```

## Global Errors

```TypeScript
class LoginForm extends Form {
  login = new Field(StringType, null);
  password = new Field(StringType, null);
}

const form = new LoginForm();

// Add server-side errors
form.errors = {
  login: 'Account not found',
  password: 'Invalid password'
};

// Or set global error
form.setGlobalError('auth', 'Authentication failed');
```

## Plugin System

### Built-in Plugins

* **MaskPlugin** - Input masking (phone, date, credit card)

* **FieldPlugin** - Base plugin for custom extensions

### Creating Custom Plugins

```TypeScript
import {BasePlugin} from 'adaptform';
import type {FieldPlugin} from 'adaptform';

class UppercasePlugin extends BasePlugin implements FieldPlugin<string> {
  toRawValue(value: string): string {
    return value?.toUpperCase() || '';
  }

  toValueClear(value: string): string {
    return value?.toLowerCase() || '';
  }
}

const field = new Field(StringType, null, {
  plugins: [new UppercasePlugin()]
});
```

## API Reference

### Form

* `checkValid(form?)` - Validate all fields

* `fieldsValue` - Get all field values

* `allErrors` - Get all validation errors

* `globalErrors` - Get global errors

* `toFormData()` - Convert to FormData

* `toJSON()` - Convert to JSON

* `reset()` - Reset all fields

### Field

* `rawValue` - Set raw input value

* `valueClear` - Get cleaned/validated value

* `isValid` - Check if field is valid

* `error` - Get first error message

* `errors` - Get all error messages

* `isTouched` - Check if field was modified

* `isEmpty` - Check if field is empty

* `reset()` - Reset to default value

### ArrayField

* `add(value?)` - Add new field

* `remove(index)` - Remove field at index

* `clear()` - Remove all fields

* `itemsValue` - Get array of values

* `items` - Get array of Field instances

### ArrayFormField

* `add(data?)` - Add new form

* `remove(index)` - Remove form at index

* `clear()` - Remove all forms

* `forms` - Get array of Form instances

* `formsFieldsValue` - Get array of form values

## TypeScript Support

```TypeScript
import {Form, Field, StringType, NumberType} from 'adaptform';

class UserForm extends Form {
  name = new Field(StringType, null);
  age = new Field(NumberType, null);
}

const form = new UserForm();

// Full type inference
type UserData = typeof form.fieldsValue;
// { name: string | null; age: number | null; }
```

## License

MIT © [Stanislav Orlov](https://github.com/ArhiMEN)

## Links

* [GitHub Repository](https://github.com/ArhiMEN/adaptform)
* [npm Package](https://www.npmjs.com/package/adaptform)
* [Bug Reports](https://github.com/ArhiMEN/adaptform/issues)
* [Changelog](https://github.com/ArhiMEN/adaptform/blob/master/CHANGELOG.md)

## Support

If you find this project useful, please give it a star on GitHub!