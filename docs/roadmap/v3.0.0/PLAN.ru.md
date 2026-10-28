# AdaptForm 3.0 — V3-02: миграция, реализация и регрессии

[English](PLAN.md) · [Русский](PLAN.ru.md)

Статус: **BLOCKED для реализации до OWNER_DECISION_REQUIRED**. [Спецификация и решения](../../ai/V3_ARCHITECTURE.ru.md), [каталог I18N-01](../../ai/V3_ERROR_CODES.ru.md). Это результат документации, не разрешение начинать задачи, менять версию, создавать commit, push, merge или публикацию. Опубликованная 2.2.0 не меняется.

## 1. Последовательность и полномочия

PR #29 — открытый unmerged draft, head aab14d29b428c57cabb9ec5ceb069fcc5adaba6e. Его V3-03…07 — milestones; ниже используются подзадачи, а не конфликтующие значения тех же ID. Изменения PR #29 не загружались в refs, не checkout и не merged. Локальная база work/670c6a04014fbf938574bfd8eb2a706e44a9d4d0 совпадает с удалённым master. Архитектурные пути переиспользованы; будущая интеграция должна согласовать обе версии и отдельные additions AGENTS/DECISIONS.

Текущие утверждённые требования заменяют несовместимые предложения V3-01: manual очищается при фактическом изменении собственного значения; validate возвращает `{valid}`; нет перевода, formatter/resolver и fallback; unknown path по умолчанию ошибка; default replace охватывает всю Form; явный operation token закрывает параллельные ответы вместе с revisions. JSON-only params, переименование metadata, suppression hydration checks и безусловный обход children из V3-01 автоматически не утверждены.

Сохранить inference STAB-01, subscription boundaries STAB-02, stable identities/detachment HF-011, traversal/cache PERF-01, ограниченный selective graph HF-013, multiplicity/metadata/reactivity HF-015. Не добавлять async validation, submit controller, backend presets, новый FormField или модуль локализации.

## 2. Доказательства для решений о миграции

