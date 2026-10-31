# AdaptForm 3.0 — архитектурная спецификация V3-02

[English](V3_ARCHITECTURE.md) · [Русский](V3_ARCHITECTURE.ru.md)

Статус V3-02: **ACCEPTED** владельцем на `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 окончательны для текущего этапа. Статус интеграции документации: **READY_FOR_OWNER_REVIEW**. Это будущий API, не текущая реализация. Начало V3-03 требует отдельного разрешения; merge и выпуск не разрешены.

## 1. База и происхождение документа

Исходная проверка V3-02: 2026-10-28, `work`/`670c6a04014fbf938574bfd8eb2a706e44a9d4d0`, совпадавший с remote master; index/tree были чистыми. Финализация ODR: ветка `docs/v3-02-specification`, исходный HEAD `96a82c8f015ff34115e192b0c3947d50052b2ebf`, чистые index/tree, существующий [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). Версия остаётся 2.2.0. Исторические документы 2.3.0 описывают исходники, не опубликованную 2.3.0.

2026-10-31 при разрешённой владельцем интеграции документации проверены все шесть изменённых файлов [PR #29](https://github.com/ArhiMEN/AdaptForm/pull/29), `docs/v3-architecture-legacy-policy`, на `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`: относительно master `670c6a04014fbf938574bfd8eb2a706e44a9d4d0` и принятого HEAD PR #30 `b041806ee35c56f55c0a0925e7d0de8b533f09bd`. Недостающие правила AGENTS/DECISIONS интегрированы; предварительные предложения архитектуры уступают принятому V3-02. [Матрица переноса](V3_DOCUMENTATION_INTEGRATION.ru.md) учитывает каждое положение, заменённое предложение и исторический риск. PR #29 остаётся открытым Draft без merge, его ветка не изменена. Выполнена выборочная интеграция документации, не Git merge.

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

### Правила разработки, сохранённые из PR #29

Ядро остаётся TypeScript-first, headless и независимым от фреймворков. Отложенные async validation, submit lifecycle, UI-адаптеры и несвязанные изменения reset остаются вне объёма. Настраиваемая нормализация серверных ответов — поддерживаемая граница интеграции, не legacy-совместимость.

Прежде чем добавлять fallback, мост совместимости, дублирующее состояние/представление, устаревший alias или обходное решение, определить старый контракт и необходимость его сохранения; сразу сообщить владельцу затронутый API, подтверждения, альтернативы, издержки, влияние на миграцию и рекомендацию. Остановить затронутое проектирование/реализацию до явного решения: удалить, заменить, сохранить с обоснованием или отложить. То же правило действует для архитектурных отклонений. Независимую согласованную работу можно продолжать, только если это безопасно. Major-релиз не разрешает посторонние breaking changes или потерю полезного поведения без полноценной замены и описания миграции.

Принятые ODR-01–05 и реестр из 30 строк уже содержат эти решения для V3-02; повторная приёмка и bridges/aliases не вводятся. [AGENTS](../../AGENTS.ru.md) задаёт обязательные правила разработки; этот раздел фиксирует их применение к V3-02. Новые содержательные конфликты, не разрешимые принятыми решениями, требуют решения владельца до продолжения затронутой работы.

## 3. Сигнатуры ошибок и валидации

Объявления фиксируют будущие контракты по утверждённым ODR-01/02. Это декларации внутри Markdown, **не текущие exports пакета**. Корень params остаётся объектом именованных параметров; его значения принадлежат рекурсивному JSON-domain.

```ts
export type ValidationErrorSource = 'type' | 'custom' | 'server' | 'manual'
export type ValidationPath = readonly (string | number)[]

export type JsonValue = string | number | boolean | null
  | readonly JsonValue[] | JsonObject
export interface JsonObject { readonly [key: string]: JsonValue }
export type ErrorParams = JsonObject

export declare class ErrorContractError extends TypeError {
  readonly reason: string
  readonly path: ValidationPath
}

