# Переход с AdaptForm 2.x на 3.0

[English](MIGRATION.md) · [Русский](MIGRATION.ru.md)

## Валидация и отображение

- Замените `checkValid()` и `checkAndSetValid()` на `validate().valid`. Конструкторы и отложенные сеттеры оставляют данные непроверенными. Вызывайте `validate()` после сборки, когда нужен результат. Активная server- или manual-ошибка также даёт false.
- Возвращайте `[]` при успехе и массив ошибок с кодами при неудаче. Выберите код для каждого прежнего boolean, строкового или одиночного результата. Оставьте колбэки синхронными и вынесите запись через API моделей за их пределы.
- Замените пользовательские `FieldType.validate()` и `getTypeName()` на `validateErrors()` и стабильный readonly `typeId`. Структурный тип также предоставляет `cast()` и `options`. Отображайте встроенные ошибки по коду и параметрам. Перенесите `messages` и форматирование, включая прежний Luxon `outputFormat`, в приложение. Luxon `inputFormat` управляет разбором ввода.
- Передавайте в params только конечные простые JSON-данные. Преобразуйте Date в ISO-строки или timestamp, Map в массив записей, Set в массив значений. Опускайте отсутствующие поля и явно преобразуйте неподдерживаемые значения.

```typescript
import { Field, StringType } from 'adaptform'

const name = new Field(StringType, 'new', {
  validate: value => value.length >= 3 ? [] : [{ code: 'app.short_name', params: { min: 3 } }],
})
const { valid } = name.validate()
void valid
```

## Владение ошибками и снапшоты

- Замените изменяемые массивы, `error`, `allErrors`, `globalErrors` и глобальные сеттеры структурированным доступом. `getOwnErrors()` читает ошибки владельца. `getErrors()` у форм и коллекций возвращает относительные пути-кортежи, где `[]` обозначает собственную ошибку. Группируйте их для отображения в приложении.
- `setErrors(entries)` заменяет собственные manual-ошибки. `clearErrors({ sources, recursive })` очищает выбранные источники и при необходимости потомков. Переведите сохранённые фильтры с `client` на `type` и с `external` на `manual`. Клиентская проверка сохраняет server/manual. Реальное изменение через API очищает затронутые ошибки и делает ранее начатую серверную операцию устаревшей.
- Читайте собственные структурированные ошибки из `snapshot.errors`, а ошибки потомков — из их снапшотов. Коллекции предоставляют обязательные `itemIds` в текущем порядке элементов. Перемещение, вставка и удаление сохраняют оставшиеся узлы и их ID. Снапшоты неизменяемы, уведомления идут от детей к родителям.
- Фиксируйте baseline, чтобы принять очищенные значения и сохранить ошибки. Reset восстанавливает значения по умолчанию у оставшихся элементов, очищает ошибки и аннулирует серверные операции. Для отслеживания ревизий используйте сеттеры и методы коллекций.

## Серверные ответы

Используйте `ErrorsSchema.parse()` для извлечения ошибок и `form.applyServerErrors()` для записи. Выберите records с селекторами, tree с декодером листьев или собственный adapter. Преобразуйте лист целиком в декодере или адаптере. `ErrorTransform` работает с отдельными ошибками уже после извлечения. Передавайте пути-кортежи с числовыми индексами коллекций. Точки и похожие на числа ключи остаются буквальными, пока вы явно не настроите кодек.

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

- Замените `form.errors = response`, серверную форму `Form.setErrors(response)` и `DefaultErrorsSchema` явно настроенным парсером и операцией. Для диагностики взамен старого подробного разбора используйте `parse(response, { trace: true })`.
- `ErrorsMapping` принимает статические и динамические правила, явный fallback и преобразования. `fromObject()` сопоставляет буквальные ключи с кортежами. `nest()` убирает исходный префикс и добавляет целевой. `forArray()` обрабатывает пути элементов с необязательным декодером индекса. `clone()` копирует конфигурацию. При пересечении статических правил или fallback в `merge()` задайте явную политику.
- Режим replace по умолчанию очищает server-ошибки в области операции, в том числе при пустом результате. `mode: 'append'` сохраняет существующие серверные ошибки. Укажите `unknownPath: 'global'` для сопоставления с Form в пределах области или `'ignore'` для пропуска. По умолчанию неизвестный путь приводит к исключению.
- Создавайте токен до отправки запроса. Более новая пересекающаяся операция, запись ввода, reset или затрагивающее область перемещение делают старый ответ устаревшим. Токен одноразовый. Ошибка предварительной проверки сохраняет действующий токен.
- Сбои уведомлений доступны в отдельном отчёте. В batch или при повторной записи из подписчика отчёт остаётся pending до завершения своей доставки. `getErrorNotificationReports()` возвращает сохранённые сбои. После обработки очистите их через `clearErrorNotificationReports()`.

## Точки входа пакета

Для TypeScript используйте разрешение модулей NodeNext, Node16 или Bundler. Экспорты пакета предоставляют декларации ESM и CommonJS для `adaptform` и `adaptform/luxon`. Для опциональной точки входа установите Luxon.

[Полный реестр миграции](PLAN.ru.md) · [Контракты и лимиты V3](../../ai/V3_ARCHITECTURE.ru.md)
