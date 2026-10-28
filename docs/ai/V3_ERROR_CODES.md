# AdaptForm 3.0 — I18N-01 error code catalogue

[English](V3_ERROR_CODES.md) · [Русский](V3_ERROR_CODES.ru.md)

Companion to [V3-02](V3_ARCHITECTURE.md), **READY_FOR_OWNER_REVIEW**. All **17 built-in codes** are retained. The future catalogue incorporates approved ODR-01 (machine typeId), ODR-02 (JSON params) and ODR-03 (lifecycle). Runtime is unchanged; migration differences are explicit below.

## Contract and ownership

Built-in output contains code and, where listed, params; it never contains message, translated type names, formatted dates, locale, raw value or a fallback display string. Normalization supplies source `type`. Codes/parameter keys/types/meaning are public contracts; changing them later requires a compatibility decision. Duplicate codes are legal, including different parameters and identical parameters. Absence of params means omission, not an automatically added empty object.

Custom FieldType checks also receive source type; options.validate receives source custom. Custom and server errors may supply optional message. Core neither translates it nor supplies a code-as-text fallback. Source names are not an enum of allowed codes. Generic legacy codes custom/server/external from bridges are not built-in rule codes; adapters may explicitly choose their own server code. Unknown nonempty application codes remain valid.

## Complete rule inventory

Symbols: v is clean value; n is collection length. Constraints run only when configured. All listed numeric boundary parameters are numbers, all exclusivity flags booleans. Scalar empty/required and cast gates precede type rules; custom callbacks run only after type success. ODR-03 fixes traversal/timing as specified in the architecture; code meanings remain unchanged.

| Code | Exact params | Owner and occurrence | Ordering/gates |
| --- | --- | --- | --- |
| required | none | Field raw input is null/undefined, a trimmed-empty string or empty array and isRequired resolves true; collection n=0 and required true | Scalar empty optional succeeds and skips type/custom. Collection default required differs: ArrayField true, ArrayFormField false/undefined in current code; do not silently unify defaults. |
| invalid_type | `{expected: BuiltinTypeId}`; exact IDs below | Nonempty Field cannot cast (clean null); defensive NumberType finite check; defensive Date/Luxon validity check | Failed Field cast skips type/custom. Direct type checks do not run required/cast. See route table below. |
| min_length | `{min: number}` | String v.length < minLength | JavaScript UTF-16 code-unit length, not grapheme count; before max_length/pattern |
| max_length | `{max: number}` | String v.length > maxLength | After min_length, before pattern |
| pattern | none | String configured regex does not match; Decimal fails numeric grammar, has no integer part, or has a separator with zero fractional digits | String clones regex without g/y flags. Decimal grammar is `^-?\d+\.?\d*$`; leading + and exponent text are rejected. Nonfinite/direct exponent-form numeric values can become pattern errors after String conversion. No reason/pattern text is added as a new param. |
| integer | none | Number v is finite but not Number.isInteger(v) | After finite guard, before bounds; bounds can also fail |
| min_value | `{min: number, exclusive: boolean}` | v <= gt → `{min:gt,exclusive:true}`; v < ge → `{min:ge,exclusive:false}`; Number/Decimal | gt before ge; both can emit the same code |
| max_value | `{max: number, exclusive: boolean}` | v >= lt → `{max:lt,exclusive:true}`; v > le → `{max:le,exclusive:false}`; Number/Decimal | lt before le, after minimum bounds |
| max_digits | `{max: number, scope: 'integer' \| 'total'}` | Decimal integer digit count > maxDigits-decimalPlaces emits integer/max difference; with a decimal separator, total digit count > maxDigits emits total/maxDigits | Sign and separator are not digits. Both entries can occur. Integer limit precedes total limit. Defaults maxDigits=8, decimalPlaces=2. Leading zeroes count as characters/digits. |
| decimal_places | `{max: number}` | Decimal fractional digit count > decimalPlaces, when fractional part exists and is nonempty | After max_digits entries; never rounds. Any digit/precision/format error skips numeric bounds. |
| must_be_true | none | Boolean mustBeTrue=true and v!==true | Before must_be_false; booleans false/0 are not scalar emptiness |
| must_be_false | none | Boolean mustBeFalse=true and v!==false | After must_be_true |
| min_date | `{min: number}` | Date/Luxon v precedes minDate using configured date-only or datetime comparison | Parameter is the original boundary's epoch milliseconds, not a formatted or normalized display date. Before max_date. |
| max_date | `{max: number}` | Date/Luxon v exceeds maxDate with the same comparison policy | Original boundary epoch milliseconds; after min_date |
| invalid_year | `{min: 1900, max: 2100}` | Luxon year <1900 or >2100 | Inclusive allowed interval; after date bounds. Not a DateType rule. |
| min_items | `{min: number}` | ArrayField n<minItems or ArrayFormField n<minForms | Current container required gate precedes minimum; no min_forms code |
| max_items | `{max: number}` | ArrayField n>maxItems or ArrayFormField n>maxForms | Current minimum gate precedes maximum; no max_forms code |

## Stable machine type identifiers — ODR-01

Source inspection found six concrete built-in FieldType classes, **no separate DateTimeType**. DateType uses native Date in both isDatetime modes; DateLuxonType uses Luxon DateTime in both modes through the optional adaptform/luxon entry. DateTime here is a Luxon value class, not a core built-in constructor. Date-only versus datetime identifies the configured semantic type, not a localized label or constructor.name.