export interface ValidationErrorInput {
  readonly code: string
  readonly params?: ErrorParams
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
  readonly typeId: string
  options: O
  cast(rawValue: unknown): T | null
  validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export declare abstract class FieldType<T, O extends object>
  implements FieldTypeContract<T, O> {
  abstract readonly typeId: string
  options: O
  constructor(options: O)
  abstract cast(rawValue: unknown): T | null
  abstract validateErrors(value: T, form?: Form): readonly ValidationErrorInput[]
}

export type FieldTypeConstructor<T, O extends object> =
  new (options: O) => FieldTypeContract<T, O>
```

`FieldTypeContract` требует явный непустой `typeId`; имя конструктора не используется. `getTypeName()` удалён без alias. Базовый класс остаётся необязательным; нет instanceof/branding/validate bridge/override detection. Defaults, options и casts одинаково поддерживаются структурными и наследуемыми типами. Встроенные IDs и миграция custom types приведены в каталоге.

Существующий контекст `(value, form?)` сохраняется; оболочка context из V3-01 не была утверждена. ArrayField callback получает clean values, ArrayFormField callback — экземпляры Form. Runtime-защита действует, хотя TypeScript не исключает mutator methods из этих объектов. Типизировать validators существующих options без ослабления FormFieldsValue inference. Не расширять HF-013 на вложенные пути и коллекции.

Итоговая узловая поверхность по ODR-04:

```ts
export interface ErrorNodeApi {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  getOwnErrors(): readonly ValidationError[]
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

setErrors() заменяет только собственные manual errors; setErrors([]) не отменяет завершённую клиентскую проверку. clearErrors() по умолчанию очищает все собственные источники, recursive:false; явная очистка type/custom сбрасывает знание о клиентской проверке. Собственные ошибки Form — globals. getOwnErrors() сохраняется на всех узлах, включая Form (own globals); errors — тот же readonly own-view. Это явные структурированные API, без строковых aliases.

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

Сохранить scalar порядок: empty/required → failed cast → type rules → custom rule. Пустое необязательное значение пропускает последующие правила. Type failure пропускает custom. Сохраняются действующие проверки, порядок, повторы и представления clean values, удаляется генерация сообщений. Каталог фиксирует реальные gates. ODR-03 B заменяет constructor checks и пропуск детей при container failure по разделу 5.

Compute boundary всегда защищает required/type/custom callbacks, независимо от графа. Public setters/mutators, reset, baseline, options replacement, error writes, structural methods, graph activation/disposal и рекурсивная validation из callback отклоняются до записи. Collection callbacks проходят тот же guard. Ядро записывает результат после выхода из пользовательского callback; флаги восстанавливаются через finally. Plugin initialization — отдельная фаза, её нельзя случайно запретить как validator.

Клиентские результаты вычисляются временно. При исключении, неверном результате или Promise пробросить ошибку, не создавать ValidationError и не отмечать попытку успешной. Сохранить server/manual и завершить уже выполненные внешние записи с существующим приоритетом исключений batch. Явно оставить проверку неизвестной; старое true не доказывает успех неудачной новой проверки. Ошибка root не означает, что непосещённые узлы проверены.

HF-013 сохраняет явную activation/disposal, direct ordinary Field endpoints, whole-pipeline dependencies, топологические chains/diamonds и dedup автоматического pass. Распространяются изменившиеся **clean** values; target заменяет только type/custom и сохраняет server/manual. Источника dependency нет. Explicit checks немедленные, включая batch. Чтение snapshot вызывает ноль validators. Сохранить ошибки конфигурации cycles/missing source/ownership и восстановление; это не пользовательские ошибки.

Произвольные in-place mutations values/options/arrays и opaque custom objects запрещены в callbacks, но не могут универсально перехватываться без Proxy. Гарантируется отклонение поддерживаемых mutation APIs; readonly — не sandbox. Сохранить обнаружение внешних изменений значений/контейнеров последующим чтением из PERF-01; это не гарантия revision tracking неподдерживаемых записей.

## 5. Жизненный цикл и identity

Итоговый lifecycle-контракт: фактическое изменение — структурное неравенство post-plugin raw input **или** clean value по существующей политике поддерживаемых значений. Так различаются неверные raw inputs, оба приведённые к null. Равное присваивание может ставить touched как раньше, но не очищает server/manual. Фактическое изменение инвалидирует type/custom, очищает own server/manual, повышает revision и затем при необходимости запрашивает проверку. validate:false не создаёт автоматический запрос; старое клиентское true не сохраняется. Остальные defaults/plugins/cast, dirty и payload policies сохраняются.

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

Хранилище логически разделяет источники, но у каждой ошибки один канонический owner. Client-check marker — необходимое состояние, а не ещё один boolean, противоречащий активным errors. Изменяемой строковой оболочки нет. Независимый от UI порядок: type → custom → server → manual, insertion order внутри источника. Form обходит поля, затем own globals; коллекция — own errors с path [], затем детей в текущем порядке. Дедупликации по code/message нет.

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

### ODR-03 B: граница сборки и число проверок

Создание инициализирует plugins/options, raw/clean values, reset targets, состав/владение и baselines; выполняется **ноль required/type/custom validation callbacks**, включая непустые defaults. Cast/plugin initialization не является validation. Standalone new Field, collection или concrete Form возвращается unchecked (Field null, aggregate false). Неявной финальной constructor validation и нового finalize/initialization alias нет.

Граница завершения — возврат из наиболее производного new, а при engine-controlled создании/hydration — завершение всех factories/subclass initializers, присваиваний, attachment и baseline capture операции. Engine assembly scopes подавляют управляемые движком проверки во вложенных конструкторах с очисткой через finally. Base Form constructor не валидирует subclass properties. Явная application validation внутри subclass constructor/factory assembly нарушает контракт; известный активный assembly scope её отклоняет. Ядро не может обнаружить все произвольные границы пользовательских конструкторов; приложение вызывает validate после возврата new.

setFields(data, false), setItemsValue(data, false), setForms(data, false) выполняют ноль validation callbacks, включая factory defaults. При включённой validation сначала присвоить/hydrate всю структуру, затем запросить один финальный полный проход receiver (либо существующую ограниченную выборку HF-013). Новые descendants не получают предварительных проверок. Scalar assignment запрашивает свой pipeline один раз; дополнительного initialization pass нет. Чтения, serialization, begin operation, error writes, reset и baseline capture выполняют ноль validation callbacks.

Явный full validate посещает каждый зарегистрированный узел ровно один раз в определённом порядке полей/items. Form передаёт себя прямым детям; вложенная Form становится контекстом своих детей; standalone collection передаёт заданную Form либо undefined. Сначала own required/min/max контейнера, затем **все** дети даже при ошибке контейнера или предыдущего ребёнка, затем один own custom callback, если собственные structural checks успешны. Ошибки детей его не блокируют. Неверный результат либо contract/programming exception прерывает проход; полный обход гарантируется для обычных ValidationError results, не исключений. Aggregate validity учитывает own/descendant errors и unchecked markers.

Own container gates сохраняют первую ошибку required → min → max и пропуск own custom при ней; descendants больше не пропускаются. В scalar pipeline required callback выполняется один раз при его наличии; validateErrors типа — один раз только для непустого успешного cast; custom — один раз после успеха типа. Empty optional, required failure и failed cast не вызывают type/custom. Повторные explicit validate намеренно повторяют применимые callbacks; automatic dedup не отменяет explicit calls.

| Операция после сборки | Own collection check | Новые/сохранённые descendants |
| --- | --- | --- |
| Constructor / deferred hydration / reset | 0 | 0; reset очищает все sources и оставляет unchecked |
| add/insert с validation | 1 | Новый item/subtree: 1 применимый pipeline на node; retained items 0 |
| add/insert без validation | 0 | 0, включая defaults |
| remove/move/clear | 1 | Retained descendants 0; no-op indexes дают 0 везде |
| Bulk replacement/hydration с validation | 1 на посещённый container | 1 применимый pipeline на descendant после всех assignments |
| Explicit full validate, включая nested batch | 1 на посещённый container | 1 применимый pipeline на descendant независимо от container failure |

Автоматические structural requests локальны: вложенные предки могут проверить свои collection rules один раз без рекурсивной проверки неизменённых соседей. В batch объединить выбранные subtrees/own-only requests и устранить пересечения на внешней границе; локальный add/remove не превращается в безусловный root pass. При изменении структуры/значения collection её own client-check marker инвалидируется; markers неизменённых детей сохраняются при move/remove. HF-013 сохраняет ограниченный выбор scalar targets и clean-value net-change policy. В V3-03.5 обновить исторические expectations: два вызова → один при replacement нового item; constructor default при deferred hydration → ноль; children за size failure → один применимый проход. Текущие characterization tests в V3-02 не меняются.

## 6. Snapshots и readonly errors

Замена по ODR-04: обязательное `NodeSnapshot.errors: readonly ValidationError[]`, только own errors. Descendants остаются в child snapshots; aggregate paths не кэшируются во всех предках. Убрать строковые errors/allErrors/globalErrors и дублирующее optional validationErrors. Сохранить value snapshots, dirty/touched, child snapshots и identities HF-011. Engine snapshots коллекций требуют readonly itemIds: readonly string[], один ID на child. Сторонние producers/fixtures должны поставлять стабильные IDs; нельзя генерировать их при чтении либо использовать индексы/равенство значений как identity.

Errors, params, paths и списки отделены от входа и глубоко immutable в выбранной области ODR-02. Изменения code/source/params уведомляют даже при том же message. Равное итоговое состояние сохраняет committed snapshot reference и не уведомляет. Aggregate getErrors может аллоцировать и не обязан сохранять reference identity. Не замораживать input вызывающего кода на месте. Не хранить response, values или parent references внутри ошибок. Revisions/tokens — metadata операции, их не требуется сериализовать или включать в snapshots.

```ts
// Value-snapshot domain is retained; it is distinct from error params.
export type SnapshotValue = null | undefined | string | number | boolean | bigint
  | readonly SnapshotValue[] | {readonly [key: string]: SnapshotValue}
export interface NodeSnapshot {
  readonly errors: readonly ValidationError[]
  readonly isValid: boolean | null
  readonly isTouched: boolean
  readonly isDirty: boolean
}
export interface FieldSnapshot extends NodeSnapshot {
  readonly rawValue: SnapshotValue
  readonly valueClear: SnapshotValue
}
export interface FormSnapshot extends NodeSnapshot {
  readonly fieldsValue: Readonly<Record<string, SnapshotValue>>
  readonly fields: Readonly<Record<string, FieldSnapshot | ArrayFieldSnapshot | ArrayFormSnapshot>>
}
export interface ArrayFieldSnapshot extends NodeSnapshot {
  readonly itemIds: readonly string[]
  readonly itemsValue: readonly SnapshotValue[]
  readonly items: readonly FieldSnapshot[]
}
export interface ArrayFormSnapshot extends NodeSnapshot {
  readonly itemIds: readonly string[]
  readonly formsFieldsValue: readonly Readonly<Record<string, SnapshotValue>>[]
  readonly forms: readonly FormSnapshot[]
}
```

### ODR-02: точный domain параметров и нормализация

TypeScript number не выражает конечность и ограничения prototypes/descriptors/cycles; runtime-проверка обязательна. ErrorParams — обычный объект именованных JsonValue, не произвольный root primitive. Допустимы ровно Object.prototype либо null; arrays требуют Array.prototype, плотные own data indexes и отсутствие дополнительных свойств. Отклонять custom prototypes/classes, accessors без вызова getters, symbol keys, non-enumerable object properties, sparse arrays, undefined в любой присутствующей позиции, NaN/±Infinity, BigInt, Symbol, функции, Date/Map/Set и циклы. Повторные ациклические ссылки допустимы, но независимо копируются и учитываются при каждом появлении. Никаких неявных stringify/toJSON, descriptor conversion или coercion неподдерживаемых значений. Own string keys __proto__, constructor, prototype и toJSON разрешены как **данные**, безопасно сохраняются в null-prototype output records; function-valued toJSON отклоняется без вызова. Proxy traps не являются sandbox; proxies — неподдерживаемый input.

Глубокая нормализация выполняется на каждой compute-границе входа ошибок до замены любого error store. Проверить descriptors/prototypes/limits, скопировать только допустимые данные, рекурсивно заморозить новые records/arrays без общих mutable references с input. Нельзя мутировать или замораживать объекты вызывающего кода. Отсутствие params допустимо; присутствующее params:undefined ошибочно и в JS. Пустое params:{} сохраняется. -0 нормализуется в 0; остальные конечные числа сохраняются. Ошибка контракта бросает ErrorContractError со стабильным reason и offending path (например nonfinite_number по ['params', 'limit']), а не ValidationError code; параметры не теряются молча. Reasons различают invalid_params_type, nonfinite_number, cyclic_params, unsafe_descriptor, limit_exceeded; developer diagnostics отделены от validation display.

Жёсткие пределы каждого params root: depth 32 (root=0), 10000 посещённых value nodes с containers/root, 1048576 logical bytes и 65536 UTF-16 units на string/key. Детерминированная метрика: UTF-8 bytes каждого string value/property key, 8 на number, 1 на boolean/null, 2 на object/array; stringify не выполняется. Повторные появления учитываются отдельно. Превышение, cycles/descriptors диагностируются без частичной установки. Parser дополнительно ограничивает весь input/output по разделу 9. Лимиты params одинаковы для всех sources; schema configuration не может их повышать.

Миграция: приложение явно переводит даты в epoch numbers/ISO strings, Map — в массив entries, Set — в массив, class instances — в выбранные plain DTO. Undefined keys удаляются явно; nonfinite numbers/cycles требуют осмысленного domain representation вместо автоматического пропуска. Старые snapshot descriptors допустимы как обычные данные только при намеренном создании JSON DTO приложением; ядро их больше не производит.

```ts
const boundary = new Date('2026-01-01T00:00:00Z')
const attributes = new Map<string, string>([['region', 'EU']])
const migrated: ValidationErrorInput = {
  code: 'app.policy',
  params: {boundaryMs: boundary.getTime(), attributes: [...attributes]},
}
void migrated
```

## 7. ErrorsSchema: один parser, два способа настройки

Общие normalization/mapping обслуживают декларативные records/tree и пользовательский adapter. Нет backend presets, угадывания путей, неявных JSON.stringify messages или эвристики code-shaped object. Вложенное поле code остаётся полем, пока configured decoder явно не распознает ошибку.

Итоговые публичные декларации конфигурации:

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

export type ErrorTransform = (
  error: ValidationErrorInput, path: ValidationPath,
) => ValidationErrorInput

export interface ErrorsMappingConfig {
  readonly mappings?: readonly (StaticErrorMapping | DynamicErrorMapping)[]
  readonly fallback?: (error: ServerErrorInput) => ValidationPath | null
  readonly transform?: readonly ErrorTransform[]
}

export interface MappingMergeOptions {
  readonly staticConflict?: 'error' | 'left' | 'right'
  readonly fallbackConflict?: 'error' | 'left' | 'right'
}

export interface MappingPrefixOptions {
  readonly sourcePrefix: ValidationPath
  readonly targetPrefix?: ValidationPath
}

export interface ArrayMappingOptions extends MappingPrefixOptions {
  readonly index?: (segment: string | number) => number
}

export declare class ErrorsMapping {
  constructor(config: ErrorsMappingConfig)
  static fromObject(mapping: Readonly<Record<string, ValidationPath>>): ErrorsMapping
  static forArray(item: ErrorsMapping, options: ArrayMappingOptions): ErrorsMapping
  nest(options: MappingPrefixOptions): ErrorsMapping
  clone(): ErrorsMapping
  merge(other: ErrorsMapping, options?: MappingMergeOptions): ErrorsMapping
}

export interface ErrorsSchemaLimits {
  readonly maxDepth: number
  readonly maxNodes: number
  readonly maxErrors: number
  readonly maxPathSegments: number
  readonly maxStringLength: number
  readonly maxBytes: number
}

export interface SchemaCommon {
  readonly mapping?: ErrorsMapping
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
  readonly matchedBy: 'static' | 'dynamic' | 'fallback' | 'identity' | 'scope'
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

ServerErrorEntry отделяет path routing от единственного canonical error без path. Apply переносит этот error в local store без повторной нормализации; flat LocatedValidationError — только проекция чтения. Отдельная копия полей error в batch не хранится. Brand означает normalized data ядра, не пользовательский constructor. Runtime обязан проверить ownership batch, не доверяя structural cast или поверхностному freeze. Apply переиспользует canonical entries, не копирует params при каждой следующей ошибке. Нормализация и лимиты ODR-02 действуют для любых params.

Selectors используют только пути по own data properties; отсутствие select означает сам response. Records требует выбранный массив и настроенные path/code каждой записи; path — tuple, если decodePath явно не задаёт строковый codec. Отсутствующие path/code и неверные присутствующие message/params вызывают ошибку; отсутствующие optional message/params опускаются. Нет inferred fallback select/code. Пустой выбранный массив означает отсутствие ошибок; отсутствующий envelope — нет.

Tree leaf вызывается до обхода: массив потребляет leaf, включая `[]`; undefined продолжает own object/array traversal. Нераспознанный primitive вызывает parse error. Ключи объектов по умолчанию literal, array indexes — numbers. decodeKey явно включает dotted/custom формат. Пустые object/array containers — корректное пустое дерево. Null и массивы сообщений требуют явного leaf behavior. `{code:...}` автоматически не распознаётся. Adapter принимает только sync Iterable; Promise/AsyncIterable отклоняются. Все режимы используют один pipeline: extraction → deep validation/detachment каждого input DTO → transforms mapping-программы (каждый один раз) → mapping → final batch branding. Callbacks получают detached readonly DTO views. Каждый новый DTO нормализуется до следующего callback; неизменённые engine-owned immutable params переиспользуются, accumulated error list не нормализуется заново. Mapping paths проверяются отдельно. Apply ничего из этого не повторяет. Declarative traversal проверяет data descriptors до чтения; доверенный leaf/adapter явно преобразует целый leaf до возврата error DTO.

Static имеет приоритет; затем первое dynamic по убыванию priority и registration order. Null исключает entry без следующих правил. Fallback вызывается один раз, только при отсутствии совпадений; отсутствие fallback означает identity. Target collisions накапливаются, включая одинаковые codes. Duplicate static — config error; выбрать одно правило можно только явной merge conflict policy. Dynamic key codec явный; exec-style captures/flags зафиксированы ниже без изменения lastIndex вызывающего кода. Каждый callback вызывается один раз на своём этапе. Optional trace заменяет detailed-parser metadata без её хранения в local errors.

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
  mapping: new ErrorsMapping({mappings: [
    {kind: 'static', from: ['a'], to: ['email']},
    {kind: 'static', from: ['b'], to: ['email']},
  ]}),
})
const both = mapped.parse({a: 'first', b: 'second'})
void both
```

Полные замены static/dynamic/fallback, whole-leaf transforms и composition описаны ниже. [Schema tests](../../tests/unit/ErrorsShema.test.ts) и [Form integrations](../../tests/unit/FormErrorsShema.test.ts) — миграционные сценарии, не доказательство реализации нового API.

### ODR-04: неизменяемая композиция mappings

ErrorsMapping — конфигурационная программа, **не parser**: у неё нет parse и альтернативного server ingestion. Она явно передаётся как ErrorsSchemaConfig.mapping. Extraction configuration/limits принадлежат одному ErrorsSchema и не объединяются неявно. Общего DefaultErrorsSchema, неявного backend format и aliases старых методов нет. Constructor требует явную config даже для identity mapping.

Программа содержит ordered transforms, static/dynamic rules и явные fallback scopes. Отсутствие mapping означает identity. Базовая программа покрывает все пути; nest/forArray сужают coverage. Вне объединения scopes программы entry отбрасывается (trace matchedBy:scope, to:null). Внутри coverage без rule/fallback identity — **локальный** путь с target prefix. Совпавший null отбрасывает entry без следующих правил. Source prefixes сравниваются как типизированные tuples, без dotted text/prototype traversal.

- nest({sourcePrefix,targetPrefix:[]}) удаляет sourcePrefix из extracted path перед local transforms/dynamic key codecs/rules/fallback. Response decodePath/decodeKey уже выполнены при extraction. Каждый non-null local result, включая identity, получает targetPrefix ровно один раз. Response envelope не выбирается; для этого select. Вложенные wrappers соединяют outer source/target prefixes перед inner. При prefix mismatch local callbacks не вызываются.
- forArray(item,{sourcePrefix,targetPrefix:sourcePrefix,index}) сопоставляет sourcePrefix + один index segment + source path item. Default index принимает только numeric safe nonnegative integer; явный index декодирует один string/number segment и возвращает такое число либо бросает ошибку. Dotted/bracket/custom flat keys явно декодируются decodePath/decodeKey до этой стадии, без угадывания. Перед item callbacks убрать source prefix/index; target получает targetPrefix + decoded index. Сохраняются item globals, nested wrappers, regex/fallback. Invalid index — contract failure, не тихий пропуск.
- fromObject отображает каждый own enumerable string key как один literal source segment в явный tuple target. Пустой target [] означает global. Accessors/symbol keys/invalid targets отклоняются; чтение безопасное по own properties. Dotted key остаётся literal; multi-segment sources требуют rules/codecs.
- clone возвращает отдельную immutable программу с тем же поведением. Constructor/clone/helpers копируют arrays/tuples/records и regex source/flags; callbacks разделяются по ссылке вместе с принадлежащими приложению closures. RegExp.lastIndex вызывающего кода не читается и не меняется; правило использует свежую regex с index 0, всеми flags и exec-style captures, включая g. Общей mutable config и попыток клонировать closures нет.
- merge объединяет config с left registrations перед right. Применимые transforms выполняются left→right по одному разу в local scope перед выбором rule; повтор function reference означает отдельную регистрацию. ErrorTransform меняет только code/params/message, не routing path. Каждый scope видит свой stripped path; следующие transforms/mapping callbacks получают обновлённые metadata. Пересекающиеся static source patterns после scope expansion, включая numeric-index wildcards и literal indexes, конфликтуют: default error, явный left/right выбирает правило на пересечении, сохраняя другое вне его. В одном constructor duplicate static всегда ошибка. Остальные static имеют приоритет над dynamic; все dynamic registrations сохраняются, сортируются по убыванию priority (default 0, finite number), затем left/right order. Выбранное правило использует свой target prefix. Совпадение targets накапливает ошибки, не является config conflict.
- Пересекающиеся explicit fallback scopes конфликтуют: default error, явный left/right сохраняет выбранный fallback на пересечении и другой вне него. Transforms/rules этим не меняются. Disjoint fallbacks сохраняются. Без explicit fallback действует identity покрытого scope; пересекающиеся identity scopes с разными target prefixes также дают fallback conflict с той же policy. Равнозначные identities объединяются. Один explicit fallback имеет приоритет над implicit identity своего scope. Wrapper scopes состоят из literal segments и captured index wildcards (string либо number; index decoder проверяет их при parse). Пересечения scopes консервативно синтаксические, определяются без custom index/regex callbacks. Если потенциально пересекающиеся identity routes имеют разные custom index decoder references, это fallback conflict, даже если они могли бы вычислить равные индексы. Regex overlap допустим по priority/order. Конфликты диагностируются при construction/composition без extraction.

Полные преобразования внешних данных выполняются до extraction: tree leaf преобразует **целое** value/array перед возвратом decoded error list либо adapter extract преобразует envelope/leaves приложения. Undefined от leaf запрашивает descent; array result потребляет leaf. Исторический transformValue(array) нельзя переносить на ErrorTransform отдельных decoded errors. Mapping callbacks могут использовать transformed metadata; нужные внешние данные передаются явно в JSON params, без скрытых response references. Нет auto-stringification или inferred server code. Для исторического skip-unmapped явно задать fallback, возвращающий null (fromObject program объединить с new ErrorsMapping({fallback: () => null})).

```ts
const itemMapping = ErrorsMapping.fromObject({email_error: ['email']})
const arrayMapping = ErrorsMapping.forArray(itemMapping, {
  sourcePrefix: ['accounts'], targetPrefix: ['accounts'],
})
const composed = arrayMapping.clone().merge(
  ErrorsMapping.fromObject({summary: []}),
)
const arraySchema = new ErrorsSchema<unknown>({
  kind: 'records', path: {at: ['path']}, code: {at: ['code']}, mapping: composed,
})
const traced = arraySchema.parse([
  {path: ['accounts', 0, 'email_error'], code: 'app.taken'},
], {trace: true})
void traced
```

```ts
const wholeLeafSchema = new ErrorsSchema<unknown>({
  kind: 'tree',
  leaf: value => {
    if (value === null) return []
    if (Array.isArray(value) && value.every(part => typeof part === 'string')) {
      // Explicit whole-leaf transforms: join, then uppercase, then decode.
      const message = value.join('; ').toUpperCase()
      return [{code: 'app.server', message}]
    }
    if (typeof value === 'string') return [{code: 'app.server', message: value}]
    return undefined
  },
})
void wholeLeafSchema
```

Trace содержит одну строку на extracted error, включая dropped: исходный полный from, итоговый полный to либо null, стабильный index и вид выбранного правила. Нет dictionary collapse: несколько source keys к одному полю сохраняют отдельные diagnostics и ordered entries. clone/merge/nest/forArray не нормализуют ошибки и не вызывают extract/leaf/transforms; это делает только единый parse.

## 8. Apply, revisions и токены операций

Итоговые сигнатуры ODR-05 A:

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

export interface NotificationFailure {
  readonly phase: 'subscriber' | 'diagnostic' | 'finalization'
  readonly path: ValidationPath
  readonly subscriber?: number
  readonly error: unknown
}

export interface ErrorNotificationReport {
  readonly status: 'pending' | 'delivered'
  readonly failures: readonly NotificationFailure[]
}

export interface ApplyServerErrorsResult {
  readonly committed: true
  readonly applied: number
  readonly ignored: number
  readonly unresolved: readonly ValidationPath[]
  readonly notification: ErrorNotificationReport
}

export interface FormServerErrorApi {
  beginServerErrorOperation(options?: BeginServerErrorsOptions): ServerErrorOperation
  applyServerErrors(
    batch: ParsedServerErrors,
    options: ApplyServerErrorsOptions,
  ): ApplyServerErrorsResult
  subscribeErrorNotifications(listener: (report: ErrorNotificationReport) => void): () => void
  getErrorNotificationReports(): readonly ErrorNotificationReport[]
  clearErrorNotificationReports(): void
}
```

Defaults: scope `[]` — всё subtree Form-получателя, mode replace, unknownPath error. Scope разрешается в registered node/subtree при начале операции. Parsed paths относительны receiver Form, а не scope. Второй конфликтующий scope в Apply отсутствует. Для отдельного Field захватить его subtree scope; source-taking legacy setter не нужен. Global `[]` — настоящий target Form, не missing field.

Контракт lifecycle операции:

1. Begin после subclass initialization и **до отправки запроса приложения**. Захватить receiver/scope identity, monotonic subtree input revision, structural revision и reset generation. Begin не валидирует, не меняет touched/dirty и не публикует snapshot.
2. Новая операция отменяет применимость всех старых outstanding operations пересекающихся scopes (ancestor/descendant). Disjoint scopes независимы. Так latest-operation-wins работает и при равных значениях; одного revision недостаточно.
3. Каждое поддерживаемое фактическое изменение повышает affected subtree revisions, включая validate false и A→B→A. Structural revision учитывает identities/order, не только равенство payload; move/remove/insert/replacement инвалидируют captures. Reset всегда инвалидирует affected tokens. Validation/errors metadata и commitBaseline — нет.
4. Apply до записи/consumption отклоняет wrong-receiver, superseded, used, detached и revision-mismatched tokens. Append тоже требует token. Успешный apply потребляет его один раз, включая empty batch. Неудачный parse/preflight не потребляет иначе действующий token. Force/stale bypass не предусмотрен.
5. Сначала проверить batch ownership и operation, разрешить **все** targets, scope и unknown policies, вычислить итоговые source partitions и подготовить immutable results. Снова проверить revisions непосредственно перед commit без callbacks. Затем одна установка на affected node без schema callbacks/cast/validators/normalization. В outer batch live stores фиксируются немедленно, публикация snapshots откладывается до outer flush по правилам ниже.
6. Replace удаляет только server errors scope, включая пропущенные nodes и globals. Empty replace очищает этот server scope. Append добавляет в порядке входа. Type/custom/manual и client-check knowledge сохраняются.
7. Unknown по умолчанию — ошибка. Global явно превращает ошибку в own global ближайшей разрешённой Form **внутри scope**, исходный путь остаётся в Apply report. В scalar scope без Form такая конверсия невозможна и вызывает ошибку. Ignore явно исключает и отражает в report. Out-of-scope всегда ошибка, unknown policy её не обходит. Globals не перепривязываются к будущим полям.
8. Ошибки Parse/Preflight не меняют targets или token. Commit и Notification имеют разные последствия ниже; существующий scheduler ещё не реализует этот контракт.

Пример без HTTP, которым управляет приложение:

```ts
const operation = form.beginServerErrorOperation()
// Dispatch and await the application's request outside a synchronous batch.
const batch = schema.parse(response)
form.applyServerErrors(batch, {operation})
```

Библиотека не выполняет HTTP/cancellation/submit orchestration. Приложение связывает response с token, настраивает API paths/cross-field semantics и concurrency. Правило overlapping scopes, в отличие от revision-only предложения V3-01, закрывает старый ответ при неизменных values. Консервативное отклонение при любом изменении scope не переносит старые positional errors на другие items. Нельзя обещать revision tracking произвольных in-place/opaque mutations; использовать supported setters. Tokens локальны процессу, не persistence/transport IDs.

### ODR-05 A: Parse → Preflight → Commit → Notification

Parse чистый, возвращает detached branded batch. Preflight проверяет ownership/token/paths/scope/limits и готовит все affected source partitions, aggregate validity и candidate snapshots, включая предков. Все потенциально ошибочные capture/override, allocation/comparison выполняются здесь под purity guard **до** state writes и consumption токена. Candidates строятся по transaction-local staged read views без установки промежуточных snapshots и изменения live snapshot caches в Preflight. Поздний bad target/custom capture exception сохраняет errors, validity, values, touched, baseline, snapshot references и token; notifications отсутствуют.

Commit синхронно и без callbacks устанавливает все staged stores/check markers и потребляет token; вне enclosing batch также устанавливает snapshot references. Внутри batch published snapshot generation остаётся прежним до outer flush, staged complete candidate сохраняется. Между первой и последней установкой нет validators, переопределённых приложением getters, captures, parsing/normalization. Наблюдатели не видят partial commit. Ожидаемые ошибки устраняются Preflight; process termination/out-of-memory не получают recoverable rollback promise. После этой точки committed:true окончательно; subscriber exceptions не отклоняют Apply и не откатывают опубликованное. applied — число установленных normalized entries, включая global conversion; ignored — явно игнорируемые unknown paths; unresolved — исходные unknown paths в порядке входа, включая global/ignore. Mapping drops отражены только в parse trace. Empty replace может иметь applied:0 и очищать scope. Равное итоговое состояние потребляет token без state notification.

Notification начинается после согласованного commit всех affected snapshots. В wave порядок child-before-parent postorder, field/current item order, затем listeners по регистрации. Список registrations копируется при начале доставки node; удалённые пропускаются, новые ждут следующую wave. Исключение каждого listener перехватывается отдельно; остальные nodes/listeners продолжаются. Reentrant supported writes ставят следующую wave после текущей; snapshot reads при доставке видят committed snapshots этой wave. Live getters могут видеть последующие записи; уже доставленные snapshots никогда не мутируются. Это требование Apply/error-store transaction для V3-04.6, не глобальная переработка ObservableNode в V3-02.

Result.notification — engine-owned readonly **live report handle**, не canonical error/NodeSnapshot. Он pending до окончания delivery cycle, затем delivered с frozen stable failures array; меняется только представление getters status/failures. Вне batch delivered до возврата Apply. Во вложенных batch pending до outermost flush; inner exit не публикует snapshots/diagnostics. Несколько Apply внешнего batch разделяют cycle report с coalesced affected-node notifications; committed:true не обещает отдельное уведомление для каждого вызова. Последующие writes могут заменить ранние errors до final snapshot; промежуточное уведомление не требуется.

Receiver сохраняет failed reports в getErrorNotificationReports() до явного clearErrorNotificationReports(); игнорирование return value не теряет failures. subscribeErrorNotifications регистрирует diagnostic listener с независимой регистрацией и idempotent unsubscribe; он вызывается после ordinary delivery cycle на каждом receiver, участвовавшем в Apply. Во время diagnostics report ещё pending: ordinary failures доступны; exceptions diagnostic listeners добавляются с phase diagnostic, остальные продолжаются, recursive dispatch отсутствует. Затем report становится delivered. Failure.path относителен top owning Form, subscriber — zero-based registration position в списке доставки node/channel, отсутствует при finalization failure; error сохраняет thrown value только в diagnostics. Failure paths/lists detached readonly; thrown error values остаются opaque diagnostic references, не замораживаются и не преобразуются в JSON. Reports process-local, не входят в snapshots/value serialization/validation codes. Clear удаляет retained completed reports, не outstanding pending handle.

Batch callback/dependency failures сохраняют прежний приоритет исключений для иных mutations. Ошибка outer finalization после успешного Apply не отклоняет его commit задним числом: записать phase finalization в общий report, завершить diagnostics/handle и при exceptional exit, передать независимую batch failure по существующему контракту. Apply-owned snapshot capture подготовлен до commit; поздние произвольные batch writes/captures не получают rollback guarantee. Будущая интеграция сохраняет согласованное поколение committed snapshots при ошибке позднего candidate capture (последнее полное поколение остаётся). Частично опубликованное поколение недоступно observers.

| Fault injection | Обязательный результат |
| --- | --- |
| Parse/adapter/transform/JSON-domain failure | Нет batch/model writes; token не потреблён |
| Поздний target/scope/stale token/pre-commit capture failure | Нет Apply writes/notifications; snapshot references прежние |
| Commit нескольких stores | Все устанавливаются один раз до observations, без application callback |
| Первый/средний/последний subscriber бросает | committed:true; остальные вызываются; report содержит все failures |
| Diagnostic subscriber бросает | Остальные diagnostics продолжаются; failure сохранена, без recursion/rollback |
| Inner/outer batch, несколько Apply, поздние writes | Немедленный live commit, deferred coherent snapshots, один ordered/coalesced report |
| Outer callback/finalizer бросает после Apply | Apply committed; report завершён; независимая batch exception передана |
| Reentrant write / equal state / empty replace | Отдельная следующая wave / ноль state notifications при equality / верная очистка scope |

## 9. Инварианты безопасности и производительности

Resolver идёт по зарегистрированным children и own properties, не по произвольному object[segment]. __proto__, constructor, prototype и toString — literal data names. Использовать Map/null-prototype dictionaries или безопасное создание own properties; не применять recursive Object.assign к обычным объектам. Numeric segments — finite safe nonnegative integers, адресуют существующие items; auto-creation нет. Numeric-looking object keys не приводить без выбранного codec.

Лимиты parser по умолчанию и верхние пределы: depth 64 (root=0), nodes 100000 (каждое посещённое значение), errors 10000 (включая впоследствии dropped), path segments 64, string length 65536 UTF-16 units, maxBytes 8388608. limits может только снижать положительные safe-integer пределы. maxBytes использует метрику раздела 6 для всего обхода, включая ключи, code/message/paths/params и выход adapters; общий shared input считается на каждом появлении. Циклы/accessors/non-data objects отклоняются. Никаких toJSON/неявных преобразований в message. Диагностика детерминированна, partial batch отсутствует. Adapter — доверенный код; ограничивается обход/output ядра, а не CPU/IO callback.

Сохранить PERF-01 reconciliation/refresh epochs/frozen subtree reuse и новые детерминированные callback counts ODR-03. Группировать server errors до записи; не повторять normalization через setErrors([...previous,next]). Один target index на Apply. Shared empty arrays вместо четырёх eager arrays; не хранить full aggregate paths во всех nodes. Revisions распространять по changed ancestors; scope capture/preflight может обходить scope, это нужно измерять. Не обещать O(1) snapshots/writes: external-edit discovery и topology scans HF-013 сохраняются.

Доказательства: [PERF-01](../roadmap/v2.3.0/PERFORMANCE.ru.md), [измерения HF-015](../roadmap/v2.3.0/ERRORS_REVIEW.ru.md), [performance regressions](../../tests/unit/headless-performance.test.ts). Исторический full harness fixed HF-015: +20.6% создание, +7.4% unchanged snapshot, +23.9% scalar add/remove, +14.6% nested add/remove, около 0.3 MiB дополнительного post-GC heap; paired readings менялись. Это исторические данные, не свежий benchmark и не универсальные thresholds.

## 10. Утверждённые решения владельца — 2026-10-28

Все пять ODR закрыты как решения владельца. Детализация выше — принятый проект V3-02, не заявление о реализованном runtime.

| ID | Решение | Итог и миграция |
| --- | --- | --- |
| ODR-01 | APPROVED — стабильный typeId | Обязательный readonly typeId; машинный invalid_type.expected; getTypeName удалён без alias; custom types задают ID явно |
| ODR-02 | APPROVED — только JSON-compatible params | Точный recursive domain, detached deep freeze, descriptor/cycle/prototype checks и пределы; приложение явно мигрирует rich params |
| ODR-03 | APPROVED — B | Ноль промежуточных constructor checks; явная граница сборки; полный explicit traversal независимо от container errors; локальные structural checks |
| ODR-04 | APPROVED — новый API без bridges | Финальный REMOVE/REPLACE/KEEP ledger; один parser, явная config, immutable ErrorsMapping composition, trace, own/aggregate readers, required itemIds |
| ODR-05 | APPROVED — A | Parse/Preflight/Commit/Notification; атомарная установка, отдельный retained diagnostic report; post-commit subscriber failure не rollback |

[Реестр миграции и зависимости V3-03–06](../roadmap/v3.0.0/PLAN.ru.md) согласованы с этими решениями. Открытых OWNER_DECISION_REQUIRED по ODR-01–05 нет. V3-02 имеет статус ACCEPTED; READY_FOR_OWNER_REVIEW относится только к интеграции документации и не разрешает реализацию.