| ID | Текущий контракт и consumers |
| --- | --- |
| E1 | [FieldType](../../../src/core/types/FieldType.ts#L16), ветвления validate/validateErrors built-ins; [custom type tests](../../../tests/unit/structured-errors.test.ts#L69) |
| E2 | [ErrorState](../../../src/core/ValidationError.ts#L64), [mutable/protected errors](../../../tests/unit/structured-errors.test.ts#L81) |
| E3 | [Field setters/validation](../../../src/core/fields/Field.ts#L123), [legacy results](../../../tests/unit/structured-errors.test.ts#L49) |
| E4 | [Form import/routing](../../../src/core/Form.ts#L96), [интеграции schema](../../../tests/unit/FormErrorsShema.test.ts) |
| E5 | [ErrorsSchema parsers/helpers](../../../src/core/ErrorsShema.ts), [composition tests](../../../tests/unit/ErrorsShema.test.ts) |
| E6 | [Snapshot interfaces](../../../src/core/state/snapshot.ts#L7), [metadata/snapshots](../../../tests/unit/structured-errors.test.ts#L305) |
| E7 | [Characterization коллекций](../../../tests/unit/form-lifecycle-baseline.test.ts#L91), [HF-011](../../ai/HEADLESS_COLLECTION_IDENTITY.ru.md) |
| E8 | [Dependency guard](../../../src/core/state/dependencyScheduling.ts#L57), [purity/recovery](../../../tests/unit/headless-dependencies.test.ts#L408) |
| E9 | [Notifications/finalization](../../../src/core/state/ObservableNode.ts#L16), [subscription lifecycle](../../../tests/unit/headless-subscription-lifecycle.test.ts) |
| E10 | [Package exports](../../../package.json#L18), [source exports](../../../src/core/index.ts), [Luxon](../../../src/luxon.ts) |

## 3. Реестр legacy и замены полезных функций — ODR-04

Ниже раскрыты **предложения** для выбора владельцем, не скрытые удаления. Strict arrays и I18N-01 уже утверждены; точные удаления exports/helpers и спорное полезное поведение требуют указанных решений. Compatibility layer при подготовке документации не создаётся.

| Механизм / доказательство | Назначение | Предложение для 3.0 | Полноценная замена и последствия |
| --- | --- | --- | --- |
| FieldType.validate string API, E1 | Старые типы/direct consumers | REMOVE | validateErrors arrays, осмысленные коды выбирает приложение |
| Base bridge/override detection, E1 | Старые validate overrides | REMOVE | Override validateErrors без неявного вызова старого метода |
| Mutable strings/protected _errors и metadata, E2 | Старые правки/subclasses | REPLACE | Readonly own-error store, manual set/clear и supported subclass extension points |
| Message-text reconciliation, E2 | Восстановление metadata после array edits | REMOVE | Нет mutable string errors и неоднозначной text identity |
| Boolean/string/permissive custom results, E3 | Исторические validators/JS success | REPLACE | Только arrays; malformed/Promise — contract error |
| messages* exports/options, date message formatting, E3/E10 | Настройка built-in presentation | REMOVE по I18N-01 | App dictionaries/display. Отдельно проверить DateLuxon outputFormat относительно inputFormat; parsing/input functionality не удалять |
| error setter/first-string getter, E3 | Manual writes/удобное отображение | REPLACE | setErrors([{code,...}]), clearErrors, первая structured error |
| checkValid/checkAndSetValid, E3/E7 | Разная запись validity | REPLACE | validate().valid; server/manual сохраняются |
| Writable isValid, E3 | Внешнее переопределение validity | REVIEW | Предложено readonly derived; manual errors заменяют invalidation, forced-success consumers требуют решения |
| allErrors/globalErrors strings, E4 | UI grouping/labels, last-message globals | REPLACE | Flat located read + own structured globals; приложение группирует/отображает |
| form.errors=response и Form.setErrors(response), E4 | Два контракта server import | REPLACE | Один parse→applyServerErrors с token/scope/mode, без aliases |
| Source-taking local setErrors/provenance stack, E2/E4 | Virtual legacy setters для сервера | REPLACE | Manual-only setter и явные engine sources, без ambient bridge |
| client/external, E2 | Старые источники | REPLACE | type/manual; миграция persisted DTO/filter |
| parseErrors/detail/override bridge, E5 | String/detailed projections/custom parser | REPLACE | Один parse, optional trace, adapter; сохранить инспекцию mapping без lossy records |
| Static/dynamic/fallback/transformers, E5 | API-specific extraction/mapping | REDESIGN | Exact/dynamic rules, явные decoders/transforms. Whole-leaf transformation выразима до extraction; не переносить array transformer молча на отдельную ошибку |
| nest/forArray/fromObject/clone/merge, E5 | Composition/custom indexes | REDESIGN, STOPPED | До сигнатур утвердить source/target prefixes, codec/flags, transformer order и extractor conflicts |
| Shared mutable DefaultErrorsSchema, E4/E5 | Удобный default mapping | REVIEW, STOPPED | A: explicit immutable preset/factory с форматом; B: обязательная config. Без inferred backend/code fallback и пустого alias |
| ParsedError/DynamicRule, E5/E10 | Public parser config/trace | REPLACE | Typed config и ErrorMappingTrace; старые imports явно перестают компилироваться |
| getOwnErrors/getErrors readers, E2/E4 | Own/descendant inspection | KEEP полезное различие | field.errors/scalar getErrors локальны; Form/collection getErrors located. Возраст structured reader не причина удаления; точные имена — export review |
| Snapshot strings/optional validationErrors, E6 | Аддитивная совместимость producers 2.x | REPLACE | Обязательные own structures; children несут свои ошибки. Без второго aggregate truth |
| Optional itemIds, E6/E7 | Старые snapshot producers | REVIEW | Для будущих engine snapshots required; public optionality меняется с producer migration, identity сохраняется |
| Constructor repeats/container gates, E7 | Реальный lifecycle | ODR-03 | Сохранить timing либо явно утвердить final-pass redesign; возраст не доказывает legacy |
| getTypeName/snapshot-converted params, E1/E2 | Introspection/cast metadata/rich data | ODR-01/02 | Без localized fallback и неутверждённого сужения; варианты в спецификации |

## 4. Миграция consumers

| Старый API/поведение | Target/предложение и причина | Затронутые приложения / миграция | Автоматизация | Необходимые проверки |
| --- | --- | --- | --- | --- |
| Type validate→strings | validateErrors→ErrorInput[], один контракт | Custom types/subclasses: назначить codes, сохранить order | Только частичное rename; codes вручную | Structural/override/direct built-ins |
| Custom true/false/string/object | [] либо array, строгий результат | JS/TS validators: true→[], false→coded error, object обернуть | Частично; boolean expressions требуют review | Bad JS outputs, empty/duplicate arrays, Promise |
| Boolean validation/checkAndSetValid | validate().valid | Submit/control logic; сохранённые server/manual могут оставить false | Rename + result access с semantic review | Effective/client success |
| String reads/push/splice/_errors | Readonly structures/manual operations | UI/subclasses, отображение в приложении | Простые чтения частично, mutations вручную | Detached params, внешние мутации |
| messages/messages*/built-in texts | App display по code/params | Все localized UI; ядро не даёт message/code fallback | Безопасно автоматически нельзя | Каталог и отсутствие generated message |
| getTypeName/localized expected | ODR-01 machine metadata | Custom types/introspection/display | Заблокировано до решения | Cast routes, независимость от locale |
| Date/Map/cyclic params | ODR-02 | Rich errors: преобразование либо defined descriptors | Заблокировано; нельзя молча терять данные | Domain, alias detachment |
| form.errors; Form.setErrors(response) | Parse + tokenized Apply | Legacy/HF-015 server consumers | Extraction/mapping вручную | Rejected parse/apply не меняет state |
| setErrors(errors,source) | Manual-only; server через Apply | Programmatic errors без spoof source | Частично по callsite | Сохранение/очистка sources |
| allErrors/globalErrors/setGlobalError | Located errors/own Form setErrors | Nested/global UI; list replacement явный | Grouping вручную | Globals, repeated codes, scalar items |
| client/external | type/manual | Filters, snapshots, persisted errors | Literal rename возможно | Старые sources не выдаются |
| Local Field path:[] | Local без path; located Form aggregation | DTO/generic readers | Частично по receiver type | Move paths/literal dots |
| Parser methods/subclasses | Один parse с trace/adapter | Schema integrations | Вручную, сохранить full-leaf transforms | Static/dynamic/fallback/composition |
| Validate стирает все errors | Server/manual остаются | Resubmit flows явно очищают источники, не force isValid | Semantic review вручную | Active remote/manual → valid false |
| Любая запись стирает errors | Actual own raw/clean change очищает оба | Controlled inputs/equal writes | Без blind codemod | Invalid raws с clean null, equal/format-only |
| Indexed response к текущей коллекции | Captured identity/structure/revision | HTTP callers, при sync validation | Begin до запроса вручную | Parallel/insert/remove/move/replacement/ABA |
| Snapshot strings/optional metadata | Own structures, itemIds ODR-04 | Adapters, persisted snapshots, fixtures | Частично fixtures | Metadata notifications/stable frozen state |
| Мутации validators вне графа | Запрещены везде | Impure validators/required callbacks | Вынести действия после validation вручную | Direct/full/nested/collection/dependency/reentrant |
| Constructor/timing dependencies | ODR-03 | Factories/deferred hydration/parent context | Вручную при одобренном изменении | Exact counts/context |
| rawValue T|null при raw strings | Спецификация не выбирает изменение | TS raw readers; unknown/raw generic — отдельная смена контракта | Сначала owner review | Clean inference и numeric raw strings |

ESM/CommonJS: сохранить adaptform/adaptform/luxon и оба runtime formats; error redesign не обосновывает смену formats. Проверять strict NodeNext .mts/.cts с skipLibCheck:false на packed declarations. JS нужны понятные runtime failures, не только TS safety. Luxon остаётся optional и отсутствует в main runtime/types; сохранить его input/cast. Snapshot format — не payload JSON/FormData: не добавлять codes/sources/revisions/itemIds/tokens в сериализацию значений. Вложенность остаётся ArrayFormField; reset membership/targets/baseline сохраняются без отдельного разрешения.

## 5. Небольшие задачи реализации

Каждая требует отдельного разрешения после закрытия решений. Модель **GPT-6.1-Sol**, effort по строкам. Astra не требуется. Отдельный reviewable commit на задачу — когда коммиты разрешены. Зависимости технические, не разрешение пропускать approval. Для удаления public APIs обязательно решение ODR-04.

| ID / задача | Цель и компоненты | Зависимости | Приёмка | Адресные тесты/проверки | Риск | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| V3-03.1 Error DTO | Types, checks code/params, source ownership | ODR-01/02 | Один immutable domain, без strings/message fallback | Detach/alias/cycles и negative types | Потеря params без решения | High |
| V3-03.2 Source storage | ErrorState без facade, client-check marker | 03.1, ODR-04 | Независимые sources, без duplicate canonical list/boolean | Lifecycle matrix, order, clear/unknown | Ложная validity после clear | High |
| V3-03.3 I18N-01/FieldType | Structural interface/base/built-ins/Luxon | 03.1, ODR-01 | Только validateErrors, каталог 17 codes, без messages | Type suites, structural/override, params declarations | Изменение правил/cast | High |
| V3-03.4 Scalar runner/purity | Field compute/commit, новый result | 03.2/3 | Effective valid, guard без графа, strict arrays | Direct A02, required/type/custom, recursion, throw/Promise | Recovery guard/scheduler | High |
| V3-03.5 Collection lifecycle | Обе коллекции, callbacks/construction | 03.4, ODR-03 | Утверждённые timing/traversal, identity clearing обоих sources | Counts/deferred/min/max/add/remove/move | Timing/context changes | High |
| V3-03.6 HF-013 | Graph runner/all-source state | 03.4/5 | Chains/diamonds/counts/disposal сохранены | Dependency/config/batch tests | Пропущенный/повторный target | High |
| V3-03.7 Canonical snapshots | Own errors/cache integration | 03.2/5/6, ODR-04 | Frozen/stable, metadata visible, HF-011 | Nested/subscription/performance regressions | Quadratic ancestor refresh | High |
| V3-03.8 Core legacy cleanup | Удалить одобренные bridges/setters/messages exports | 03.3…7, ODR-04 | Нет скрытого dispatch/facade; реестр выполнен | Export diff, source/test types, ESM/CJS smoke | Забытый subclass/JS consumer | Medium |
| V3-04.1 Parser normalization | Один parse/config/adapter | 03.1, ODR-02 | Общий normalizer, строгий отказ, без Form writes | Malformed/cycle/limits/source spoof/adapter exceptions | References/partial output | High |
| V3-04.2 Declarative extraction | Records selectors/tree decoder | 04.1 | Явные envelope/path/code, nested/arrays/globals/missing | Existing fixtures/literal dots/numeric names | Скрытая эвристика | High |
| V3-04.3 Mapping/composition | Static/dynamic/fallback/trace/helpers | 04.2, ODR-04 | Priority, full-leaf transforms, один parser | Schema suite/codecs/flags/merge conflicts | Потеря полезной функции | High |
| V3-04.4 Safe preflight | Registered resolver/scope | 04.1/3,03.7 | Все targets до writes, unknown default error | A03 все уровни, prototype keys/indexes/globals | Prototype/wrong target | High |
| V3-04.5 Revisions/operations | Begin token/overlap/latest/reset | 03.5/6,04.4 | Newer wins при равенстве, structure/ABA reject, disjoint независимы | Два порядка responses/reset/move/replace/used/wrong-root | Stale wins/retained tokens | High |
| V3-04.6 Atomic grouped Apply | Stage/swap, reuse normalized entries | 04.4/5,ODR-05 | Whole-form replace default, explicit append, no rejected writes | Fault matrix parse/preflight/commit/notifications, empty/batch | Неверное обещание atomicity | High |
| V3-04.7 Server legacy cleanup | Старые importers/parsers/types | 04.6,ODR-04 | Один ingestion pipeline и migration recipes | Export inventory, integrations без bridge | Остался lossy/duplicate parser | Medium |
| V3-05.1 Consumer migration | EN/RU/examples/demo/diagnostics | 03.8,04.7 | Рабочая замена каждой строки реестра | Example types, JS failures, affected demo | Скрытые semantic breaks | Medium |
| V3-05.2 Package/type regressions | STAB-01/ESM/CJS/Luxon | 05.1 | Inference, без TS2589, optional Luxon isolated | Packed .mts/.cts, positive/negative types | Packaging/type break | High |
| V3-06.1 Performance review | Baseline/core/import/tokens | 03.7,04.6 | Paired data/counts, нет повторной normalization | Harness + большие imports одного/многих targets/depth/token lifetime | Шум/heap cost | High |
| V3-06.2 Independent RC audit | Correctness/security/full regression | 05.2,06.1 | A02/A03 закрыты, A04 принят по данным, решения закрыты | Full tests/lint/types/build/package/demo/audit/packed | Cross-module regression | High |
| V3-07 Отдельный release gate | Manifest/preparation/publication только с разрешением | 06.2 + explicit authorization | Проверены version/workflow, владелец решает внешние действия | Clean install/pack/final CI; registry/provenance при разрешении publish | Auto master publication | High |

Не запускать полный тяжёлый набор после каждой мелкой правки. Начинать с affected Vitest files и relevant noEmit checks; расширять при пересечении компонентов/сбоях. Documentation-only не требует behavioral tests. Полная регрессия — на собранном кандидате, с фактическими командами/результатами. Benchmarks — адресное ручное доказательство, не зависимые от host pass thresholds. Независимый reviewer проверяет SHA тестировавшегося артефакта.

## 6. Матрица рисков и регрессий

| Риск / инвариант | Сценарий | Доказательство приёмки / задача |
| --- | --- | --- |
| A01 structural types | Independent class, new override, old-only method | Новый контракт работает, старый явно отклонён без bridge / 03.3,05.2 |
| A02 purity | Direct/auto/full/nested/collection/required/type/custom, recursion, другой root | Supported writes отклонены до мутации, guard восстанавливается / 03.4…6 |
| A03 object safety | Nested mapping/params с __proto__/constructor/prototype/toString | Без prototype change/lost keys, safe resolver, no writes on reject / 04.1,04.4 |
| Sources/lifecycle | Client success с server/manual; own/sibling/equal/invalid-raw writes | Effective valid, только ожидаемая очистка / 03.2…6 |
| I18N-01 | Все built-ins, required/cast/collections/Luxon | Exact code/params, нет message/formatter/locale/fallback / 03.3 |
| Duplicate/order | Same-field/code/params, keys→one target | Без dictionary collapse, стабильный список / 03.1,04.3/6 |
| Atomic failure | Parser/adapter throw, invalid params/path, поздний bad target/scope/token | Не меняются values/errors/validity/touched/baseline/snapshots, нет notify / 04.6 |
| Observer failure после commit | Subscriber/capture throw, direct Apply/outer batch | Точный канал ODR-05, без ложного rollback / 04.6 |
| Latest operation | Equal values, newer first, old parse fail, disjoint/overlap | Superseded не replace/append, disjoint работает / 04.5 |
| Revision/dirty | A→B→A, clean-equal raw, validate false, baseline | ABA инвалидирует; metadata/baseline — нет / 04.5 |
| Identity коллекции | Equal-content move/insert/remove, nested replacement, detached node | Stale positions reject, local errors следуют identity / 03.5,04.5 |
| Reset/baseline | Hydration/defaults/membership/equal reset/error-only baseline | Старые targets/order; все errors clear, baseline не clear / 03.5,04.5 |
| Batch/reactivity | Metadata-only, equivalent repeats, live/committed reads, reentrant | Snapshots до callbacks, once per node, direct validate immediate / 03.7,04.6 |
| HF-013 | Diamond/duplicate refs/suppressed/cycle/missing/disposal | Selected once, чужие errors сохраняются, recovery / 03.6 |
| PERF-01/A04 | 1000-node reads/writes/collections, many errors/target, huge scopes | Traversal/count bounds, linear normalization, paired heap/timings / 06.1 |
| Modules/types | JS/TS, ESM/CJS, core без Luxon, optional entry | Packed runtime/types, payloads без изменений / 05.2 |
| Params/catalogue | Domain ODR-02, unknown codes, absent/empty messages | Deep immutability, без closed enum/потери app data / 03.1/3 |

## 7. Завершение и release gates

Результаты V3-02: architecture EN/RU (signatures/schema/apply/lifecycle/decisions), catalogue EN/RU, этот plan EN/RU (migration/dependencies/acceptance/risks). Кратко обновить handoff и записи утверждённых требований, не копируя приватное обсуждение. Не переписывать историческое поведение HF-015 как будущее и не утверждать merge PR #29.

Проверки документации: relative links, идентичность TS blocks EN/RU, 17-code coverage по source literals, IDs решений/задач, strict TypeScript candidate declarations/examples в памяти, whitespace/diff и inspection списка только docs. Это consistency checks, не runtime implementation и не owner approval. Фактические результаты — в handoff; full runtime/build/audit/benchmark не входят в этот этап документации.

Перед релизом: закрыть ODR-01…05 и утвердить helpers/exports; выполнить разрешённые subtasks; мигрировать examples/consumers; пройти независимую A02/A03 security/correctness и измеренную A04 performance review; полные candidate gates и packed strict ESM/CJS, включая core без Luxon. Проверить publish workflow: future master version bump может запустить публикацию. Version bump, commit/push, merge, tag/release и npm publish вне V3-02. Downstream adoption (включая PL-01 из PR #29) вне релиза AdaptForm.

Общий статус: **BLOCKED** — пять групп решений владельца не позволяют объявить контракт безусловно финальным и готовым к реализации. Независимая работа над спецификацией завершена; implementation не начиналась.
