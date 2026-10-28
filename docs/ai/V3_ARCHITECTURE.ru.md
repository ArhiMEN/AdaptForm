# AdaptForm 3.0 — архитектурная спецификация V3-02

[English](V3_ARCHITECTURE.md) · [Русский](V3_ARCHITECTURE.ru.md)

Статус: **BLOCKED для реализации; комплект спецификации подготовлен к проверке владельцем**. Утверждённые требования отделены от проектных предложений и раздела `OWNER_DECISION_REQUIRED`. Документ не разрешает реализацию, выпуск, merge или публикацию.

## 1. База и происхождение документа

Дата проверки: 2026-10-28. Локальная ветка `work`, HEAD `670c6a04014fbf938574bfd8eb2a706e44a9d4d0`; index и рабочее дерево исходно чистые. Удалённый master совпадает с HEAD. Версия пакета остаётся 2.2.0. Исторические документы этапа 2.3.0 описывают принятые изменения исходников, а не опубликованную 2.3.0.

[PR #29](https://github.com/ArhiMEN/AdaptForm/pull/29), `docs/v3-architecture-legacy-policy`, — **открытый draft, не merged**. Head `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`, base совпадает с исследованным HEAD. Шесть файлов: AGENTS EN/RU, DECISIONS EN/RU и V3_ARCHITECTURE EN/RU. Архитектурные документы отсутствовали локально. Использованы те же предполагаемые пути, направление развёрнуто в V3-02; это не интегрирует PR #29 или его изменения AGENTS. При отдельно разрешённой интеграции нужно согласовать обе истории документации, не перезаписывая одну автоматически.

Прочитаны AGENTS EN/RU, контекст/решения, состояние HF-005–010, identity HF-011, зависимости HF-013 и ошибки HF-015. Ссылки на код относятся к этой неизменённой базе. Аудит V3-01 — доказательная основа, а не автоматическое утверждение всех его предложений API.

Навигация: [каталог кодов](V3_ERROR_CODES.ru.md), [миграция, задачи и риски](../roadmap/v3.0.0/PLAN.ru.md). Текущие владельцы: [Field](../../src/core/fields/Field.ts), [Form](../../src/core/Form.ts), [типы](../../src/core/types/FieldType.ts), [scalar collection](../../src/core/fields/ArrayField.ts), [form collection](../../src/core/fields/ArrayFormField.ts), [ошибки](../../src/core/ValidationError.ts), [схема](../../src/core/ErrorsShema.ts), [snapshots](../../src/core/state/snapshot.ts), [граф](../../src/core/state/DependencyGraph.ts), [scheduler](../../src/core/state/ObservableNode.ts).

## 2. Утверждённые требования

- Цель 3.0.0 заменяет прежнее направление 2.3.0; сохранить STAB-01/02, HF-011, PERF-01, HF-013 и полезную функциональность HF-015.
- Единственное каноническое представление — структурированные ошибки. Источники: type/custom/server/manual. Непустые коды, необязательные params; повторы кодов и порядок сохраняются. Source назначает ядро. У локальных ошибок Field нет path; агрегация Form добавляет полный относительный путь. Собственные globals Form агрегируются с `[]`.
- I18N-01: ядро **не переводит и не форматирует ошибки**. Нет словарей RU/EN, formatter/resolver, локали, i18n-зависимости или fallback message/code. Встроенные правила возвращают только code и params. Пользовательский/серверный input может содержать message, в том числе `''`. Отображением полностью управляет приложение.
- Типы реализуют только validateErrors(). Новые структурные реализации не требуют наследования. Пользовательские validators возвращают массивы без source; строки, boolean, отдельные объекты и Promise недопустимы. Async validation исключена.
- Узловой validate() обновляет состояние и возвращает `{valid: boolean}`, учитывая все активные источники. getErrors() только читает. Ошибки readonly и отделены от объектов вызывающего кода.
- Validation сохраняет server/manual. Фактическое изменение значения поля очищает оба собственных источника; изменение соседа не очищает чужие ошибки. Reset очищает ошибки; commitBaseline — нет.
- Validators и required callbacks не могут менять состояние во всех сценариях, включая коллекции, прямую проверку и dependency pass. Исключения — ошибки контракта/программы, а не ValidationError.
- Развивать ErrorsSchema с декларативной конфигурацией и пользовательским адаптером, без распознавания backend. Parse/Normalize отделены от Apply. Replace по умолчанию охватывает всю Form-получатель; append явный. Неизвестный путь по умолчанию вызывает ошибку; global/ignore задаются явно. Preflight предшествует всем записям. Revision и явный токен операции защищают от поздних ответов. HTTP-клиента нет.
- Нет скрытых legacy bridges. При спорном удалении, fallback, обходном решении или дублировании состояния остановить затронутое проектирование/реализацию, представить доказательства и варианты. Независимую разрешённую документацию можно продолжать.

## 3. Сигнатуры ошибок и валидации

Объявления фиксируют утверждённую форму. Значение произвольных params намеренно не сужается до JSON без ODR-02. Это будущие декларации внутри Markdown, **не текущие exports пакета**.

```ts
export type ValidationErrorSource = 'type' | 'custom' | 'server' | 'manual'
export type ValidationPath = readonly (string | number)[]

export interface ValidationErrorInput {
  readonly code: string
  readonly params?: Readonly<Record<string, unknown>>
  readonly message?: string
}

export interface ValidationError extends ValidationErrorInput {
  readonly source: ValidationErrorSource
}

export interface LocatedValidationError extends ValidationError {
  readonly path: ValidationPath
}

export interface ValidationResult {
  readonly valid: boolean
}

export type FieldValidator<T, F extends Form = Form> = (
  value: T,
  form?: F,
) => readonly ValidationErrorInput[]

export type RequiredRule<F extends Form = Form> =
  boolean | ((form?: F) => boolean)

export interface FieldTypeContract<T, O extends object> {
  options: O
  cast(rawValue: unknown): T | null
  validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export type FieldTypeConstructor<T, O extends object> =
  new (options: O) => FieldTypeContract<T, O>
```

FieldTypeContract — согласованное вычислительное ядро, **не утверждение об одобренном удалении getTypeName()**. Итоговый член метаданных заблокирован ODR-01. Базовый класс остаётся необязательным удобством; нельзя требовать instanceof FieldType, branding закрытыми членами, validate bridge или поиск override старого метода. Общие defaults Field одинаковы для структурных и наследуемых типов. Опции и cast конкретных типов сохраняются.

Существующий контекст `(value, form?)` сохраняется; оболочка context из V3-01 не была утверждена. ArrayField callback получает clean values, ArrayFormField callback — экземпляры Form. Runtime-защита действует, хотя TypeScript не исключает mutator methods из этих объектов. Типизировать validators существующих options без ослабления FormFieldsValue inference. Не расширять HF-013 на вложенные пути и коллекции.

Предлагаемая узловая поверхность для проверки владельцем:

```ts
export interface ErrorNodeApi {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  validate(form?: Form): ValidationResult
  setErrors(errors: readonly ValidationErrorInput[]): void
  clearErrors(options?: {
    readonly sources?: readonly ValidationErrorSource[]
    readonly recursive?: boolean
  }): void
}

// Scalar Field: own errors, without path.
export interface ScalarErrorReader {
  getErrors(): readonly ValidationError[]
}

// Form and collections: a flat list relative to the receiver.
export interface AggregateErrorReader {
  getErrors(): readonly LocatedValidationError[]
}
```

setErrors() заменяет только собственные manual errors; setErrors([]) не отменяет завершённую клиентскую проверку. clearErrors() по умолчанию очищает все собственные источники, recursive:false; явная очистка type/custom сбрасывает знание о клиентской проверке. Собственные ошибки Form — globals. Замены методов раскрыты в миграционном реестре, а не добавлены скрытыми aliases.

Field сохраняет tri-state: любая own error означает false; без ошибок, но с непроверенным текущим входом — null; завершённая успешная проверка текущего входа — true. Form/collections сохраняют boolean aggregation: непроверенные descendants не позволяют true. Успешно завершившийся validate() возвращает `valid === (receiver.isValid === true)` в момент завершения, до последующих записей subscriber/batch. Поэтому сохранённые server/manual делают valid false даже при успехе всех клиентских правил. Повторные чтения не вызывают cast/validation, не меняют touched и не запускают локализацию.

Пример новых результатов и callbacks:

```ts
const field = new Field(StringType, 'x', {
  validate: (value: string) =>
    value.startsWith('x') ? [] : [{code: 'app.prefix', params: {prefix: 'x'}}],
})
field.setErrors([{code: 'app.review_required', message: 'Review requested'}])
const {valid} = field.validate() // false: manual error is still active
const errors = field.getErrors() // no validation, no path, no translation
void [valid, errors]
```

Никакой helper ядра не подставляет message при его отсутствии. Custom codes — любые непустые строки; включать их в каталог built-in необязательно. Discriminated types каталога проверяют параметры встроенных кодов; общий input принимает коды приложения без закрытого enum. Переданные через нетипизированный input source и локальный path не считаются достоверными и не копируются. Неверный code, форма params или контейнер результата вызывает ошибку контракта до замены состояния.

## 4. Выполнение, состояние и запрет мутаций

Сохранить scalar порядок: empty/required → failed cast → type rules → custom rule. Пустое необязательное значение пропускает последующие правила. Type failure пропускает custom. Сохраняются действующие проверки, порядок, повторы и представления clean values, удаляется генерация сообщений. Каталог фиксирует реальные gates. Container early exits и construction timing — **ODR-03**, а не молча принятые изменения.

Compute boundary всегда защищает required/type/custom callbacks, независимо от графа. Public setters/mutators, reset, baseline, options replacement, error writes, structural methods, graph activation/disposal и рекурсивная validation из callback отклоняются до записи. Collection callbacks проходят тот же guard. Ядро записывает результат после выхода из пользовательского callback; флаги восстанавливаются через finally. Plugin initialization — отдельная фаза, её нельзя случайно запретить как validator.

Клиентские результаты вычисляются временно. При исключении, неверном результате или Promise пробросить ошибку, не создавать ValidationError и не отмечать попытку успешной. Сохранить server/manual и завершить уже выполненные внешние записи с существующим приоритетом исключений batch. Явно оставить проверку неизвестной; старое true не доказывает успех неудачной новой проверки. Ошибка root не означает, что непосещённые узлы проверены.

HF-013 сохраняет явную activation/disposal, direct ordinary Field endpoints, whole-pipeline dependencies, топологические chains/diamonds и dedup автоматического pass. Распространяются изменившиеся **clean** values; target заменяет только type/custom и сохраняет server/manual. Источника dependency нет. Explicit checks немедленные, включая batch. Чтение snapshot вызывает ноль validators. Сохранить ошибки конфигурации cycles/missing source/ownership и восстановление; это не пользовательские ошибки.

Произвольные in-place mutations values/options/arrays и opaque custom objects запрещены в callbacks, но не могут универсально перехватываться без Proxy. Гарантируется отклонение поддерживаемых mutation APIs; readonly — не sandbox. Сохранить обнаружение внешних изменений значений/контейнеров последующим чтением из PERF-01; это не гарантия revision tracking неподдерживаемых записей.

## 5. Жизненный цикл и identity

Проект для проверки: фактическое изменение — структурное неравенство post-plugin raw input **или** clean value по существующей политике поддерживаемых значений. Так различаются неверные raw inputs, оба приведённые к null. Равное присваивание может ставить touched как раньше, но не очищает server/manual. Фактическое изменение инвалидирует type/custom, очищает own server/manual, повышает revision и затем при необходимости запрашивает проверку. validate:false не создаёт автоматический запрос; старое клиентское true не сохраняется. Остальные defaults/plugins/cast, dirty и payload policies сохраняются.

| Операция | type/custom | server | manual | Прочее состояние |
| --- | --- | --- | --- | --- |
| Фактическая scalar-запись, validation on | Заменить запрошенной проверкой | Очистить own | Очистить own | Touched; повысить value revision |
| Фактическая scalar-запись, validation off | Очистить; unchecked | Очистить own | Очистить own | Touched; повысить value revision |
| Равное присваивание | Проверить только по запросу | Сохранить | Сохранить | Прежнее touched behavior |
| Explicit validate | Пересчитать выбранный pipeline | Сохранить | Сохранить | Не менять touched/baseline |
| Только dependency target recheck | Пересчитать target | Сохранить | Сохранить | Нет edit/revision target |
| Manual setErrors | Сохранить | Сохранить | Заменить own | Не менять values/touched |
| Server replace | Сохранить | Заменить в scope токена | Сохранить | Без validation |
| Server append | Сохранить | Добавить в scope токена | Сохранить | Без validation |
| commitBaseline | Сохранить | Сохранить | Сохранить | Только clean baseline |
| reset | Очистить; unchecked | Очистить | Очистить | Defaults, touched false, reset generation |
| Чтения/JSON/FormData | Сохранить | Сохранить | Сохранить | Без validation/serialization ошибок |
| Отклонённый parse/apply preflight | Сохранить | Сохранить | Сохранить | Без model writes/consumption токена |

Хранилище логически разделяет источники, но у каждой ошибки один канонический owner. Client-check marker — необходимое состояние, а не ещё один boolean, противоречащий активным errors. Изменяемой строковой оболочки нет. Предлагаемый независимый от UI порядок: type → custom → server → manual, insertion order внутри источника. Form обходит поля, затем own globals; коллекция — own errors, затем детей в текущем порядке. Порядок нужно проверить до реализации; дедупликации по code/message нет.

Правила контейнеров:

- Move сохраняет identity, baseline, own errors и subscribers retained nodes. Aggregate paths используют текущие индексы.
- Leaf edit очищает его own server/manual и эти источники у содержащих **collection nodes**, значение которых изменилось; unrelated items сохраняются.
- Insert/remove/move очищает own server/manual затронутых содержащих коллекций, включая equal-content move. Ошибки retained items и globals retained Forms сохраняются.
- Globals Form отдельны: descendant edits и structural changes их не очищают. Их очищают явная операция по источнику, scoped server replace или reset.
- Replacement setters создают новые nodes как сейчас; старые отсоединяются. Не сопоставлять по equal value. Новые экземпляры не наследуют ошибки старых.
- Текущая вложенность — через ArrayFormField; новый standalone FormField не вводится.
- Reset сохраняет surviving membership/order и constructor reset targets. Он не восстанавливает состав или baseline; baseline сохраняется, reset может быть dirty. Все ошибки очищаются рекурсивно, validation становится unknown. Каждый reset инвалидирует affected tokens даже при равных значениях.
- commitBaseline не меняет input revisions, errors или outstanding tokens. Dirty может стать false при наличии ошибок.

Batch синхронный, произвольные выполненные записи не откатывает. Automatic validation откладывается и объединяется; direct validate немедленен и возвращает текущую effective validity. Live getters видят текущие values; getSnapshot внутри batch — предыдущий committed snapshot. После завершения values/errors все affected snapshots фиксируются до notifications. Более поздняя запись того же batch может очистить только что применённые ошибки: порядок операций существенен. A→B→A повышает revisions и не восстанавливает очищенные server/manual; clean-based dirty и net-change policy HF-013 независимы.

## 6. Snapshots и readonly errors

Предлагаемая замена: обязательное `NodeSnapshot.errors: readonly ValidationError[]`, только own errors. Descendants остаются в child snapshots; aggregate paths не кэшируются во всех предках. После согласования реестра удаления убрать строковые errors/allErrors/globalErrors и дублирующее optional validationErrors. Сохранить value snapshots, dirty/touched, child snapshots и identities HF-011. Optional→required itemIds — отдельная миграция snapshot producers, не разрешение удалить identity.

Errors, params, paths и списки отделены от входа и глубоко immutable в выбранной области ODR-02. Изменения code/source/params уведомляют даже при том же message. Равное итоговое состояние сохраняет committed snapshot reference и не уведомляет. Aggregate getErrors может аллоцировать и не обязан сохранять reference identity. Не замораживать input вызывающего кода на месте. Не хранить response, values или parent references внутри ошибок. Revisions/tokens — metadata операции, их не требуется сериализовать или включать в snapshots.

## 7. ErrorsSchema: один parser, два способа настройки

Общие normalization/mapping обслуживают декларативные records/tree и пользовательский adapter. Нет backend presets, угадывания путей, неявных JSON.stringify messages или эвристики code-shaped object. Вложенное поле code остаётся полем, пока configured decoder явно не распознает ошибку.

Предлагаемые публичные декларации конфигурации:

```ts
export interface ServerErrorInput extends ValidationErrorInput {
  readonly path: ValidationPath
}

export type ErrorSelector<T> =
  | {readonly at: ValidationPath}
  | {readonly read: (input: T) => unknown}
  | {readonly value: unknown}

export interface StaticErrorMapping {
  readonly kind: 'static'
  readonly from: ValidationPath
  readonly to: ValidationPath | ((error: ServerErrorInput) => ValidationPath | null)
}

export interface DynamicErrorMapping {
  readonly kind: 'dynamic'
  readonly pattern: RegExp
  readonly key: (path: ValidationPath) => string
  readonly to: (match: RegExpMatchArray, error: ServerErrorInput) => ValidationPath | null
  readonly priority?: number
}

export interface ErrorsSchemaLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxErrors: number
  readonly maxPathSegments: number
  readonly maxStringLength: number
}

export interface SchemaCommon {
  readonly mappings?: readonly (StaticErrorMapping | DynamicErrorMapping)[]
  readonly fallback?: (error: ServerErrorInput) => ValidationPath | null
  readonly transform?: readonly ((error: ServerErrorInput) => ServerErrorInput)[]
  readonly limits?: Partial<ErrorsSchemaLimits>
}

export interface RecordsSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'records'
  readonly select?: ErrorSelector<R>
  readonly path: ErrorSelector<unknown>
  readonly code: ErrorSelector<unknown>
  readonly message?: ErrorSelector<unknown>
  readonly params?: ErrorSelector<unknown>
  readonly decodePath?: (value: unknown) => ValidationPath
}

export interface TreeSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'tree'
  readonly select?: ErrorSelector<R>
  readonly leaf: (value: unknown, path: ValidationPath) =>
    readonly ValidationErrorInput[] | undefined
  readonly decodeKey?: (key: string) => ValidationPath
}

export interface AdapterSchemaConfig<R> extends SchemaCommon {
  readonly kind: 'adapter'
  readonly extract: (response: R) => Iterable<ServerErrorInput>
}

export type ErrorsSchemaConfig<R> =
  RecordsSchemaConfig<R> | TreeSchemaConfig<R> | AdapterSchemaConfig<R>

export interface ErrorMappingTrace {
  readonly index: number
  readonly from: ValidationPath
  readonly to: ValidationPath | null
  readonly matchedBy: 'static' | 'dynamic' | 'fallback' | 'identity'
}

export interface ServerErrorEntry {
  readonly path: ValidationPath
  readonly error: ValidationError & {readonly source: 'server'}
}

declare const parsedErrorsBrand: unique symbol
export interface ParsedServerErrors {
  readonly [parsedErrorsBrand]: true
  readonly entries: readonly ServerErrorEntry[]
  readonly trace?: readonly ErrorMappingTrace[]
}

export declare class ErrorsSchema<R = unknown> {
  constructor(config: ErrorsSchemaConfig<R>)
  parse(response: R, options?: {readonly trace?: boolean}): ParsedServerErrors
}
```

ServerErrorEntry отделяет path routing от единственного canonical error без path. Apply переносит этот error в local store без повторной нормализации; flat LocatedValidationError — только проекция чтения. Отдельная копия полей error в batch не хранится. Brand означает normalized data ядра, не пользовательский constructor. Runtime обязан проверить ownership batch, не доверяя structural cast или поверхностному freeze. Apply переиспользует canonical entries, не копирует params при каждой следующей ошибке. ODR-02 по-прежнему блокирует точную нормализацию произвольных параметров.

Selectors используют только пути по own data properties; отсутствие select означает сам response. Records требует выбранный массив и настроенные path/code каждой записи; path — tuple, если decodePath явно не задаёт строковый codec. Отсутствующие path/code и неверные присутствующие message/params вызывают ошибку; отсутствующие optional message/params опускаются. Нет inferred fallback select/code. Пустой выбранный массив означает отсутствие ошибок; отсутствующий envelope — нет.

Tree leaf вызывается до обхода: массив потребляет leaf, включая `[]`; undefined продолжает own object/array traversal. Нераспознанный primitive вызывает parse error. Ключи объектов по умолчанию literal, array indexes — numbers. decodeKey явно включает dotted/custom формат. Пустые object/array containers — корректное пустое дерево. Null и массивы сообщений требуют явного leaf behavior. `{code:...}` автоматически не распознаётся. Adapter принимает только sync Iterable; Promise/AsyncIterable отклоняются. Все режимы используют один pipeline: extraction → поверхностная проверка формы input → ordered transforms (каждый один раз) → mapping → окончательная глубокая normalization один раз. Результаты transforms и mapping снова проверяются на code/path/shape до normalization; Apply её не повторяет.

Static имеет приоритет; затем первое dynamic по убыванию priority и registration order. Null исключает entry без следующих правил. Fallback вызывается один раз, только при отсутствии совпадений; отсутствие fallback означает identity. Target collisions накапливаются, включая одинаковые codes. Duplicate static — config conflict до выбора documented override policy в ODR-04. Dynamic key codec явный; сохранить regex semantics без изменения lastIndex вызывающего кода. Каждый callback вызывается один раз на своём этапе. Optional trace заменяет detailed-parser metadata без её хранения в local errors.

Callbacks parsing не могут мутировать library nodes, в том числе через замыкания. Защитить весь parse compute boundary; Form в parser не передаётся. Исключение callback или неверный output прекращает parsing без batch. Partial parse-and-replace не вводится; tolerant extraction можно явно реализовать в adapter с ответственностью приложения за фильтрацию.

Декларативный пример для **существующего в тестах HF-015 списка с tuple paths**, а не нового стандарта backend response:

```ts
const schema = new ErrorsSchema<unknown>({
  kind: 'records',
  path: {at: ['path']},
  code: {at: ['code']},
  message: {at: ['message']},
  params: {at: ['params']},
})
const parsed = schema.parse([
  {path: ['tags', 1], code: 'taken'},
  {path: ['tags', 1], code: 'taken', message: 'Again'},
])
void parsed
```

Adapter сохраняет существующее тестовое свойство: два ключа отображаются в одно поле:

```ts
const mapped = new ErrorsSchema<Record<string, string>>({
  kind: 'adapter',
  extract: response => Object.entries(response).map(([key, message]) => ({
    path: [key], code: 'server', message,
  })),
  mappings: [
    {kind: 'static', from: ['a'], to: ['email']},
    {kind: 'static', from: ['b'], to: ['email']},
  ],
})
const both = mapped.parse({a: 'first', b: 'second'})
void both
```

Static/dynamic/fallback, whole-leaf transformers, nest/forArray, clone/merge/fromObject и parser subclasses имеют полезных consumers в [schema tests](../../tests/unit/ErrorsShema.test.ts) и [интеграционных тестах Form](../../tests/unit/FormErrorsShema.test.ts). Точные замены/семантика — **ODR-04**. Настраиваемая нормализация внешних форматов — поддерживаемая integration boundary, не legacy bridge. Не реализовывать второй parser при согласовании helpers.

## 8. Apply, revisions и токены операций

Сигнатуры для проверки; post-commit reporting заблокирован ODR-05:

```ts
declare const serverOperationBrand: unique symbol
export interface ServerErrorOperation {
  readonly [serverOperationBrand]: true
}

export interface BeginServerErrorsOptions {
  readonly scope?: ValidationPath
}

export interface ApplyServerErrorsOptions {
  readonly operation: ServerErrorOperation
  readonly mode?: 'replace' | 'append'
  readonly unknownPath?: 'error' | 'global' | 'ignore'
}

export interface ApplyServerErrorsResult {
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
}

export interface FormServerErrorApi {
  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation
  applyServerErrors(
    batch: ParsedServerErrors,
    options: ApplyServerErrorsOptions,
  ): ApplyServerErrorsResult
}
```

Defaults: scope `[]` — всё subtree Form-получателя, mode replace, unknownPath error. Scope разрешается в registered node/subtree при начале операции. Parsed paths относительны receiver Form, а не scope. Второй конфликтующий scope в Apply отсутствует. Для отдельного Field захватить его subtree scope; source-taking legacy setter не нужен. Global `[]` — настоящий target Form, не missing field.

Предлагаемый lifecycle операции:

1. Begin после subclass initialization и **до отправки запроса приложения**. Захватить receiver/scope identity, monotonic subtree input revision, structural revision и reset generation. Begin не валидирует, не меняет touched/dirty и не публикует snapshot.
2. Новая операция отменяет применимость всех старых outstanding operations пересекающихся scopes (ancestor/descendant). Disjoint scopes независимы. Так latest-operation-wins работает и при равных значениях; одного revision недостаточно.
3. Каждое поддерживаемое фактическое изменение повышает affected subtree revisions, включая validate false и A→B→A. Structural revision учитывает identities/order, не только равенство payload; move/remove/insert/replacement инвалидируют captures. Reset всегда инвалидирует affected tokens. Validation/errors metadata и commitBaseline — нет.
4. Apply до записи/consumption отклоняет wrong-receiver, superseded, used, detached и revision-mismatched tokens. Append тоже требует token. Успешный apply потребляет его один раз, включая empty batch. Неудачный parse/preflight не потребляет иначе действующий token. Force/stale bypass не предусмотрен.
5. Сначала проверить batch ownership и operation, разрешить **все** targets, scope и unknown policies, вычислить итоговые source partitions и подготовить immutable results. Снова проверить revisions непосредственно перед commit без callbacks. Затем одна запись на affected node; не повторять schema callbacks, cast, validators или normalization.
6. Replace удаляет только server errors scope, включая пропущенные nodes и globals. Empty replace очищает этот server scope. Append добавляет в порядке входа. Type/custom/manual и client-check knowledge сохраняются.
7. Unknown по умолчанию — ошибка. Global явно превращает ошибку в own global ближайшей разрешённой Form **внутри scope**, исходный путь остаётся в Apply report. В scalar scope без Form такая конверсия невозможна и вызывает ошибку. Ignore явно исключает и отражает в report. Out-of-scope всегда ошибка, unknown policy её не обходит. Globals не перепривязываются к будущим полям.
8. При parse/preflight error нет target writes. Observer/capture/finalization failures после commit требуют ODR-05; нельзя утверждать, что существующий scheduler уже обеспечивает более сильную безусловную гарантию.

Пример без HTTP, которым управляет приложение:

```ts
const operation = form.beginServerErrorOperation()
// Dispatch and await the application's request outside a synchronous batch.
const batch = schema.parse(response)
form.applyServerErrors(batch, {operation})
```

Библиотека не выполняет HTTP/cancellation/submit orchestration. Приложение связывает response с token, настраивает API paths/cross-field semantics и concurrency. Предложенное правило overlapping scopes, в отличие от revision-only предложения V3-01, закрывает старый ответ при неизменных values. Консервативное отклонение при любом изменении scope не переносит старые positional errors на другие items. Нельзя обещать revision tracking произвольных in-place/opaque mutations; использовать supported setters. Tokens локальны процессу, не persistence/transport IDs.

## 9. Инварианты безопасности и производительности

Resolver идёт по зарегистрированным children и own properties, не по произвольному object[segment]. __proto__, constructor, prototype и toString — literal data names. Использовать Map/null-prototype dictionaries или безопасное создание own properties; не применять recursive Object.assign к обычным объектам. Numeric segments — finite safe nonnegative integers, адресуют существующие items; auto-creation нет. Numeric-looking object keys не приводить без выбранного codec.

Ограничить traversal/normalization; обнаруживать циклы JSON-shaped responses, отклонять accessors/non-data objects в стандартных declarative readers. Не вызывать неизвестный toJSON и не преобразовывать произвольное значение в message. Лимиты для проверки: depth 64, nodes 100000, errors 10000, path segments 64, string length 65536; parameter budget определить с ODR-02. Детерминированная диагностика без partial application. Adapter — доверенный код приложения, не sandbox; ядро ограничивает свой обход/output, но не произвольный CPU/IO пользователя.

Сохранить PERF-01 reconciliation/refresh epochs/frozen subtree reuse и существующие callback counts до решения ODR-03. Группировать server errors до записи; не повторять normalization через setErrors([...previous,next]). Один target index на Apply. Shared empty arrays вместо четырёх eager arrays; не хранить full aggregate paths во всех nodes. Revisions распространять по changed ancestors; scope capture/preflight может обходить scope, это нужно измерять. Не обещать O(1) snapshots/writes: external-edit discovery и topology scans HF-013 сохраняются.

Доказательства: [PERF-01](../roadmap/v2.3.0/PERFORMANCE.ru.md), [измерения HF-015](../roadmap/v2.3.0/ERRORS_REVIEW.ru.md), [performance regressions](../../tests/unit/headless-performance.test.ts). Исторический full harness fixed HF-015: +20.6% создание, +7.4% unchanged snapshot, +23.9% scalar add/remove, +14.6% nested add/remove, около 0.3 MiB дополнительного post-GC heap; paired readings менялись. Это исторические данные, не свежий benchmark и не универсальные thresholds.

## 10. OWNER_DECISION_REQUIRED

Затронутое проектирование остановлено на указанных границах. Никакой вариант не считается утверждённым. Независимая разрешённая документация завершена; implementation заблокирована.

| ID | Доказательство и противоречие | Варианты и миграционные последствия | Рекомендация / остановленная граница |
| --- | --- | --- | --- |
| ODR-01 | Field.ts:219–228 использует getTypeName в invalid_type.expected; built-ins возвращают русские labels (StringType:47, NumberType:66, DateType:61). I18N-01 запрещает скрытый localized fallback. Метод также public introspection. | A: machine type ID с миграцией introspection; B: сохранить имя метода, переопределив результат как machine ID — тоже semantic break; C: убрать expected/introspection, потеряв полезные данные. | A; утвердить member/signature и точные IDs, включая date/datetime/custom types. Заблокированы metadata FieldType и cast invalid_type params. Русские labels не сохраняются. |
| ODR-02 | ValidationError.ts:49–55 и snapshot.ts:40–72 допускают циклы и snapshot descriptors Date/Map/Set/opaque params. V3-01 предлагал JSON-only; текущее утверждение говорит structured data, не JSON-only. | A: readonly JSON, неподдерживаемые values/cycles отклонять, приложение преобразует; B: сохранить descriptors/cycles; C: custom normalization с дополнительным API/стоимостью. | Рекомендован A, но не выбран. Заблокированы domain params, deep-readonly types, budget и normalization. Примитивные built-in params не затронуты. |
| ODR-03 | form-lifecycle-baseline.test.ts:92–105 ожидает два вызова для нового item; :176–185 — constructor validation при deferred hydration. Size failure коллекции пропускает children. Это реальные контракты, не доказанные obsolete bridges. | A: сохранить timing/gates; B: подавить промежуточные engine-controlled checks и всегда обходить детей при full validation. B меняет counts/context/deferred semantics. | B для одной финальной проверки только после явного утверждения. Остановлен redesign hydration/container traversal; scalar errors и all-source result не затронуты. |
| ODR-04 | ErrorsShema.ts: whole-leaf transformers, regex mapping, nest/forArray, clone/merge, parseErrors overrides; HF-015 хранит строки и структуры; snapshots дублируют errors. Есть реальные integrations/tests. | Утвердить построчные remove/replace/keep из миграционного реестра, особенно helper composition, DefaultErrorsSchema, metadata readers и optionality snapshot producers. Общего ярлыка legacy недостаточно. | Один parser/configurable adapters с полноценными заменами. Остановлены точные helper/export removals. Скрытых old-parser bridges и aliases нет. |
| ODR-05 | ObservableNode.ts:37–51,142–151,254–284 фиксирует snapshots и затем пробрасывает ошибки subscribers; batch finalization/custom capture тоже могут бросать. Безусловное «при ошибке Apply состояние не меняется» конфликтует с post-commit exceptions. | A: атомарны parse/preflight/staged commit, notification failures сообщаются отдельно после commit; B: глобально изменить observer error delivery; C: rollback после notifications не отменяет уже увиденное, гарантией не является. | A с явно утверждённым result/error channel и batch semantics. Итоговый Apply success/failure contract заблокирован. Нельзя молча подавлять exceptions или обещать универсальный rollback. |

Реестр ODR-04, варианты, миграция/проверки и implementation gates — в [плане](../roadmap/v3.0.0/PLAN.ru.md). Каталог явно помечает одну нерешённую family вместо выдуманного localized/machine-ID fallback. API не считается полностью утверждённым до закрытия решений.
