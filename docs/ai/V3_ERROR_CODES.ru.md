# AdaptForm 3.0 — каталог кодов ошибок I18N-01

[English](V3_ERROR_CODES.md) · [Русский](V3_ERROR_CODES.ru.md)

Дополнение к принятому владельцем [V3-02](V3_ARCHITECTURE.ru.md), **ACCEPTED** на `b041806ee35c56f55c0a0925e7d0de8b533f09bd`. Интеграция документации: **READY_FOR_OWNER_REVIEW**. Все **17 встроенных codes** сохранены. Будущий каталог учитывает утверждённые ODR-01 (машинный typeId), ODR-02 (JSON params) и ODR-03 (lifecycle). Runtime пока не изменён; миграционные отличия ниже заданы явно.

## Контракт и происхождение

Built-in output содержит code и указанные params; никогда message, перевод имени типа, отформатированную дату, locale, raw value или fallback display string. Нормализация ставит source type. Codes/keys/types/meaning параметров — публичный контракт; дальнейшее изменение требует решения о совместимости. Повторы кодов допустимы с разными и одинаковыми params. «Нет params» означает отсутствие свойства, не автоматически добавленный пустой объект.

Custom FieldType тоже получает source type; options.validate — custom. Custom/server могут передавать optional message. Ядро его не переводит и не подставляет code-as-text. Имена sources не являются enum допустимых codes. Generic legacy codes custom/server/external из bridges не входят в каталог встроенных правил; adapter может явно выбрать свой server code. Любой непустой код приложения допустим.

## Полный перечень правил

Обозначения: v — clean value; n — длина коллекции. Ограничение выполняется, когда настроено. Numeric boundary params — numbers, exclusivity flags — booleans. Scalar empty/required и cast gates предшествуют правилам типа; custom callback запускается после успеха типа. ODR-03 фиксирует traversal/timing по архитектуре; значения кодов сохраняются.

| Code | Точные params | Владелец и условие | Порядок/gates |
| --- | --- | --- | --- |
| required | нет | Raw Field: null/undefined, строка пуста после trim или пустой массив, isRequired=true; коллекция n=0 и required=true | Пустой optional scalar успешен, type/custom пропущены. Текущие defaults различаются: ArrayField true, ArrayFormField false/undefined; молча не унифицировать. |
| invalid_type | `{expected: BuiltinTypeId}`; точные IDs ниже | Nonempty Field не приводится (clean null); защитная finite-проверка NumberType; защитная validity-проверка Date/Luxon | Field cast failure пропускает type/custom. Прямая проверка типа не выполняет required/cast. См. таблицу routes. |
| min_length | `{min: number}` | String v.length < minLength | Длина в UTF-16 code units JavaScript, не graphemes; до max_length/pattern |
| max_length | `{max: number}` | String v.length > maxLength | После min_length, до pattern |
| pattern | нет | Не совпал configured String regex; Decimal нарушает numeric grammar, не имеет integer part либо после separator ноль fractional digits | String клонирует regex без g/y. Grammar Decimal: `^-?\d+\.?\d*$`; + и exponent text отклоняются. Nonfinite/direct numeric exponent representation после String conversion тоже может дать pattern. Новые reason/pattern params не добавляются. |
| integer | нет | Number конечен, но Number.isInteger(v)=false | После finite guard, до bounds; bounds тоже могут нарушаться |
| min_value | `{min: number, exclusive: boolean}` | v<=gt → `{min:gt,exclusive:true}`; v<ge → `{min:ge,exclusive:false}`; Number/Decimal | gt до ge; оба могут дать один code |
| max_value | `{max: number, exclusive: boolean}` | v>=lt → `{max:lt,exclusive:true}`; v>le → `{max:le,exclusive:false}`; Number/Decimal | lt до le, после minimum bounds |
| max_digits | `{max: number, scope: 'integer' \| 'total'}` | Integer digits Decimal > maxDigits-decimalPlaces: integer/max difference; при separator total digits > maxDigits: total/maxDigits | Знак/separator не цифры. Возможны обе ошибки, integer до total. Defaults maxDigits=8, decimalPlaces=2. Leading zeroes считаются цифрами/символами. |
| decimal_places | `{max: number}` | Fractional digits > decimalPlaces при существующей непустой fractional part | После max_digits; без округления. Любая digit/precision/format error пропускает numeric bounds. |
| must_be_true | нет | Boolean mustBeTrue=true и v!==true | До must_be_false; false/0 не считаются scalar emptiness |
| must_be_false | нет | Boolean mustBeFalse=true и v!==false | После must_be_true |
| min_date | `{min: number}` | Date/Luxon v раньше minDate по date-only/datetime policy | Исходный boundary timestamp в миллисекундах epoch, не отформатированная/нормализованная дата отображения. До max_date. |
| max_date | `{max: number}` | Date/Luxon v позже maxDate по той же policy | Исходные boundary milliseconds, после min_date |
| invalid_year | `{min: 1900, max: 2100}` | Luxon year<1900 либо >2100 | Допустимые границы включены; после date bounds. Не правило DateType. |
| min_items | `{min: number}` | ArrayField n<minItems либо ArrayFormField n<minForms | Текущий required gate до minimum; кода min_forms нет |
| max_items | `{max: number}` | ArrayField n>maxItems либо ArrayFormField n>maxForms | Текущий minimum gate до maximum; кода max_forms нет |

