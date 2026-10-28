# AdaptForm 3.0 — каталог кодов ошибок I18N-01

[English](V3_ERROR_CODES.md) · [Русский](V3_ERROR_CODES.ru.md)

Дополнение к [V3-02](V3_ARCHITECTURE.ru.md). **Инвентаризированы 17 существующих built-in codes.** Формы params и условия сохраняют проверки текущей корректной конфигурации, кроме удаления сообщений по I18N-01. Для invalid_type.expected явно открыто ODR-01; пока строка заблокирована, каталог не объявляется полностью финальным. Нормализация произвольных пользовательских params — ODR-02.

## Контракт и происхождение

Built-in output содержит code и указанные params; никогда message, перевод имени типа, отформатированную дату, locale, raw value или fallback display string. Нормализация ставит source type. Codes/keys/types/meaning параметров — публичный контракт; дальнейшее изменение требует решения о совместимости. Повторы кодов допустимы с разными и одинаковыми params. «Нет params» означает отсутствие свойства, не автоматически добавленный пустой объект.

Custom FieldType тоже получает source type; options.validate — custom. Custom/server могут передавать optional message. Ядро его не переводит и не подставляет code-as-text. Имена sources не являются enum допустимых codes. Generic legacy codes custom/server/external из bridges не входят в каталог встроенных правил; adapter может явно выбрать свой server code. Любой непустой код приложения допустим.

## Полный перечень правил

Обозначения: v — clean value; n — длина коллекции. Ограничение выполняется, когда настроено. Numeric boundary params — numbers, exclusivity flags — booleans. Scalar empty/required и cast gates предшествуют правилам типа; custom callback запускается после успеха типа. ODR-03 определяет traversal/constructor timing, не значения кодов.

| Code | Точные params | Владелец и условие | Порядок/gates |
| --- | --- | --- | --- |
| required | нет | Raw Field: null/undefined, строка пуста после trim или пустой массив, isRequired=true; коллекция n=0 и required=true | Пустой optional scalar успешен, type/custom пропущены. Текущие defaults различаются: ArrayField true, ArrayFormField false/undefined; молча не унифицировать. |
| invalid_type | `{expected: string}`; точные target IDs — **ODR-01** | Nonempty Field не приводится (clean null); защитная finite-проверка NumberType; защитная validity-проверка Date/Luxon | Field cast failure пропускает type/custom. Прямая проверка типа не выполняет required/cast. См. таблицу routes. |
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

## Routes invalid_type — нерешённая граница локализации

| Route | Текущее доказательство | Текущее expected | Target status |
| --- | --- | --- | --- |
| Field failed cast | Field.ts:219–228 | getTypeName(): String/Number/Decimal/Boolean/Date возвращают русские labels; Date/Luxon зависят от isDatetime | **Заблокировано**: утвердить machine identity member/values; localized labels в 3.0 не выдавать |
| Защитная finite-проверка NumberType | NumberType.ts:31–36 | finite_number | Существующее machine value; согласовать с cast route |
| Защитная invalid Date | DateType.ts:36–41 | date | Существующее machine value |
| Защитная invalid DateTime | DateLuxonType.ts:95–101 | date | Существующее machine value; молча не переименовывать в luxon |

validateErrors(value:T) принимает type-domain value, не произвольный raw JSON. Required/cast принадлежат Field. При прямом вызове Number NaN/Infinity, invalid Date и invalid DateTime дают существующие защитные ошибки. Decimal.cast отклоняет nonfinite input (Field invalid_type), а прямые Decimal rules преобразуют его в строку и дают pattern. Не вводить новые codes для сокрытия различий входных путей. Values вне объявленного domain типа могут вызвать исключение; validateErrors не обещает universal coercion.

## Порядок и особенности Decimal

- Number: invalid_type с остановкой; иначе integer, gt, ge, lt, le.
- String: min_length, max_length, pattern; вернуть все нарушения в этом порядке.
- Decimal: grammar/no-integer failure немедленно возвращает pattern. Затем integer max_digits, total max_digits (только с separator), empty-fraction pattern или decimal_places. При любом таком нарушении до gt/ge/lt/le не доходит. Numeric bounds используют существующий parseFloat.
- `123.`, `0.`, `-123.` и comma-normalized equivalents остаются редактируемыми clean strings, но validation даёт pattern; без округления/автозавершения. Completed decimal strings сохраняются строками.
- Date без isDatetime сравнивает локальные календарные даты, иначе timestamps; Luxon сохраняет сравнение startOf('day'). Params хранят исходный boundary timestamp, даже если время игнорируется. Formatting/outputFormat, ранее применявшиеся только к сообщениям, не должны порождать перевод/форматирование дат внутри validators.
- Текущие коллекции останавливаются на первом own required/min/max failure. Изменение descendant traversal — ODR-03. ArrayFormField required по умолчанию false, ArrayField true. Это текущее различие, не согласованное legacy removal.

## TypeScript-карта параметров

Exact literals invalid_type остаются ODR-01. Карта фиксирует существующие shapes, не выбирая literals и не сужая custom params. Built-in message запрещён типами. Runtime formatter/factory этим каталогом не вводится.

```ts
export interface BuiltinErrorParams {
  required: undefined
  invalid_type: {readonly expected: string}
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

Использовать discriminated union (или конкретный Extract member) для проверки built-in producers и примеров каталога. Union с неограниченным `{code:string}` нельзя объявлять защитой от неверных built-in params: общий member поглотит проверку. General user input намеренно расширяем. Type-level precision произвольных custom params определяется ODR-02.

## Доказательства и проверки перед выпуском

Исходники: [Field required/cast](../../src/core/fields/Field.ts#L193), [String](../../src/core/types/StringType.ts#L23), [Number](../../src/core/types/NumberType.ts#L31), [Decimal](../../src/core/types/DecimalType.ts#L55), [Boolean](../../src/core/types/BooleanType.ts#L34), [Date](../../src/core/types/DateType.ts#L36), [Luxon](../../src/core/types/DateLuxonType.ts#L95), [ArrayField](../../src/core/fields/ArrayField.ts#L185), [ArrayFormField](../../src/core/fields/ArrayFormField.ts#L195). [Structured tests](../../tests/unit/structured-errors.test.ts#L130) покрывают families и повторяющиеся bounds; [Decimal tests](../../tests/unit/types/DecimalType.test.ts) сохраняют input rules.

До релиза: закрыть ODR-01/02; проверить точные code/params/order всех строк и routes; отсутствие message и language/type-label fallback в built-ins; сохранение absent/empty custom/server messages; duplicate codes; negative declarations, оба entry points и loaders. Invalid options, validator exceptions, configuration/parser failures не добавляются в этот каталог ValidationError; developer diagnostics не являются переводом validation errors.