| Built-in / mode | Required typeId / invalid_type.expected | Clean representation |
| --- | --- | --- |
| StringType | string | string |
| NumberType | number | finite number |
| DecimalType | decimal | Existing clean string/number representation |
| BooleanType | boolean | boolean |
| DateType, isDatetime absent/false | date | native Date, calendar-date comparison |
| DateType, isDatetime true | datetime | native Date, timestamp comparison |
| DateLuxonType, isDatetime absent/false | luxon_date | Luxon DateTime, existing date normalization |
| DateLuxonType, isDatetime true | luxon_datetime | Luxon DateTime, datetime comparison |

IDs are stable case-sensitive contract literals. Date typeId is a readonly getter of the effective isDatetime mode: an explicit supported mode-option change changes its semantic ID and invalidates the client-check marker; it never derives from locale or constructor name. Preserve cast/inputFormat/comparison behavior, including existing Luxon branch differences. Remove outputFormat because source inspection shows it is used only by message formatting; applications format output themselves.

| invalid_type route | Historical expected (unchanged source) | Future expected |
| --- | --- | --- |
| Field failed cast | localized getTypeName() | fieldType.typeId, including explicit custom IDs |
| NumberType direct defensive finite check | finite_number | number; same machine ID as its cast route |
| DateType direct invalid Date | date | date or datetime according to mode |
| DateLuxonType direct invalid DateTime | date | luxon_date or luxon_datetime according to mode |

Number's finite_number and Luxon's date are intentionally migrated as metadata, without new validation codes. validateErrors(value:T) still accepts type-domain values rather than raw JSON. Field owns required/cast. Direct NaN/Infinity, invalid Date and invalid DateTime retain defensive invalid_type checks. Decimal.cast rejects nonfinite raw input (Field invalid_type), while direct Decimal rules stringify their type-domain numeric input and can emit pattern; this rule-specific conversion is unrelated to forbidden implicit params/message serialization. Values outside the declared domain may throw; validateErrors does not promise universal coercion.

Custom-type migration: implement explicit readonly typeId:string and validateErrors; delete getTypeName and old validate overrides, with no alias. Use a stable application ID (for example app.slug), independent of class renaming/minification/locale. Applications must not reuse reserved built-in IDs for different semantic domains; shared IDs deliberately mean the same domain. Replace UI introspection with an application dictionary keyed by typeId. Missing/empty typeId is an ErrorContractError during type setup, never a constructor-name fallback.

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

## Ordering and Decimal details

- Number: invalid_type short-circuit; otherwise integer, gt, ge, lt, le.
- String: min_length, max_length, pattern; return all failures in this order.
- Decimal: grammar/no-integer failures return pattern immediately. Otherwise integer max_digits, total max_digits (only with separator), empty-fraction pattern or decimal_places. Any such errors return before gt/ge/lt/le. Numeric bound parsing uses the existing parseFloat semantics.
- `123.`, `0.`, `-123.` and comma-normalized equivalents remain editable clean strings but fail validation with pattern; no rounding or automatic completion. Completed decimal strings preserve their clean string representation.
- Date compares local calendar dates when isDatetime is false, timestamps otherwise; Luxon uses its existing startOf('day') comparison. Parameters retain original boundary timestamps even when comparison ignores time. Formatting/outputFormat previously used only for messages must not create translation or date-formatting behavior in validators.
- Future containers retain the first own required/min/max failure, skip own custom on that failure, and independently traverse every child on explicit full validate (ODR-03 B). ArrayFormField isRequired currently defaults to false; ArrayField defaults to true. This is a current difference, not approved legacy removal.

## TypeScript parameter map

BuiltinTypeId fixes eight IDs for six implementations including date modes. This union applies only to built-in producers; custom invalid_type.expected remains string in the general input. Numbers require runtime finite checks under ODR-02. Built-in message is forbidden at the type level; no runtime formatter/factory is added.

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

Use this discriminated union (or its specific Extract member) to validate built-in producers and catalogue examples. A union with an unconstrained `{code:string}` member must not be advertised as rejecting invalid built-in parameters: that member would swallow the check. General user input deliberately remains extensible. Custom parameter values use the exact recursive JSON domain and budgets in architecture section 6 (ODR-02).

## Evidence and release checks

Sources: [Field required/cast](../../src/core/fields/Field.ts#L193), [String](../../src/core/types/StringType.ts#L23), [Number](../../src/core/types/NumberType.ts#L31), [Decimal](../../src/core/types/DecimalType.ts#L55), [Boolean](../../src/core/types/BooleanType.ts#L34), [Date](../../src/core/types/DateType.ts#L36), [Luxon](../../src/core/types/DateLuxonType.ts#L95), [ArrayField](../../src/core/fields/ArrayField.ts#L185), [ArrayFormField](../../src/core/fields/ArrayFormField.ts#L195). Existing [structured error tests](../../tests/unit/structured-errors.test.ts#L130) cover code families and repeated bounds; [Decimal tests](../../tests/unit/types/DecimalType.test.ts) preserve input rules.

Before release: implement approved ODR-01/02; assert exact code/params and order for every row and route; assert no built-in owns message or language/type-label fallback; test custom/server absent and empty messages unchanged; verify duplicate codes; run negative declaration cases, both entry points and both loaders. Invalid options/validator exceptions/configuration/parser failures are not additions to this ValidationError catalogue; their developer diagnostics do not translate validation errors.