## Стабильные машинные идентификаторы типов — ODR-01

В исходниках шесть конкретных built-in FieldType classes, **отдельного DateTimeType нет**. DateType использует native Date в обоих режимах isDatetime; DateLuxonType — Luxon DateTime в обоих режимах через optional adaptform/luxon. DateTime здесь — класс значения Luxon, не core built-in constructor. Date-only/datetime определяет настроенный семантический тип, не localized label или constructor.name.

| Built-in / mode | Обязательный typeId / invalid_type.expected | Clean representation |
| --- | --- | --- |
| StringType | string | string |
| NumberType | number | finite number |
| DecimalType | decimal | Существующее clean string/number representation |
| BooleanType | boolean | boolean |
| DateType, isDatetime отсутствует/false | date | native Date, calendar-date comparison |
| DateType, isDatetime true | datetime | native Date, timestamp comparison |
| DateLuxonType, isDatetime отсутствует/false | luxon_date | Luxon DateTime, прежняя date normalization |
| DateLuxonType, isDatetime true | luxon_datetime | Luxon DateTime, datetime comparison |

IDs — стабильные case-sensitive contract literals. Date typeId — readonly getter эффективного isDatetime mode: явное поддерживаемое изменение опции режима меняет semantic ID и инвалидирует client-check marker; locale/constructor name не используются. Сохранить cast/inputFormat/comparison, включая существующие отличия веток Luxon. OutputFormat удалить: проверка исходников показала использование только для message formatting; приложение форматирует вывод само.

| Route invalid_type | Исторический expected (исходники не менялись) | Будущий expected |
| --- | --- | --- |
| Field failed cast | localized getTypeName() | fieldType.typeId, включая явные custom IDs |
| NumberType direct defensive finite check | finite_number | number; тот же machine ID, что при cast |
| DateType direct invalid Date | date | date либо datetime по mode |
| DateLuxonType direct invalid DateTime | date | luxon_date либо luxon_datetime по mode |

Finite_number Number и date Luxon намеренно мигрируют как metadata без новых validation codes. validateErrors(value:T) принимает type-domain values, не raw JSON. Field владеет required/cast. Direct NaN/Infinity, invalid Date/DateTime сохраняют defensive invalid_type. Decimal.cast отклоняет nonfinite raw input (Field invalid_type), а direct rules преобразуют type-domain numeric input в строку и могут дать pattern; это преобразование правила не связано с запретом неявной сериализации params/message. Значения вне declared domain могут бросать; universal coercion не обещается.

Миграция custom types: явно реализовать readonly typeId:string и validateErrors; удалить getTypeName/старые validate overrides без alias. Выбрать стабильный application ID (например app.slug), независимый от rename/minification/locale. Нельзя переиспользовать reserved built-in IDs для другого semantic domain; общий ID намеренно означает общий domain. UI introspection заменить словарём приложения по typeId. Отсутствующий/пустой typeId — ErrorContractError при type setup, не fallback к имени конструктора.

```ts
class SlugType implements FieldTypeContract<string, object> {
  readonly typeId = 'app.slug'
  constructor(public options: object) {}
  cast(raw: unknown): string | null { return typeof raw === 'string' ? raw : null }
  validateErrors(value: string): readonly ValidationErrorInput[] {
    return /^[a-z-]+$/.test(value) ? [] : [{code: 'app.slug_format'}]
  }
}
void SlugType
```

## Порядок и особенности Decimal

