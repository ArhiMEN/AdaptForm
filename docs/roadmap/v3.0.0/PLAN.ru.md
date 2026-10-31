# AdaptForm 3.0 — V3-02: миграция, реализация и регрессии

[English](PLAN.md) · [Русский](PLAN.ru.md)

Статус V3-02: **ACCEPTED** на `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 окончательны. Статус интеграции документации: **READY_FOR_OWNER_REVIEW**. [Спецификация](../../ai/V3_ARCHITECTURE.ru.md), [каталог I18N-01](../../ai/V3_ERROR_CODES.ru.md). Разрешена интеграция документации PR #29, один логический коммит/push в docs/v3-02-specification и обновление существующего Draft PR #30. Реализация V3-03, merge и выпуск требуют отдельного разрешения. Версия 2.2.0 не меняется.

## 1. Последовательность и полномочия

PR #29 остаётся открытым Draft без merge на `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`; его V3-03…07 обозначают milestones, ниже используются подзадачи. 2026-10-31 обе ветки загружены и сравнены с master `670c6a04014fbf938574bfd8eb2a706e44a9d4d0`. Интеграция начинается с принятого владельцем HEAD PR #30 `b041806ee35c56f55c0a0925e7d0de8b533f09bd`: перенесены недостающие правила AGENTS/DECISIONS с сохранением принятой архитектуры. См. полную [матрицу переноса PR #29](../../ai/V3_DOCUMENTATION_INTEGRATION.ru.md); merge и изменение ветки PR #29 не выполняются.

Утверждённые ODR-01–05 заменяют несовместимые предложения V3-01/V3-02: обязательный typeId вместо getTypeName; JSON params с глубокими checks/limits; ODR-03 B без промежуточных проверок, с полным explicit traversal; финальный legacy ledger и композиция mappings; ODR-05 A с атомарным commit и отдельными notification diagnostics. Сохраняются manual clear при own-value change, validate→{valid}, I18N-01, whole-form replace, unknown-path error и operation tokens/revisions.

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

## 3. Итоговый реестр REMOVE / REPLACE / KEEP — ODR-04

Направление и итоговые замены приняты владельцем. Классификация относится к будущей 3.0; в V3-02 runtime ничего не удаляется. Полезное поведение имеет явную замену, без aliases/hidden dispatch/второго parser. E1–E10 — неизменённые исходники 2.x.

| Механизм / доказательство | Решение | Будущий API / миграционные последствия |
| --- | --- | --- |
| FieldType.validate(): string[], E1 | REMOVE | Только validateErrors(): readonly ValidationErrorInput[]; задать явные rule codes |
| Base validate bridge / built-in override detection, E1 | REMOVE | Structural FieldTypeContract либо optional base; override validateErrors напрямую |
| Mutable string errors/protected _errors, E2 | REPLACE | Один canonical source-partitioned readonly store; subclasses используют public setErrors/clearErrors без protected array mutation |
| String reconciliation/provenance stack, E2/E4 | REMOVE | Нет text identity, ambient source context и второго string truth |
| Legacy boolean/string/single-object outputs, E3 | REMOVE | Только array; true→[], false/string→явные coded arrays; invalid JS/Promise даёт диагностику |
| messages*, messages options, built-in texts/localization, E3/E10 | REMOVE | App display по code/params; без formatter/locale/message или code fallback ядра |
| DateLuxon outputFormat, E10 | REMOVE | Проверено message-only использование; форматирует приложение. KEEP inputFormat/casts/comparison modes |
| error string getter/setter, E3 | REPLACE | errors[0] как structured data; setErrors([{code,...}])/clearErrors без string setter |
| checkValid/checkAndSetValid, E3/E7 | REPLACE | validate(): ValidationResult, читать .valid по всем active sources |
| Mutable isValid, E3 | REPLACE | Derived readonly tri-state Field/boolean aggregate; manual errors для invalidity, успешная validation подтверждает client success; forced-success override отсутствует |
| allErrors/globalErrors/setGlobalError/clearGlobalErrors strings, E4 | REPLACE | Located getErrors; Form getOwnErrors()/errors — pathless globals; own manual set/clear, повторы сохраняются; UI группирует/отображает |
| form.errors=response, Form.setErrors(response), errorsShema property, E4 | REMOVE | Явный configured ErrorsSchema.parse → tokenized applyServerErrors. Новый Form.setErrors принимает только manual structures |
| Source-taking local setErrors, E2/E4 | REPLACE | Manual-only setErrors; engine назначает type/custom/server на своих границах |
| Legacy sources client/external, E2 | REMOVE | Filters/DTOs: client→type, external→manual; custom/server прежние |
| parseErrors/parseErrorsDetailed/parseValidationErrors/override bridge, E5 | REMOVE | Один ErrorsSchema.parse с optional trace; parser subclasses явно заменяются adapter |
| staticKey/dynamicKey/fallback/transformValue fluent methods, E5 | REPLACE | Immutable ErrorsMapping config static/dynamic/fallback/ErrorTransform; whole-leaf transforms в tree leaf/adapter до extraction |
| nest, E5 | REPLACE | ErrorsMapping.nest({sourcePrefix,targetPrefix}); tuple scopes, source strip/target prefix, local regex/fallback |
| forArray/custom index extractor, E5 | REPLACE | ErrorsMapping.forArray(item,options), явный tuple index decoder/path codec без угадывания формата |
| fromObject, E5 | REPLACE | ErrorsMapping.fromObject(Readonly<Record<string,ValidationPath>>); literal own string keys, явные tuple targets |
| clone, E5 | REPLACE | ErrorsMapping.clone(), независимая immutable config; regex copied, callbacks shared по ссылке |
| merge, E5 | REPLACE | ErrorsMapping.merge(other,options), left→right transforms, точные conflict policies/stable dynamic order; extraction config не merged |
| Shared mutable DefaultErrorsSchema, E4/E5 | REMOVE | Обязательная явная ErrorsSchemaConfig с extraction mode/code/path, без global preset/inferred format |
| ParsedError/DynamicRule/ErrorFieldMapping old shapes, E5/E10 | REPLACE | ErrorMappingTrace, StaticErrorMapping/DynamicErrorMapping, ErrorsMappingConfig; imports мигрируют явно |
| getOwnErrors/getErrors useful readers, E2/E4 | KEEP | Own pathless read всех nodes, включая globals Form; scalar getErrors own, Form/collection flat located projection |
| Snapshot strings/allErrors/globalErrors/optional validationErrors, E6 | REPLACE | Обязательный own structured NodeSnapshot.errors; descendants в child snapshots, без второго cached aggregate truth |
| Optional itemIds engine collection snapshots, E6/E7 | REPLACE | Обязательный readonly string[] по children; external producers/fixtures мигрируют к stable IDs |
| HF-011 identities/move/detach, E7 | KEEP | Errors/subscriptions/IDs следуют retained nodes; пути по текущему порядку, без value matching |
| Constructor repeats/container child short-circuit, E7 | REPLACE | ODR-03 B: ноль assembly checks, явная граница завершения, независимый full traversal, локальные automatic structural checks |
| getTypeName/localized expected, E1 | REPLACE | Обязательный readonly typeId; восемь IDs шести built-ins/modes; явные custom IDs, без alias/name inference |
| Rich snapshot-converted params, E2 | REPLACE | ODR-02 JSON named object domain, validation/copy/freeze/budgets; Date/Map/Set/classes/cycles явно преобразует приложение |

Сигнатуры composition и точная семантика prefixes/merge/conflicts/copy/transforms/trace — в [разделе 7 архитектуры](../../ai/V3_ARCHITECTURE.ru.md). Представлен каждый старый schema helper. Extractors остаются в одном configured parser; ErrorsMapping сохраняет composition без конкурирующих extraction configs.

## 4. Миграция consumers

| Старый API/поведение | Итоговый target и причина | Затронутые приложения / миграция | Автоматизация | Необходимые проверки |
| --- | --- | --- | --- | --- |
| Type validate→strings | validateErrors→ErrorInput[], один контракт | Custom types/subclasses: назначить codes, сохранить order | Только частичное rename; codes вручную | Structural/override/direct built-ins |
| Custom true/false/string/object | [] либо array, строгий результат | JS/TS validators: true→[], false→coded error, object обернуть | Частично; boolean expressions требуют review | Bad JS outputs, empty/duplicate arrays, Promise |
| Boolean validation/checkAndSetValid | validate().valid | Submit/control logic; сохранённые server/manual могут оставить false | Rename + result access с semantic review | Effective/client success |
| String reads/push/splice/_errors | Readonly structures/manual operations | UI/subclasses, отображение в приложении | Простые чтения частично, mutations вручную | Detached params, внешние мутации |
| messages/messages*/built-in texts | App display по code/params | Все localized UI; ядро не даёт message/code fallback | Безопасно автоматически нельзя | Каталог и отсутствие generated message |
| getTypeName/localized expected | readonly typeId без alias | Custom types/introspection/display | Явный custom ID и app display dictionary | Cast routes, независимость от locale |
| Date/Map/cyclic params | JSON params и фиксированные пределы | Date→epoch/ISO, Map→entries, Set→array, classes→DTO; cycles явно устранить | Вручную, без silent coercion/data loss | Domain, alias detachment |
| form.errors; Form.setErrors(response) | Parse + tokenized Apply | Legacy/HF-015 server consumers | Extraction/mapping вручную | Rejected parse/apply не меняет state |
| setErrors(errors,source) | Manual-only; server через Apply | Programmatic errors без spoof source | Частично по callsite | Сохранение/очистка sources |
| allErrors/globalErrors/setGlobalError | Located errors/own Form setErrors | Nested/global UI; list replacement явный | Grouping вручную | Globals, repeated codes, scalar items |
| client/external | type/manual | Filters, snapshots, persisted errors | Literal rename возможно | Старые sources не выдаются |
| Local Field path:[] | Local без path; located Form aggregation | DTO/generic readers | Частично по receiver type | Move paths/literal dots |
| Parser methods/subclasses | Один parse с trace/adapter | Schema integrations | Вручную, сохранить full-leaf transforms | Static/dynamic/fallback/composition |
| Validate стирает все errors | Server/manual остаются | Resubmit flows явно очищают источники, не force isValid | Semantic review вручную | Active remote/manual → valid false |
| Любая запись стирает errors | Actual own raw/clean change очищает оба | Controlled inputs/equal writes | Без blind codemod | Invalid raws с clean null, equal/format-only |
| Indexed response к текущей коллекции | Captured identity/structure/revision | HTTP callers, при sync validation | Begin до запроса вручную | Parallel/insert/remove/move/replacement/ABA |
| Snapshot strings/optional metadata | Own structures, required stable itemIds | Adapters, persisted snapshots, fixtures | Частично fixtures | Metadata notifications/stable frozen state |
| Мутации validators вне графа | Запрещены везде | Impure validators/required callbacks | Вынести действия после validation вручную | Direct/full/nested/collection/dependency/reentrant |
| Constructor/timing dependencies | Ноль constructor/deferred checks, explicit complete pass | Factories/deferred hydration/parent context | Перенести проверки после завершения создания | Exact counts/context |
| rawValue T|null при raw strings | Спецификация не выбирает изменение | TS raw readers; unknown/raw generic — отдельная смена контракта | Сначала owner review | Clean inference и numeric raw strings |

ESM/CommonJS: сохранить adaptform/adaptform/luxon и оба runtime formats; error redesign не обосновывает смену formats. Проверять strict NodeNext .mts/.cts с skipLibCheck:false на packed declarations. JS нужны понятные runtime failures, не только TS safety. Luxon остаётся optional и отсутствует в main runtime/types; сохранить его input/cast. Snapshot format — не payload JSON/FormData: не добавлять codes/sources/revisions/itemIds/tokens в сериализацию значений. Вложенность остаётся ArrayFormField; reset membership/targets/baseline сохраняются без отдельного разрешения.

## 5. Небольшие задачи реализации

ODR-01–05 закрыты; спецификация принята, но каждая задача требует отдельного разрешения на реализацию. Модель **GPT-6.1-Sol**, effort по строкам. Astra не требуется. Отдельный reviewable commit на задачу — когда коммиты разрешены. Зависимости технические, не разрешение пропускать approval. Все удаления/замены public APIs определены итоговым реестром ODR-04.

| ID / задача | Цель и компоненты | Зависимости | Приёмка | Адресные тесты/проверки | Риск | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| V3-03.1 Error DTO | Types, checks code/params, source ownership | утверждены ODR-01/02 | Точный JSON-domain, пределы, detached deep freeze, без strings/message fallback | Detach/alias/cycles и negative types | Явная миграция rich params | High |
| V3-03.2 Source storage | ErrorState без facade, client-check marker | 03.1, ODR-04 | Независимые sources, без duplicate canonical list/boolean | Lifecycle matrix, order, clear/unknown | Ложная validity после clear | High |
| V3-03.3 I18N-01/FieldType | Structural interface/base/built-ins/Luxon | 03.1, ODR-01 | Обязательный typeId (8 IDs/6 types), только validateErrors, 17 codes, без messages | Type suites, structural/override, params declarations | Изменение правил/cast | High |
| V3-03.4 Scalar runner/purity | Field compute/commit, новый result | 03.2/3 | Effective valid, guard без графа, strict arrays | Direct A02, required/type/custom, recursion, throw/Promise | Recovery guard/scheduler | High |
| V3-03.5 Collection lifecycle | Обе коллекции, callbacks/construction | 03.4, ODR-03 | Ноль assembly callbacks, full traversal при size errors, local structural counts, identity clearing | Counts/deferred/min/max/add/remove/move | Timing/context changes | High |
| V3-03.6 HF-013 | Graph runner/all-source state | 03.4/5 | Chains/diamonds/counts/disposal сохранены | Dependency/config/batch tests | Пропущенный/повторный target | High |
| V3-03.7 Canonical snapshots | Own errors/cache integration | 03.2/5/6, ODR-04 | Required own structured errors/itemIds, frozen/stable, metadata visible, HF-011 | Nested/subscription/performance regressions | Quadratic ancestor refresh | High |
| V3-03.8 Core legacy cleanup | Удалить одобренные bridges/setters/messages exports | 03.3…7, ODR-04 | Нет скрытого dispatch/facade; реестр выполнен | Export diff, source/test types, ESM/CJS smoke | Забытый subclass/JS consumer | Medium |
| V3-04.1 Parser normalization | Один parse/config/adapter | 03.1, ODR-02 | Один bounded JSON normalizer, descriptor checks, detached readonly callback inputs, без Form writes | Malformed/cycle/limits/source spoof/adapter exceptions | References/partial output | High |
| V3-04.2 Declarative extraction | Records selectors/tree decoder | 04.1 | Явные envelope/path/code, nested/arrays/globals/missing | Existing fixtures/literal dots/numeric names | Скрытая эвристика | High |
| V3-04.3 Mapping/composition | Static/dynamic/fallback/trace/helpers | 04.2, ODR-04 | ErrorsMapping: точные prefixes/conflicts/copy/left→right transforms, full-leaf extraction, trace drops | Schema suite/codecs/flags/merge conflicts | Потеря полезной функции | High |
| V3-04.4 Safe preflight | Registered resolver/scope | 04.1/3,03.7 | Все targets до writes, unknown default error | A03 все уровни, prototype keys/indexes/globals | Prototype/wrong target | High |
| V3-04.5 Revisions/operations | Begin token/overlap/latest/reset | 03.5/6,04.4 | Newer wins при равенстве, structure/ABA reject, disjoint независимы | Два порядка responses/reset/move/replace/used/wrong-root | Stale wins/retained tokens | High |
| V3-04.6 Atomic grouped Apply | Stage/swap, reuse normalized entries | 04.4/5,ODR-05 | Четыре фазы, callback-free atomic commit, committed:true + pending/delivered report, retained failures, ordered nested batch | Fault matrix parse/preflight/commit/notifications, empty/batch | Неверное обещание atomicity | High |
| V3-04.7 Server legacy cleanup | Старые importers/parsers/types | 04.6,ODR-04 | Один ingestion pipeline и migration recipes | Export inventory, integrations без bridge | Остался lossy/duplicate parser | Medium |
| V3-05.1 Consumer migration | EN/RU/examples/demo/diagnostics | 03.8,04.7 | Рабочая замена каждой строки, включая typeId/rich params/ErrorsMapping/diagnostics | Example types, JS failures, affected demo | Скрытые semantic breaks | Medium |
| V3-05.2 Package/type regressions | STAB-01/ESM/CJS/Luxon | 05.1 | Inference, без TS2589, optional Luxon isolated | Packed .mts/.cts, positive/negative types | Packaging/type break | High |
| V3-06.1 Performance review | Baseline/core/import/tokens | 03.7,04.6 | Paired data, ODR-03 counts, bounded params/imports/report retention без accumulated renormalization | Harness + большие imports одного/многих targets/depth/token lifetime | Шум/heap cost | High |
| V3-06.2 Independent RC audit | Correctness/security/full regression | 05.2,06.1 | A02/A03 закрыты, измерен A04, проверены все ODR-контракты и полный реестр | Full tests/lint/types/build/package/demo/audit/packed | Cross-module regression | High |
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
| Observer failure после commit | Subscriber throw / поздний outer capture failure, direct Apply/outer batch | Все listeners выполняются; retained failures, включая diagnostic; pending→delivered на outer flush; без rollback / 04.6 |
| Latest operation | Equal values, newer first, old parse fail, disjoint/overlap | Superseded не replace/append, disjoint работает / 04.5 |
| Revision/dirty | A→B→A, clean-equal raw, validate false, baseline | ABA инвалидирует; metadata/baseline — нет / 04.5 |
| Identity коллекции | Equal-content move/insert/remove, nested replacement, detached node | Stale positions reject, local errors следуют identity / 03.5,04.5 |
| Reset/baseline | Hydration/defaults/membership/equal reset/error-only baseline | Старые targets/order; все errors clear, baseline не clear / 03.5,04.5 |
| Batch/reactivity | Metadata-only, equivalent repeats, live/committed reads, reentrant | Snapshots до callbacks, once per node, direct validate immediate / 03.7,04.6 |
| HF-013 | Diamond/duplicate refs/suppressed/cycle/missing/disposal | Selected once, чужие errors сохраняются, recovery / 03.6 |
| PERF-01/A04 | 1000-node reads/writes/collections, many errors/target, huge scopes | Traversal/count bounds, linear normalization, paired heap/timings / 06.1 |
| Modules/types | JS/TS, ESM/CJS, core без Luxon, optional entry | Packed runtime/types, payloads без изменений / 05.2 |
| Params/catalogue | Точный JSON-domain/пределы ODR-02, unknown codes, absent/empty messages | Deep immutability, без closed enum/потери app data / 03.1/3 |
| ODR-03 counts/context | Constructor/deferred/reset zero; add new-only; remove/move own-only; full validate при size failure | Точная count matrix, hydrated siblings/nested Form context / 03.5 |
| Composition | Все пять helpers, tuple prefixes/custom indexes, regex flags/captures, static/fallback conflicts, left→right transforms/full-leaf arrays | Точная семантика/trace drops, без extraction merge/второго parser / 04.3 |
| Params safety | undefined/nonfinite/BigInt/Symbol/functions/classes/cycles/accessors/prototypes/sparse arrays, граничные пределы | Contract diagnostics без getters/toJSON/caller mutation, detached readonly result / 03.1,04.1 |

## 7. Завершение и release gates

Результаты V3-02: architecture EN/RU (signatures/schema/apply/lifecycle/decisions), catalogue EN/RU, этот plan EN/RU (migration/dependencies/acceptance/risks). Кратко обновить handoff и записи утверждённых требований, не копируя приватное обсуждение. Не переписывать историческое поведение HF-015 как будущее и не утверждать merge PR #29.

Проверки документации: relative links, идентичность TS blocks EN/RU, 17-code coverage по source literals, IDs решений/задач, strict TypeScript future declarations/examples в памяти, whitespace/diff и inspection списка только docs. Это consistency checks, не runtime implementation и не owner approval. Фактические результаты — в handoff; full runtime/build/audit/benchmark не входят в этот этап документации.

Перед релизом: использовать принятую спецификацию и точный helper/export ledger; выполнить отдельно разрешённые subtasks; мигрировать examples/consumers; пройти независимую A02/A03 security/correctness и измеренную A04 performance review; полные candidate gates и packed strict ESM/CJS, включая core без Luxon. Проверить publish workflow: future master version bump может запустить публикацию. В эту задачу входят только documentation commit/push и обновление Draft PR #30; version bump, merge, tag/release/npm publish исключены. Downstream adoption (включая PL-01 PR #29) вне релиза AdaptForm.

Статус интеграции документации: **READY_FOR_OWNER_REVIEW**. V3-02 и итоговые контракты/реестр из 30 строк имеют статус **ACCEPTED**; ODR-01–05 сохранены без изменений. Реализация не начата, V3-03 требует отдельного разрешения.
