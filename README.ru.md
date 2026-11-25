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

Руководство описывает AdaptForm 3.0. Для перехода с 2.x см. [руководство по миграции](docs/roadmap/v3.0.0/MIGRATION.ru.md). Интерактивное демо собирается из исходников репозитория.

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
  console.log(form.getErrors())
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

Поддерживаются `gt`, `ge`, `lt`, `le`, `decimalPlaces` и `maxDigits`. Числовые значения с избыточной точностью отклоняются без скрытого округления. В строковых значениях десятичным разделителем может быть запятая или точка. Незавершённые значения вроде `"123."` сохраняются при редактировании, но не проходят явную проверку; перед отправкой вызывайте `form.validate()`. Метод `toJSON()` не выполняет валидацию автоматически.

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

Опции поля поддерживают `isRequired` и синхронный `validate(value, form)`. Возвращайте `[]` при успехе или массив структурированных ошибок с явными кодами.

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

Колбэки required, type и custom могут читать состояние формы. Запись через API узлов и рекурсивная валидация вызывают `ValidationMutationError`. Для асинхронных правил используйте отдельную серверную операцию.

## Структурированные ошибки

Поле возвращает собственные ошибки без пути. Формы и коллекции возвращают упорядоченные ошибки с относительными путями-кортежами. Повторные коды и сообщения приложения сохраняются. Встроенные правила предоставляют коды и параметры для отображения в приложении.

```typescript
const email = new Field(StringType, 'x', { minLength: 2 })
const { valid } = email.validate()
for (const error of email.getErrors()) {
  console.log(error.code, error.params, error.message, error.source)
}
```

`errors` и `getOwnErrors()` возвращают только собственные ошибки узла. `setErrors([...])` заменяет собственные manual-ошибки. Порядок источников — type, custom, server, manual. `clearErrors()` поддерживает выбор источников и рекурсивную очистку.

## Жизненный цикл валидации и состояние

- Конструкторы приводят значения по умолчанию и фиксируют baseline. Они выполняют ноль проверок.
- Пустые строки и строки из пробелов считаются пустым вводом. Порядок явной проверки — required, cast, type, custom.
- `validate().valid` учитывает все источники ошибок. Поле начинается с `isValid === null`. Чтение валидности и снапшотов выполняет ноль проверок.
- Массовая запись загружает все указанные значения перед проверкой. Для отложенной проверки используйте `setRawValue(value, false)` или `setFields(data, false)`.
- Валидация сохраняет server и manual. Фактическое изменение значения сбрасывает проверку и очищает ошибки затронутого значения.
- При вставке проверяются новая ветка и правила коллекции. Удаление, перемещение и очистка проверяют собственные правила коллекции. Явная проверка коллекции обходит всех детей.
- `reset()` восстанавливает значения по умолчанию у сохранённых узлов, очищает ошибки и сбрасывает проверку поддерева.

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

Параметры включают `isRequired`, `minItems`, `maxItems` и синхронную функцию `validate(values, form)`. `itemsValue` возвращает массив, элементы которого могут быть `null`.

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

Параметры включают `isRequired`, `minForms`, `maxForms` и синхронную функцию `validate(forms, form)`.

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

Выберите извлечение records, tree или adapter. Маппинг позволяет перенести ошибку на другой путь-кортеж или на `[]` для общей ошибки формы. Откройте операцию до отправки запроса и примените разобранный ответ один раз.

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

По умолчанию Apply заменяет серверные ошибки во всей форме. Укажите область при создании операции для поддерева. Пути ответа остаются относительными к форме. Неизвестные пути по умолчанию вызывают исключение. Для изменения поведения задайте `unknownPath: "global"` или `"ignore"`. Подписчики получают согласованное состояние, а сбои уведомлений доступны в результате Apply.

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
| `Form` | `setFields()`, `fieldsValue`, `validate()`, `batch()`, `beginServerErrorOperation()`, `applyServerErrors()`, `subscribeErrorNotifications()`, `toJSON()`, `toFormData()` |
| `Field` | `rawValue`, `setRawValue()`, `valueClear`, `options`, `validate()`, `isEmpty` |
| `ArrayField` | `items`, `itemsValue`, `add()`, `insert()`, `move()`, `remove()`, `clear()`, `validate()` |
| `ArrayFormField` | `forms`, `formsFieldsValue`, `add()`, `insert()`, `move()`, `remove()`, `clear()`, `validate()` |
| `ErrorsSchema` | `parse()` |
| `ErrorsMapping` | `fromObject()`, `forArray()`, `nest()`, `clone()`, `merge()` |

Все узлы поддерживают `errors`, `getOwnErrors()`, `getErrors()`, `setErrors()`, `clearErrors()`, `isValid`, `isDirty`, `commitBaseline()`, `subscribe()`, `getSnapshot()` и `reset()`.

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

Демо собирается GitHub Actions из `master`. GitHub Pages разрешает обеим веткам публиковать страницу по одному адресу; см. [Демо и GitHub Pages](https://github.com/ArhiMEN/AdaptForm/blob/master/docs/DEMO.ru.md).

## Ссылки

- **[Интерактивное демо](https://arhimen.github.io/AdaptForm/?lang=ru)**
- [Репозиторий GitHub](https://github.com/ArhiMEN/AdaptForm)
- [Пакет npm](https://www.npmjs.com/package/adaptform)
- [Задачи и ошибки](https://github.com/ArhiMEN/AdaptForm/issues)
- [История изменений](https://github.com/ArhiMEN/AdaptForm/blob/master/CHANGELOG.ru.md)
- [Лицензия](https://github.com/ArhiMEN/AdaptForm/blob/master/LICENSE.ru.md)

## Лицензия

MIT © Stanislav Orlov

## Headless-состояния формы

Снапшоты содержат собственные структурированные ошибки и стабильные `itemIds` коллекций. Batch фиксирует итоговые снапшоты всех затронутых узлов до уведомлений.

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

Внутри `Form.batch()` автоматическая валидация откладывается, а явный `validate()` выполняется сразу. Синхронный batch сохраняет завершённые записи при исключении. Для наблюдаемых изменений используйте API мутации узлов.

## Зависимая валидация

Настройте `dependsOn` и вызовите `enableDependencies()` для прямых скалярных полей одной формы.

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

Активация не валидирует и не меняет флаги. Автоматическая проверка выбирает изменённые source и достижимые target, включая цепочки/ромбы, по разу за завершённый batch. `setRawValue(value, false)` / `setFields(data, false)` подавляют исходящие запросы; явные проверки остаются немедленными. Отсутствующие поля, циклы и пересекающиеся активные деревья вызывают `DependencyConfigurationError`; мутации из валидаторов графа — `ValidationMutationError`. Валидаторы должны быть синхронными и чистыми. Без активации существующее планирование сохраняется. Пути — одно буквальное имя Field; коллекции и прямые ссылки исключены. См. [полное поведение, примеры и ограничения](docs/roadmap/v3.0.0/MIGRATION.ru.md).