- Number: invalid_type с остановкой; иначе integer, gt, ge, lt, le.
- String: min_length, max_length, pattern; вернуть все нарушения в этом порядке.
- Decimal: grammar/no-integer failure немедленно возвращает pattern. Затем integer max_digits, total max_digits (только с separator), empty-fraction pattern или decimal_places. При любом таком нарушении до gt/ge/lt/le не доходит. Numeric bounds используют существующий parseFloat.
- `123.`, `0.`, `-123.` и comma-normalized equivalents остаются редактируемыми clean strings, но validation даёт pattern; без округления/автозавершения. Completed decimal strings сохраняются строками.
- Date без isDatetime сравнивает локальные календарные даты, иначе timestamps; Luxon сохраняет сравнение startOf('day'). Params хранят исходный boundary timestamp, даже если время игнорируется. Formatting/outputFormat, ранее применявшиеся только к сообщениям, не должны порождать перевод/форматирование дат внутри validators.
- Будущие коллекции сохраняют первую own required/min/max failure, пропускают own custom при ней, независимо обходят всех детей при explicit full validate (ODR-03 B). ArrayFormField required по умолчанию false, ArrayField true. Это текущее различие, не согласованное legacy removal.

## TypeScript-карта параметров

Тип BuiltinTypeId фиксирует восемь IDs шести реализаций с режимами даты. Это union только для built-in producers; общий custom invalid_type.expected остаётся string. Number требует runtime finite-check по ODR-02. Built-in message запрещён типами; runtime formatter/factory не добавляется.

```ts
export type BuiltinTypeId =
  | 'string' | 'number' | 'decimal' | 'boolean'
  | 'date' | 'datetime' | 'luxon_date' | 'luxon_datetime'

export interface BuiltinErrorParams {
  required: undefined
  invalid_type: {readonly expected: BuiltinTypeId}
  min_length: {readonly min: number}
  max_length: {readonly max: number}
  pattern: undefined
  integer: undefined
  min_value: {readonly min: number; readonly exclusive: boolean}
  max_value: {readonly max: number; readonly exclusive: boolean}
  max_digits: {readonly max: number; readonly scope: 'integer' | 'total'}
  decimal_places: {readonly max: number}
  must_be_true: undefined
  must_be_false: undefined
  min_date: {readonly min: number}
  max_date: {readonly max: number}
  invalid_year: {readonly min: 1900; readonly max: 2100}
  min_items: {readonly min: number}
  max_items: {readonly max: number}
}

export type BuiltinValidationErrorInput = {
  [C in keyof BuiltinErrorParams]: {
    readonly code: C
    readonly message?: never
  } & (BuiltinErrorParams[C] extends undefined
    ? {readonly params?: never}
    : {readonly params: BuiltinErrorParams[C]})
}[keyof BuiltinErrorParams]
```

Использовать discriminated union (или конкретный Extract member) для проверки built-in producers и примеров каталога. Union с неограниченным `{code:string}` нельзя объявлять защитой от неверных built-in params: общий member поглотит проверку. General user input намеренно расширяем. Custom params используют точный recursive JSON-domain и пределы раздела 6 архитектуры (ODR-02).

## Доказательства и проверки перед выпуском

Исходники: [Field required/cast](../../src/core/fields/Field.ts#L193), [String](../../src/core/types/StringType.ts#L23), [Number](../../src/core/types/NumberType.ts#L31), [Decimal](../../src/core/types/DecimalType.ts#L55), [Boolean](../../src/core/types/BooleanType.ts#L34), [Date](../../src/core/types/DateType.ts#L36), [Luxon](../../src/core/types/DateLuxonType.ts#L95), [ArrayField](../../src/core/fields/ArrayField.ts#L185), [ArrayFormField](../../src/core/fields/ArrayFormField.ts#L195). [Structured tests](../../tests/unit/structured-errors.test.ts#L130) покрывают families и повторяющиеся bounds; [Decimal tests](../../tests/unit/types/DecimalType.test.ts) сохраняют input rules.

До релиза: реализовать утверждённые ODR-01/02; проверить точные code/params/order всех строк и routes; отсутствие message и language/type-label fallback в built-ins; сохранение absent/empty custom/server messages; duplicate codes; negative declarations, оба entry points и loaders. Invalid options, validator exceptions, configuration/parser failures не добавляются в этот каталог ValidationError; developer diagnostics не являются переводом validation errors.
