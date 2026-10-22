# AdaptForm

[English](README.md) · [Русский](README.ru.md)

[![npm version](https://img.shields.io/npm/v/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![npm downloads](https://img.shields.io/npm/dm/adaptform.svg)](https://www.npmjs.com/package/adaptform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**[Открыть интерактивное демо](https://arhimen.github.io/AdaptForm/?lang=ru)** · **[История изменений](https://github.com/ArhiMEN/AdaptForm/blob/master/CHANGELOG.ru.md)** · **[Исходный код демо](https://github.com/ArhiMEN/AdaptForm/tree/master/demo)**

Для сопровождающих: [настройка автоматической публикации в npm](docs/NPM_PUBLISH.ru.md).

AdaptForm — независимый от UI-фреймворков headless-движок форм с class-based API и приоритетом TypeScript, вдохновлённый Django Forms и Pydantic. Формы и поля управляют значениями, приведением типов, валидацией, ошибками, baseline, подписками и наблюдаемым состоянием без зависимости от UI-компонентов.

## Возможности

- Модели форм на основе классов с выводом типов значений в TypeScript.
- Проверки отдельных полей и зависимостей между полями.
- Условная обязательность полей и пользовательские синхронные валидаторы.
- Типы полей для строк, целых и десятичных чисел, логических значений и JavaScript Date.
- Динамические массивы полей и массивы вложенных форм.
- Плагины преобразования ввода, включая `MaskPlugin`.
- Сопоставление серверных ошибок через `ErrorsSchema`.
- Сериализация в JSON и `FormData`.
- Необязательная интеграция с Luxon через точку входа `adaptform/luxon`.
- Независимое от фреймворков ядро без обязательных зависимостей времени выполнения.
- Исходные очищенные значения с `isDirty` и `commitBaseline()` у полей, форм и коллекций.
- Стабильные неизменяемые снимки `getSnapshot()`, подписки и отписка через `subscribe()`.
- Вложенный синхронный `Form.batch()` и распространение обновлений вложенных форм и коллекций.

## Установка

Установите опубликованный npm-пакет:

```bash
npm install adaptform
```

Интеграция с Luxon необязательна:

```bash
npm install luxon
```

[Интерактивное демо](https://arhimen.github.io/AdaptForm/?lang=ru) использует исходный код репозитория и автоматически публикуется из `v2.1.0` и `master`. **Новые headless API опубликованы в [adaptform@2.2.0](https://www.npmjs.com/package/adaptform/v/2.2.0)** через npm Trusted Publisher (OIDC).

Демо поддерживает английский и русский языки с сохранением выбора: [English](https://arhimen.github.io/AdaptForm/?lang=en) · [Русский](https://arhimen.github.io/AdaptForm/?lang=ru). Переключение языка сохраняет данные формы и состояние валидации.

## Быстрый старт

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

`form.fields` присваивает переданные значения и проверяет полностью заполненную форму. Поля, отсутствующие в присваивании, сохраняют прежние значения.

## Типы полей и параметры

Все типы полей создаются через `new Field(TypeConstructor, defaultValue?, options?)`.

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

Поддерживаемые ограничения: `isRequired`, `minLength`, `maxLength` и `pattern`.

### NumberType

```typescript
const age = new Field(NumberType, null, {
  isRequired: true,
  ge: 18,
  le: 120,
})
```

Поддерживаемые ограничения: `gt`, `ge`, `lt` и `le`. Значения должны быть конечными целыми числами; пустые строки и неконечные числа отклоняются.

### DecimalType

```typescript
const price = new Field(DecimalType, null, {
  decimalPlaces: 2,
  maxDigits: 8,
  ge: 0,
})
```

Поддерживаются `gt`, `ge`, `lt`, `le`, `decimalPlaces` и `maxDigits`. Числовые значения с избыточной точностью отклоняются без скрытого округления. В строковых значениях десятичным разделителем может быть запятая или точка. Незавершённые значения вроде `"123."` сохраняются при редактировании, но не проходят явную проверку; перед отправкой вызывайте `Form.checkValid()`. Метод `toJSON()` не выполняет валидацию автоматически.

### BooleanType

```typescript
const accepted = new Field(BooleanType, false, {
  mustBeTrue: true,
})
```

Поддерживаются `mustBeTrue` и `mustBeFalse`.

### DateType

```typescript
const birthday = new Field(DateType, null, {
  isDatetime: false,
  minDate: new Date('1900-01-01T00:00:00.000Z'),
  maxDate: new Date(),
})
```

Поддерживаются `minDate`, `maxDate` и `isDatetime`. При `isDatetime: false` сравниваются календарные даты; при `true` — временные метки. Некорректные даты отклоняются.

### Пользовательская валидация и сообщения

Параметры поля поддерживают `isRequired`, `messages` и синхронную функцию `validate(value, form)`. Пользовательский валидатор возвращает `true` при успехе, `false` для настроенного сообщения валидации или строку с конкретной ошибкой.

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

Валидаторы синхронные; возврат Promise не поддерживается. Для асинхронных проверок, например уникальности на сервере, вызовите сервис отдельно и примените ответ через API ошибок формы.

## Жизненный цикл валидации и состояние

- Значения по умолчанию начинают со состояния «не изменено».
- Пустые строки и строки только из пробелов считаются пустыми значениями.
- Глобальный и липкий флаги регулярных выражений не влияют на повторные проверки строк.
- `form.checkValid()` проверяет каждое поле и возвращает `false`, если хотя бы одно поле некорректно или остались общие серверные ошибки.
- Чтение `isValid` не запускает валидаторы. Поля без ненулевого значения по умолчанию начинают с `isValid === null`; ненулевые значения конструктора проходят приведение и валидацию, но остаются неизменёнными по состоянию. После `reset()` корректность поля не определена до следующей проверки.
- Массовое присваивание запускает проверку после установки значений непосредственных полей, поэтому правила условной обязательности видят полное состояние формы.
- Если зависимые поля меняются по отдельности, после изменений вызовите `form.checkValid()` для пересчёта зависимых правил.
- `field.setRawValue(value, false)` и `form.setFields(data, false)` позволяют отложить валидацию. Прежде чем полагаться на корректность формы, вызовите `checkValid()`.
- `reset()` восстанавливает значения по умолчанию, очищает ошибки и оставляет корректность неопределённой до следующей проверки. Корректность коллекции после сброса равна false до её повторной проверки.
- Добавление, удаление и очистка элементов проверяют коллекции вне `Form.batch()`; внутри batch автоматическая валидация откладывается. Некорректные индексы удаления игнорируются.

## Динамические коллекции

### ArrayField

Используйте `ArrayField` для динамического списка однотипных полей.

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

Параметры включают `isRequired`, `minItems`, `maxItems`, `messages` и синхронную функцию `validate(values, form)`. `itemsValue` возвращает массив, элементы которого могут быть `null`.

### ArrayFormField

Используйте `ArrayFormField` для списка экземпляров вложенных форм.

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

Параметры включают `isRequired`, `minForms`, `maxForms`, `messages` и синхронную функцию `validate(forms, form)`.

## Маски ввода

Плагины преобразуют ввод до приведения типов и валидации. Встроенный `MaskPlugin` поддерживает постоянные символы маски и позиции для цифр или символов по пользовательскому шаблону.

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

## Серверные ошибки и ErrorsSchema

`ErrorsSchema` сопоставляет ключи ошибок сервера с полями формы. По умолчанию для ключей без соответствия сохраняются исходные имена.

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

Доступные методы схемы:

- `staticKey(errorKey, fieldName)` сопоставляет точный ключ.
- `dynamicKey(pattern, mapping, options?)` сопоставляет ключи по регулярному выражению с необязательным приоритетом.
- `fallback(handler)` обрабатывает ключи, не подошедшие под настроенные правила.
- `transformValue(transformer)` нормализует значения серверных ошибок до сопоставления.
- `nest(prefix)` создаёт схему для вложенных путей полей.
- `clone()` и `merge(other)` позволяют составлять схемы.
- `ErrorsSchema.fromObject(mapping)` создаёт схему из таблицы соответствий ключей и полей.
- `ErrorsSchema.forArray(itemSchema, arrayFieldName, indexExtractor?)` сопоставляет ошибки элементов массива, включая индексы в скобках и через точку.

Присваивание нового объекта `form.errors` очищает предыдущие ошибки перед применением нового ответа. Неизвестные ключи полей становятся общими ошибками формы.

## Сериализация

### JSON

`toJSON()` возвращает JSON-совместимый объект. Экземпляры JavaScript `Date` рекурсивно преобразуются в строки ISO 8601, включая даты внутри массивов и обычных объектов.

```typescript
const payload = form.toJSON()
await fetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
```

### FormData

`toFormData()` пропускает `null` и `undefined`, добавляет скалярные значения как строки, сериализует даты в ISO 8601, сохраняет значения `Blob` и `File`, а массивы и вложенные объекты кодирует в JSON.

```typescript
const body = form.toFormData()
await fetch('/api/profile', {
  method: 'POST',
  body,
})
```

Не задавайте multipart-заголовок `Content-Type` вручную: браузер сам добавит разделитель boundary.

## Необязательная интеграция с Luxon

Установите Luxon отдельно, затем импортируйте дополнительный тип даты из выделенной точки входа:

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

## Обзор API

| Класс | Основной API |
| --- | --- |
| `Form` | `fields`, `setFields()`, `fieldsValue`, `checkValid()`, `isValid`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()`, `batch()`, `allErrors`, `globalErrors`, `errors`, `setGlobalError()`, `clearGlobalErrors()`, `reset()`, `toJSON()`, `toFormData()` |
| `Field` | `rawValue`, `setRawValue()`, `valueClear`, `errors`, `error`, `isValid`, `isTouched`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()`, `isEmpty`, `checkValid()`, `reset()` |
| `ArrayField` | `items`, `itemsValue`, `add()`, `remove()`, `clear()`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()`, `checkValid()`, `reset()` |
| `ArrayFormField` | `forms`, `formsFieldsValue`, `add()`, `remove()`, `clear()`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()`, `checkValid()`, `reset()` |
| `ErrorsSchema` | `staticKey()`, `dynamicKey()`, `fallback()`, `transformValue()`, `parseErrors()`, `parseErrorsDetailed()`, `nest()`, `clone()`, `merge()`, `forArray()`, `fromObject()` |

## Разработка

Требуются Node.js 22 (используется в CI) и npm.

```bash
npm ci
npm run lint
npm test
npm run build
npx tsc --noEmit -p tsconfig.json
npm run check:demo
npm run build:demo
```

Для локального запуска интерактивного демо:

```bash
npm run dev -- --config demo/vite.config.ts
```

Демо собирается GitHub Actions из `v2.1.0` и `master`. GitHub Pages разрешает обеим веткам публиковать страницу по одному адресу; см. [Демо и GitHub Pages](https://github.com/ArhiMEN/AdaptForm/blob/master/docs/DEMO.ru.md).

## Ссылки

- **[Интерактивное демо](https://arhimen.github.io/AdaptForm/?lang=ru)**
- [Репозиторий GitHub](https://github.com/ArhiMEN/AdaptForm)
- [Пакет npm](https://www.npmjs.com/package/adaptform)
- [Задачи и ошибки](https://github.com/ArhiMEN/AdaptForm/issues)
- [История изменений](https://github.com/ArhiMEN/AdaptForm/blob/master/CHANGELOG.ru.md)
- [Лицензия](https://github.com/ArhiMEN/AdaptForm/blob/master/LICENSE.ru.md)

## Лицензия

MIT © Stanislav Orlov

## Headless-состояния форм (2.2.0)

HF-005–HF-010 прошли независимое ревью и **опубликованы в [adaptform@2.2.0](https://www.npmjs.com/package/adaptform/v/2.2.0)** через npm Trusted Publisher с подписанным provenance.

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

`isTouched` сохраняет прежнюю семантику. `commitBaseline()` меняет точку сравнения dirty, **не** значения конструктора, возвращаемые `reset()`; после сброса `isDirty` иногда остаётся `true`. Snapshots — независимые неизменяемые представления, а не ссылки на изменяемые данные. `toJSON()` по-прежнему не выполняет валидацию.

Автоматическая проверка внутри `Form.batch()` откладывается, явные `checkValid()` выполняются сразу. Batch только синхронный; при исключении выполненные изменения не откатываются. Прямые мутации старых публичных массивов и произвольная замена свойств формы не создают автоматических уведомлений. Подробности: [использование и ограничения](docs/ai/HEADLESS_STATE_USAGE.ru.md), [совместимость с 2.1.1](docs/ai/HEADLESS_STATE_CONTRACT.ru.md#совместимость-с-211).

## Зависимая валидация (исходный API HF-013)

Исходники этапа 2.3.0 добавляют необязательный `dependsOn` и явный `enableDependencies()` для обычных полей одной Form. Этого API нет в опубликованном пакете 2.2.0; версия manifest не изменяется.

```typescript
class Registration extends Form {
  password = new Field(StringType)
  confirmation = new Field(StringType, null, {
    dependsOn: [{path: ['password']}],
    validate: (value: string, form?: Registration) =>
      !form || value === form.password.valueClear || 'Passwords differ',
  })
}
const form = new Registration()
const disable = form.enableDependencies()
form.setFields({password: 'secret', confirmation: 'secret'})
form.password.rawValue = 'changed' // Also revalidates confirmation
// On disposal:
disable()
```

Активация не валидирует и не меняет флаги. Автоматическая проверка выбирает изменённые source и достижимые target, включая цепочки/ромбы, по разу за завершённый batch. `setRawValue(value, false)` / `setFields(data, false)` подавляют исходящие запросы; явные проверки остаются немедленными. Отсутствующие поля, циклы и пересекающиеся активные деревья вызывают `DependencyConfigurationError`; мутации из валидаторов графа — `ValidationMutationError`. Валидаторы должны быть синхронными и чистыми. Без активации существующее планирование сохраняется. Пути — одно буквальное имя Field; коллекции и прямые ссылки исключены. См. [полное поведение, примеры и ограничения](docs/ai/HEADLESS_DEPENDENCIES_USAGE.ru.md).
