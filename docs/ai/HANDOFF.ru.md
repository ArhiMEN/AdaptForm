# Передача работы

[English](HANDOFF.md) · [Русский](HANDOFF.ru.md)

## V3-03.3 I18N-01 — 2026-11-04

Статус: **PASS_WITH_RISKS**, готово к проверке владельцем, не приёмка этапа. V3-03.1 и V3-03.2 приняты для продолжения. Исходный HEAD: `17e8f5708372eb50c2bad6c8f3457e1b0405af27`; чистое дерево, существующая `feature/v3-runtime`, существующий [Draft PR #32](https://github.com/ArhiMEN/AdaptForm/pull/32). Среда первоначально открылась на `work` с master `9b3c773`; до реализации получена и открыта существующая удалённая ветка задачи. Этот handoff входит в отдельный коммит `feat: remove core validation message generation`; его SHA и CI итогового HEAD указаны в PR/отчёте. Версия остаётся **2.2.0**; зависимости, workflow, архитектура не менялись, merge, release, tag и npm publication не выполнялись.

Реализация и миграция:

- Required в Field и required/min_items/max_items коллекций возвращают только код/параметры каталога. Ошибка приведения сохраняет машинный invalid_type.expected. Встроенные типы уже возвращали ошибки каталога без сообщений. Значения required по умолчанию, empty/optional/cast gates, порядок type→custom, ранние выходы/обход коллекций, хранение источников, атомарная нормализация клиентских ошибок и валидность сохранены.
- Удалён messages из FieldOptions, StringOptions, NumberOptions, BooleanOptions, DateOptions, DecimalOptions, ArrayFieldOptions, ArrayFormFieldOptions и DateLuxonOptions. Удалены все девять экспортируемых интерфейсов: messagesOptions, messagesStringOptions, messagesNumberOptions, messagesBooleanOptions, messagesDateOptions, messagesDecimalOptions, messagesArrayFieldOptions, messagesArrayFormFieldOptions и messagesDateLuxonOptions. Нет aliases/заменяющих options. Логические настройки, включая Luxon inputFormat, сохранены. outputFormat/getTypeName ранее удалены в V3-03.1.
- Удалены русские defaults/templates и чтение message options из Field/коллекций; удалён аргумент fallback-message внутреннего customErrors. Legacy false по-прежнему даёт код custom, но без созданного сообщения. Новых интерпретаций результатов или bridges нет.
- ValidationErrorInput.message остаётся optional. Неизменённый нормализатор DTO сохраняет явные сообщения, включая `''`, не добавляет отсутствующий message, отделяет/замораживает ошибки и параметры и не создаёт display fallback. Server/manual сообщения сохраняются при клиентской проверке. Ошибка нормализации не приводит к частичной замене клиентских источников.
- Словари demo находятся в прикладном WeakMap, связанном с экземплярами полей/контейнеров, вне библиотечных options. Прикладной displayError использует code/params и эти словари; сохранены EN/RU переводы, индивидуальные тексты полей, сообщения коллекций и UI-взаимодействия. Форматтер не находится в src и не экспортируется; UI не повторяет правила валидации.
- Примеры (own-ошибки включают source): required изменён с `{code:'required',message:'Поле обязательно для заполнения',source:'type'}` на `{code:'required',source:'type'}`; минимум коллекции — с `{code:'min_items',message:'Значений должно быть не меньше 2',params:{min:2},source:'type'}` на `{code:'min_items',params:{min:2},source:'type'}`. Явный `{code:'app.rule',message:''}` сохраняется, добавляется только источник.

Тесты: **15 новых runtime-кейсов** (14 в `tests/unit/i18n-01.test.ts`, один regression demo); **22 существующих развёрнутых кейса / 16 объявлений тестов** адаптированы, включая уточнение только названия. Кейсы не удалялись: **834 / 37 файлов**, ранее 819 / 36. Новые негативные TypeScript-проверки охватывают удалённые экспорты (все девять), object literals Field/обеих коллекций/Luxon и отсутствие messages во всех options-интерфейсах. Сохранены зелёные проверки каталога, жизненного цикла V3-03.1/02, JSON budgets/security, числа вызовов callbacks и явных пользовательских сообщений.

Фактические локальные проверки на Node **24.19.0** / npm **11.9.0**:

| Команда | Результат |
| --- | --- |
| `npm ci` | PASS |
| `npm audit --audit-level=moderate` | PASS, 0 уязвимостей |
| `npm run lint` | PASS, 0 warnings/errors |
| `npm test` | PASS, 834 теста / 37 файлов |
| `npm run build` | PASS, ESM/CJS/declarations, оба entry |
| `npm run check:package` | PASS, 21 файл |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Изолированные consumers упакованного пакета вне репозитория проходят ESM/CJS ядра **без установленного Luxon**, затем оба optional Luxon loaders, на **Node 16.20.2 и 24.19.0**. Строгие NodeNext `.mts`/`.cts` consumers проходят с `skipLibCheck:false` и `exactOptionalPropertyTypes:true`, включая negatives удалённых message options. Публичные declarations не содержат messages options/интерфейсов. Node 16 проверяет собранный runtime, а не современные devDependencies. Временные скрипты/пакеты/consumers/логи не входят в коммит. CI итогового HEAD отдельно фиксируется в PR #32.

Оставшиеся совпадения поиска в src и ограничения:

- `BuiltinValidationError.ts`: message?:never запрещает текст встроенных ошибок. `ValidationError.ts`: optional message и проверки/копирование descriptor/type сохраняют ввод приложения; строковая ветка customErrors переносит явно возвращённый приложением текст, включая пустую строку. Во встроенных producers и публичных options нет formatter/locale/dictionary/code-to-text fallback.
- Legacy-контракт валидаторов остаётся ровно в `options.ts`: FieldOptions.validate, ArrayFieldOptions.validate и ArrayFormFieldOptions.validate. `ValidationError.ts::customErrors` всё ещё преобразует false→ошибка custom, string→custom с явным текстом, одиночный coded object→одна запись, непустой массив только coded objects→записи, прочие результаты→успех (включая неподдерживаемые JS Promise/некорректные массивы). Три точки вызова: `Field.checkValid`, `ArrayField.checkValid`, `ArrayFormField.checkValid`. Окончательная синхронная array-only валидация, отказ от legacy/Promise, purity и compute/commit относятся к V3-03.4 и последующей работе с коллекциями; новый runner не должен использовать этот helper.
- `ErrorsShema.ts`: ParsedError.message/комментарии, перенос строк в parseValidationErrors и legacy JSON.stringify нестроковых значений внешнего ответа в parseErrors/parseValidationErrors/parseErrorsDetailed не менялись. Это старые контракты parser внешних ответов, а не сообщения встроенных правил; новый parser явно исключён из задачи. **Риск:** буквальное утверждение об отсутствии любой генерации текста во всей библиотеке пока неверно из-за этой legacy-сериализации parser. Она устраняется в принятом V3-04 parser/cleanup, без нового fallback здесь.
- `dependencyScheduling.ts` / `DependencyGraph.ts`: аргументы message и англоязычные исключения — developer diagnostics конфигурации/мутаций, а не отображаемые ValidationError. Комментарии DecimalType о format описывают грамматику чисел; custom formats ErrorsShema описывают синтаксис путей. В src не найдены состояние локали, переводы, шаблоны сообщений или message options.

Далее требуется отдельное разрешение владельца: scalar runner V3-03.4, затем жизненный цикл коллекций/ODR-03, зависимости и последующие этапы parser/Apply. Удалена зависимость runner от message options; не реализованы validate():ValidationResult, полный обход/purity, ErrorsMapping/new parse, server Apply, revisions/operations или ODR-05. Следующий этап не начат; архитектурные решения не пересматриваются.

## V3-03.2: хранение по источникам и жизненный цикл ошибок — 2026-11-03

Статус реализации: **READY_FOR_OWNER_REVIEW**, не приёмка владельцем. V3-03.1 на `349e216fc5a0cb32e0997030266a63ce442d9c7e` принят для продолжения; это исходный SHA в `feature/v3-runtime`. Один отдельный коммит реализации `feat: implement source-partitioned error lifecycle` обновляет существующий [Draft PR #32](https://github.com/ArhiMEN/AdaptForm/pull/32). Итоговый SHA и CI итогового HEAD указаны в PR/отчёте поставки; этот handoff входит в тот же коммит. Пакет/зависимости/workflows и принятые ODR-01–05 не изменены; версия **2.2.0**. Merge, release, tag и публикация npm не выполнялись.

Хранилище и API:

- Внутренний `ErrorStore` владеет четырьмя независимыми неизменяемыми разделами в порядке `type → custom → server → manual`. Порядок внутри источника и повторные коды сохраняются. Кэш объединённого списка — производное readonly-представление, а не второй изменяемый источник истины. Все точки приёма используют нормализатор DTO/JSON params V3-03.1; клиентские разделы нормализуются вместе до замены любого из них. Неудачная замена сохраняет все установленные источники. Объекты вызывающего кода отделены и не замораживаются.
- Внутренний `ErrorNode` объединяет собственное хранилище, знание о клиентской проверке, явную очистку и распространение изменений по владельцам для Field/Form/коллекций. `errors` и `getOwnErrors()` возвращают одно readonly-представление собственных ошибок без path. Скалярный `getErrors()` читает собственные ошибки; Form/коллекции возвращают плоские readonly located-ошибки. Form обходит поля, затем собственные globals с `[]`; коллекции — собственные ошибки с `[]`, затем текущие элементы. Чтение не валидирует и не форматирует сообщения.
- `setErrors(readonly ValidationErrorInput[])` заменяет только собственные **manual**-ошибки, включая Form. Публичного аргумента source и импортёра ответов/путей больше нет. `clearErrors({sources?, recursive?})` по умолчанию очищает все собственные источники с `recursive:false`; очистка type/custom инвалидирует знание о клиентской проверке. Очистка только server/manual и `setErrors([])` сохраняют завершённую клиентскую проверку.
- Публичная установка server зависит от последующего этапа tokenized `applyServerErrors()`. В этой промежуточной ветке она намеренно недоступна. Внутренняя запись источника, отсутствующая в экспортах пакета, проверяет хранение/жизненный цикл server и предоставляет точку интеграции Apply; это не публичный импортёр и не мост совместимости. Существующие самостоятельные парсеры ErrorsSchema не изменены и ожидают своего этапа миграции.

Жизненный цикл и валидность:

- Клиентская проверка заменяет type/custom вместе и сохраняет server/manual. `checkValid()` и `checkAndSetValid()` на этом этапе по-прежнему возвращают boolean, теперь с учётом активных ошибок всех источников. Временный API результата validate не добавлен. Исключение проверки оставляет её маркер непроверенным, не заменяет установленные ошибки и не подтверждает старый успех.
- Фактическое изменение сравнивает и raw input после plugins, и clean value после cast по существующей политике равенства поддерживаемых значений. Оно очищает собственные источники и инвалидирует проверку, затем при необходимости валидирует. Разные некорректные raw с общим clean null и изменения raw-форматирования считаются изменением; эквивалентные значения сохраняют server/manual и успешную проверку при отключённой валидации. Поведение touched сохранено.
- Изменение листа очищает/инвалидирует содержащие коллекции, включая вложенные, независимо от подписок. Globals форм и ошибки соседних элементов сохраняются. Insert/remove/move очищают собственные ошибки затронутых коллекций; ошибки, ID и baseline сохранённых узлов следуют идентичности, пути используют текущие индексы. Замена отсоединяет старые узлы без сопоставления по значению. Чтение snapshots согласует внешние изменения состава/свойств, не сохраняя устаревшие связи владельцев ошибок.
- Reset рекурсивно очищает все затронутые источники и оставляет проверки неизвестными; сохраняются существующие правила состава/порядка и constructor reset targets. Прямой reset листа распространяет фактическое изменение значения на содержащие коллекции. `commitBaseline()` сохраняет ошибки/знание о проверке и только фиксирует clean baseline; dirty может стать false при сохранённых ошибках.
- Валидность Field вычисляется: есть собственная ошибка → false; ошибок нет и проверка неизвестна → null; успешная завершённая проверка текущего ввода → true. Контейнеры сохраняют boolean и требуют завершённых собственных проверок коллекции и проверенных/валидных потомков. Пустая Form различает отсутствие проверки и явную завершённую проверку. Изменяемого boolean валидности нет.
- Snapshots требуют собственные структурированные `errors`; дублирующие `validationErrors`, строковые errors, агрегированные `allErrors` и keyed `globalErrors` удалены. `itemIds` коллекций — обязательные readonly-массивы. Ошибки/params/пути/snapshots глубоко неизменяемы; эквивалентный итог сохраняет ссылки snapshots и не уведомляет. Существующие гарантии порядка «ребёнок → родители» и фиксации всех snapshots до callbacks сохранены; транзакционная модель ODR-05 не перерабатывалась.

Удалены: ErrorState, изменяемые `_errors`/сверка строк, автоматическое создание manual из правок текстового массива, `manualErrorSource()`/`withErrorSource()`, `error` скаляров/коллекций, маршрутизация ответов через Form `errors=`, setters с источником, keyed globals setters/readers/очистка и writable Field.isValid. Demo устанавливает явные ошибки приложения/manual и отображает структурированные данные, не подделывая server-происхождение.

Миграция тестов сверена с принятым ledger: 30 старых случаев импортёра Form/schema заменены 28 проверками границы парсера и явного manual-владения; утверждения о неявной маршрутизации/замене V2 больше не определяют runtime. Приоритет mapping, transforms, массивы, вложенность, fallback, null/неизвестные входы, повторные/большие ответы и сохранение значений остаются покрыты. Остальные старые проверки строк/overrides/мутаций теперь проверяют readonly-структуры или проекции отображения внутри тестов без обратной записи. Существующие количества вызовов/ранние выходы runner сохраняются как характеристика до этапа ODR-03. Добавлены **42** регрессии источников/жизненного цикла и негативные TypeScript-контракты; все регрессии params и типов V3-03.1 проходят.

Проверки на Node **24.19.0** / npm **11.9.0**, все PASS:

| Команда | Результат |
| --- | --- |
| `npm ci` | Чистая установка |
| `npm audit --audit-level=moderate` | 0 уязвимостей |
| `npm run lint` | 0 предупреждений/ошибок |
| `npm test` | 819 тестов / 36 файлов |
| `npm run build` | ESM, CJS, declarations, optional Luxon |
| `npm run check:package` | 21 файл |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Свежие packed consumers вне репозитория проходят ESM/CJS на **Node 16.20.2 и 24.19.0**: сначала core без установленного Luxon, затем optional Luxon. Строгие `.mts`/`.cts` NodeNext declarations проходят с `skipLibCheck:false` и `exactOptionalPropertyTypes:true`, включая негативные случаи удалённых API/readonly/params/обязательных ID. Node 16 проверяет собранный runtime; современные devDependencies работают на Node 24. Временные пакеты, consumers и логи не входят в коммит. Авторитетный результат CI итогового HEAD — в PR #32.

Ограничения/следующее разрешение: **V3-03.3** должен завершить I18N-01 для required/custom/коллекций и message options; фундамент type built-ins/typeId уже реализован. Legacy-интерпретация результатов option validators остаётся до этапа scalar runner; она не является хранилищем ошибок. Новый runner validate()/validateErrors() и purity, нулевые constructor/deferred callbacks и полный обход ODR-03, окончательная интеграция dependencies/snapshots, ErrorsMapping/новый schema.parse, tokenized server Apply, revision/operation fencing и транзакции ODR-05 относятся к следующим задачам. Произвольные внешние in-place изменения, как прежде, обнаруживаются при чтении без универсальной гарантии отслеживания revisions. Полный жизненный цикл V3, атомарный server apply и новые performance benchmarks не заявляются. Не начинать V3-03.3 до разрешения владельца.

## V3-03.1: фундаментальные контракты — 2026-11-03

Статус реализации: **READY_FOR_OWNER_REVIEW**, не приёмка владельцем. Ветка `feature/v3-runtime`, база — актуальный после fetch master `9b3c773563228614a755ff859ea6c518e21d9b77` (PR #30 интегрирован). Поставка — один коммит `feat: implement V3 foundational contracts`; его точный SHA определяется через [HEAD/историю ветки](https://github.com/ArhiMEN/AdaptForm/commits/feature/v3-runtime) и [Draft PR](https://github.com/ArhiMEN/AdaptForm/pulls?q=is%3Apr+head%3Afeature%2Fv3-runtime). Итоговый SHA указан в PR/отчёте поставки, поскольку этот handoff входит в тот же коммит. Версия пакета — **2.2.0**; merge, release, tag и публикация не выполнялись.

Доступные контракты:

- `FieldTypeContract<T,O extends object>` / `FieldTypeConstructor`; необязательный базовый `FieldType`, обязательный readonly непустой `typeId`, структурные реализации с собственными опциями и сохранённым выводом типов очищенных значений. Объекты опций, созданные реализацией, сохраняют идентичность/прототип. Шесть встроенных типов предоставляют восемь стабильных ID, включая readonly getters эффективного режима Date/Luxon. Неудачное приведение и защитные проверки invalid_type используют одни ID; нет определения через имя конструктора, alias getTypeName, старого моста validate или определения переопределений. Правила встроенных типов возвращают только code/params; использовавшийся только для сообщений Luxon outputFormat удалён. Поддерживаемая смена семантического режима инвалидирует успешную проверку.
- `ValidationError` без пути, `ValidationErrorInput`, `LocatedValidationError`, `ValidationErrorSource` (`type/custom/server/manual`) и `ValidationPath`; собственные ошибки Field/коллекций не содержат path. Агрегирование добавляет относительные пути; собственные глобальные ошибки Form агрегируются с `[]`. Повторные коды/порядок и отсутствующие/пустые сообщения сохраняются. `BuiltinTypeId`, `BuiltinErrorParams`, `BuiltinValidationErrorInput` проверяют встроенные производители по каталогу, не ограничивая коды приложения.
- `JsonValue`, `JsonObject`, `ErrorParams`, runtime `ErrorContractError` со стабильной причиной и замороженным диагностическим путём. Единый внутренний нормализатор обрабатывает существующие точки приёма ошибок до замены собственного хранилища: точный JSON-домен, конечные числа, -0→0, проверка дескрипторов/прототипов/циклов, безопасные выходные записи с null-прототипом, отделённое рекурсивное копирование/заморозка. Только плотные массивы; без getters/toJSON/преобразований. Повторные ациклические ссылки копируются/учитываются при каждом вхождении. Точные лимиты: глубина корня 0/максимум 32; 10000 посещённых узлов; 1048576 логических UTF-8 байт; 65536 UTF-16 единиц на строку/ключ. Rich values требуют явного преобразования в DTO приложением. Proxy не поддерживаются согласно спецификации.
- Только окончательный readonly тип `ValidationResult {valid:boolean}`. Существующие методы валидации узлов намеренно не переключены на него. Временный экспортируемый alias результата, публичный API нормализатора и новый механизм запуска валидации не добавлены.

Минимальная интеграция адаптирует типы существующих читателей/хранилищ/парсера ошибок к новым DTO и источникам, откладывает запись собственного хранилища до успешной нормализации DTO и переносит затронутое отображение demo в код приложения. Старые тесты удалённых методов/сообщений типов, источников client/external, локального path:[] и keyed глобальных агрегированных ошибок теперь проверяют принятые структуры V3. Все прежние тестовые случаи сохранены; проверки количества вызовов, отложенной гидратации, подписок, зависимостей и сериализации значений остаются.

Следующее разрешение: **V3-03.2**, хранение по источникам/знание о клиентской проверке и сохранение/очистка manual/server. Существующие строковая сверка ErrorState, setters с источником, внутренние keyed глобальные ошибки, изменяемая валидность, legacy-результаты валидаторов опций и строковые фасады snapshot ещё ожидают предусмотренной замены; новый мост не добавлялся. Legacy-генерация текстов required/коллекций/custom остаётся для V3-03.3; demo пока использует существующие message options как данные отображения приложения. Scalar validate/purity, обход ODR-03, интеграция зависимостей/snapshot, ErrorsMapping, schema.parse, атомарный Apply и revision/operation fencing относятся к последующим задачам. Этап не заявляет полную семантику V3 lifecycle/атомарного серверного применения/производительности. Принятые архитектура/решения не изменены; неразрешённых конфликтов спецификации или отклонений не обнаружено.

Проверки на Node **24.19.0** / npm **11.9.0**, все PASS:

| Команда | Результат |
| --- | --- |
| `npm ci` | Чистая установка |
| `npm audit --audit-level=moderate` | 0 уязвимостей |
| `npm run lint` | 0 предупреждений/ошибок |
| `npm test` | 779 тестов / 35 файлов; 59 новых тестов фундамента |
| `npm run build` | ESM, CJS, declarations, optional Luxon |
| `npm run check:package` | 21 файл |
| `npx tsc --noEmit -p tsconfig.json` | PASS |
| `npx tsc --noEmit -p tsconfig.test.json` | PASS |
| `npm run check:demo` | PASS |
| `npm run build:demo` | PASS |
| `git diff --check` | PASS |

Свежие packed consumers вне репозитория проходят ESM/CJS на **Node 16.20.2 и 24.19.0**: сначала core без установленного Luxon, затем optional entry point Luxon. Строгие `.mts`/`.cts` NodeNext consumers деклараций проходят с `skipLibCheck:false` и `exactOptionalPropertyTypes:true`, включая негативные случаи публичных контрактов. Node 16 проверяет runtime собранной библиотеки; современные devDependencies проверены на Node 24. Регрессии безопасности покрывают вложенные массивы/объекты, циклы/общие ссылки, опасные ключи, accessors/неперечислимые дескрипторы, прототипы/классы/разреженные массивы, запрещённые значения, полное глубокое отделение/неизменяемость и точные границы глубины/узлов/строк/UTF-8 байт. Временные пакеты/consumer fixtures/логи не входят в коммит. Следующее действие — проверить CI итогового HEAD PR и получить независимое ревью владельца до следующего этапа.

## Обслуживание npm audit — 2026-10-31

Ветка `fix/npm-audit-minimatch`, база master `670c6a0`: GHSA-g3hv-75wg-m249 затрагивает общий dev-only minimatch 10.2.6 через ESLint 10.12.0, @eslint/config-array 0.23.5 и @typescript-eslint/typescript-estree 8.71.2. Текущие upstream-диапазоны (включая последние совместимые версии потребителей) исключают исправленный major 11. Ограниченные overrides выбирают 11.0.1 только для этих потребителей; lockfile добавляет @isaacs/nonrecursive-glob-match 1.0.3. Удалённые API minimatch ими не используются; прошли 56 580 сравнений сопоставления и проверка идентичности результатов lint для 69 файлов. Прямые зависимости, runtime/API/версия/workflows и работы V3 не изменены.

Локально на Node 22.23.4/npm 10.9.9 прошли: чистый `npm ci`, audit (**0 уязвимостей**), lint, **720 тестов / 34 файла**, сборка библиотеки, проверка пакета (**21 файл**), TypeScript исходников/тестов/demo, сборка и выход demo. ESM/CJS/декларации побайтно совпадают с базой. Упакованное ядро без Luxon и отдельный Luxon entry point прошли ESM/CJS smoke-проверки валидации на Node 16.20.2 и 22.23.4. Библиотека по-прежнему заявляет Node >=16; существующим инструментам разработки нужен более новый Node. Далее: CI PR и ревью владельца без merge/публикации. Совместимость overrides ограничена проверенными потребителями; пересмотреть/удалить их после принятия исправленного minimatch upstream.
## Интеграция документации PR #29 — 2026-10-31

V3-02: **ACCEPTED** владельцем на `b041806ee35c56f55c0a0925e7d0de8b533f09bd`; ODR-01–05 окончательны. Результат интеграции: **READY_FOR_OWNER_REVIEW**. Ветка `docs/v3-02-specification`; существующий [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). [Матрица переноса](V3_DOCUMENTATION_INTEGRATION.ru.md) согласует все шесть файлов PR #29 в 33 строках.

Перенесены полные правила эскалации legacy/обходов из AGENTS и исходное направление DECISIONS; явно включены архитектурные отклонения и приоритет принятого V3-02. Обновлены статус приёмки и происхождение architecture/catalogue/plan EN/RU; сохранены исторические A01–A04 и release/downstream gates. Все 30 решений реестра, ODR-01–05 и будущие контракты неизменны. PR #29 остаётся открытым Draft на `aab14d29b428c57cabb9ec5ceb069fcc5adaba6e`, его ветка не изменена.

Фактические проверки PASS: scratch-only `python /tmp/adaptform-doc-integration/check_docs.py` — 517 assertions, 232 относительные ссылки/якоря, точный список 14 файлов, EN/RU blocks/IDs/структура таблиц и заголовков, все 33 строки переноса, четыре дословных правила AGENTS и четыре исходных пункта DECISIONS на язык. Точное сравнение с принятым HEAD подтверждает сохранность 30 строк реестра, пяти строк ODR, описаний утверждённых решений, нормативных разделов контрактов и 14 TypeScript-блоков. TypeScript 5.9.3 strict/noEmit/exactOptionalPropertyTypes/skipLibCheck:false проходит для всех 14 блоков и 19 проверенных отрицательных случаев с ambient Form/Field scaffold; это проверка будущих сигнатур/примеров, не runtime. Сохранность истории и `git diff --check` — PASS. Проверочные скрипты и сгенерированные файлы находятся только в `/tmp`, исключены из коммита.

Изменены AGENTS EN/RU; docs/ai/{DECISIONS,HANDOFF,V3_ARCHITECTURE,V3_ERROR_CODES,V3_DOCUMENTATION_INTEGRATION} EN/RU; docs/roadmap/v3.0.0/PLAN EN/RU — 14 Markdown-файлов. Runtime/tests/dependencies/version/CI не затронуты. Runtime suites/builds/audit/benchmarks для этой задачи не запускались; исторические результаты ниже не являются текущими проверками.

Неразрешённых содержательных конфликтов нет. Далее: проверка интеграции документации владельцем; приёмка V3-02 уже записана. Рекомендовано закрыть PR #29 как заменённый только после приёмки интеграции; в этой задаче его не закрывать. V3-03 требует отдельного разрешения. Разрешены один обычный коммит/push и обновление Draft PR #30, без force push, merge в master или публикации npm.

## Финализация V3-02 / ODR-01–05 — 2026-10-28

Историческая запись финализации до приёмки на `b041806ee35c56f55c0a0925e7d0de8b533f09bd`. Упоминания ожидаемой приёмки и неинтегрированного PR #29 относятся к 2026-10-28 и заменены записью 2026-10-31 выше; прежние результаты проверок сохранены.

**READY_FOR_OWNER_REVIEW**. Все пять решений владельца утверждены, открытых ODR по этой задаче нет; спецификация ожидает приёмки. Ветка docs/v3-02-specification, исходный HEAD 96a82c8f015ff34115e192b0c3947d50052b2ebf, чистые index/tree; существующий [Draft PR #30](https://github.com/ArhiMEN/AdaptForm/pull/30). [Архитектура](V3_ARCHITECTURE.ru.md), [17-code catalogue](V3_ERROR_CODES.ru.md), [полный legacy ledger/задачи/риски](../roadmap/v3.0.0/PLAN.ru.md) и EN companions согласованы.

ODR-01: typeId, восемь IDs шести built-ins/modes, без getTypeName alias. ODR-02: точный JSON-domain, глубокие checks/detach/freeze/пределы и rich-params migration. ODR-03 B: ноль constructor/deferred callbacks, граница завершения, full explicit traversal и local structural counts. ODR-04: финальный REMOVE/REPLACE/KEEP, один parser/explicit config, ErrorsMapping composition, trace, own/aggregate readers и required itemIds. ODR-05 A: атомарный staged commit, отдельные retained pending/delivered diagnostic reports, точный порядок/nested batch и fault matrix. Контракты будущие; runtime не менялся.

Фактические проверки PASS: scratch-only `node work/check-docs.mjs` — 342 consistency assertions, 190 relative links/anchors, EN/RU TS/IDs/tables/headings, 17 source codes, восемь type/mode IDs, 30 строк legacy ledger и точный allowlist 10 files. TypeScript 5.9.3: 14 Markdown blocks, strict/noEmit/exactOptionalPropertyTypes, 19 negative cases; ambient Form/Field scaffolding проверяет будущие сигнатуры/примеры, не runtime. Проверены сохранность исторических HANDOFF/DECISIONS и отсутствие открытых ODR-противоречий. `git diff --check` — PASS. Checker/scripts находятся только в scratch, не включены в коммит; runtime suites/builds/audit/benchmarks не запускались.

Изменены только 10 разрешённых Markdown files; runtime/tests/dependencies/version/workflows/AGENTS и исторические audit/test results неизменны. PR #29 не изменён/не интегрирован; исходный draft head aab14d29b428c57cabb9ec5ceb069fcc5adaba6e. Разрешены один documentation commit/push и обновление Draft PR #30; без force push/merge/release. Далее — приёмка спецификации владельцем и отдельное разрешение V3-03; не начинать реализацию автоматически.

## Проверка HF-015 — 2026-10-28

PR #28, ветка `hf-015-structured-validation-errors`, master/base `b9051dd`, исходный проверенный head `66fcbd8`. **PASS_WITH_LIMITATIONS**: исправлены утечка происхождения между узлами/ключами, публикация глобальных ошибок с именами прототипа и заморозка результатов моста пользовательского парсера. **720 тестов / 34 файла**, lint, source/test/demo types, library/demo builds, package integrity, packed strict NodeNext ESM/CJS без Luxon и diff checks проходят. Повторные полные/парные benchmarks сохраняют измеримую цену коллекций и около 0.3 MiB дополнительного heap; счётчики правил/уведомлений совпадают с master. Audit продолжает блокировать CI из-за dev-only undici 7.29.1; предложен отдельно согласуемый override 7.30.1, зависимости/workflows не менялись. [Проверка, исходные данные, ограничения и точный план](../roadmap/v2.3.0/ERRORS_REVIEW.ru.md). Далее: CI итогового head и независимая приёмка; отдельно решить audit до merge. Версия 2.2.0; merge/публикация/tag/удаление веток не выполнялись.

## HF-015 — 2026-10-24

[PR #28](https://github.com/ArhiMEN/AdaptForm/pull/28) открыт в master. [CI #40082508903](https://github.com/ArhiMEN/AdaptForm/actions/runs/40082508903) на `69f0878` завершился FAIL на Audit dependencies: undici, 1 high + транзитивный moderate jsdom; последующие проверки пропущены. Это подтверждено логами, не ошибка тестов HF-015. Для последующих documentation-only коммитов актуальны [проверки PR](https://github.com/ArhiMEN/AdaptForm/pull/28/checks).

Ветка `hf-015-structured-validation-errors` от актуального master `b9051dd`; исходники `1af1a2b`, тесты `37ba83d`, оптимизация пустого чтения `934b378`. Версия **2.2.0**, package/lockfile/dependencies без изменений. HF-011 принят в PR #25, PERF-01 — #26, ограниченный HF-013 — #27. [Контракт ошибок](HEADLESS_ERRORS.ru.md) описывает упорядоченные code/message/params/path/source, чтение getErrors, старый строковый фасад, новые результаты валидаторов и дополнительный серверный импорт. Старые setter/парсер/трансформеры и политика очистки сохранены; snapshots добавляют необязательные собственные validationErrors.

Финальные локальные проверки: **711 тестов / 33 файла** (51 новая регрессия), lint, TypeScript исходников/тестов/демо, сборки библиотеки/демо, пакет (21 файл), свежие упакованные ESM/CJS и строгие NodeNext declarations без установленного Luxon, ссылки/EN-RU примеры и diff — PASS. **npm audit FAIL**: существующая high-уязвимость undici 7.29.1 воспроизводится на нетронутом master с тем же lockfile; production-only audit сообщает 0. [Полные проверки, сырые бенчмарки и цена модели](../roadmap/v2.3.0/ERRORS_VERIFICATION.ru.md): парное сравнение на 1000 узлах показывает около 9% цены неизменённого snapshot и 8–10% операций коллекций; полный harness содержит большие колебания. Измерения не доказывают отсутствия замедления/утечек; дополнительные метаданные требуют памяти.

Следующий шаг: приёмка PR в master и независимое review, проверка CI с учётом существующего audit-блокера. Новый серверный вход включается явно; глобальные ошибки сохраняются при изменении значений, старый allErrors не начинает объединять ошибки scalar-элементов. Изменяемые legacy-массивы согласуются при чтении и не получают Proxy/автоматических уведомлений. HF-014/016/017 не реализованы. Без merge, публикации, изменения версии, тега или удаления веток. Записи ниже исторические и не означают, что HF-011/013 ещё не объединены.

## HF-013 — 2026-10-21

Ветка `feature/v2.3.0-dependent-validation`, база master `30a45a2` (PR #26), реализация `654b162`. Пакет остаётся **2.2.0**. [Реализованный API EN/RU и ограничения](HEADLESS_DEPENDENCIES_USAGE.ru.md): необязательный `dependsOn: [{path: ['fieldName']}]`, явный `enableDependencies()`/идемпотентное отключение, выборочная проверка всего pipeline, детерминированные цепочки/ромбы, подавление/дедупликация batch, атомарные snapshots и ошибки конфигурации/чистоты. Подписки не требуются. Неактивированные формы сохраняют legacy-поведение.

Финальные локальные проверки: **660 тестов / 32 файла** (606 исходных + 54 случая), включая 53 целевые регрессии зависимостей и проверки ограниченных declarations/вывода типов значений; `npm run lint`; TypeScript исходников/тестов (`npx tsc --noEmit -p tsconfig.json` и `tsconfig.test.json`); `npm run check:demo`; сборки библиотеки/демо; `npm run check:package` (**21 файл**); `npm audit --audit-level=moderate` (**0 уязвимостей**); ссылки документации/примеры EN-RU и `git diff --check`. Свежий packed-пакет проходит ESM/CJS runtime и strict NodeNext declaration consumers без установленного Luxon. Локальная проба batch на 1000 полях выбрала **2 валидатора вместо 1000**; время зависит от окружения и не является общей гарантией ускорения.

Ограничения: только прямые обычные Field одной Form; без зависимостей коллекций, прямых ссылок, позиционных/вложенных путей и async. Рекурсивные/constructor checks коллекций и явные проверки не входят в дедупликацию автоматического прохода графа. Opt-in callbacks должны быть чистыми; ошибки конфигурации сохраняют записи и требуют успешной пересборки. Поддерживаемая замена options отслеживается; произвольные property/in-place edits — нет. Топология переиспользуется при неизменных декларациях; активация/перекомпиляция может быть квадратичной, согласование состава/сравнение значений по-прежнему обходят дерево. Общие узлы и пересечение активных деревьев отклоняются. Далее: CI финального коммита PR и независимое ревью. Слияния, публикации, повышения версии, тегов и удаления веток не было.

## PERF-01 — 2026-10-21

Ветка `feature/v2.3.0-performance`, база master `7d9a13b` (PR #25), пакет **2.2.0**. [Отчёт EN/RU о производительности](../roadmap/v2.3.0/PERFORMANCE.ru.md) сохраняет исходные данные до/после: неизменённый snapshot 1000 полей **6,4259 → 1,3986 мс**, запись поля с подписчиком **7,5920 → 2,7286 мс**, add/remove 1000 форм **297,7387 → 13,4752 мс**. Локально прошли **606 тестов / 31 файл**, lint, типы исходников/тестов/демо, сборки библиотеки/демо, пакет (21 файл), аудит 0 и diff. Публичное поведение и обнаружение внешних изменений сохранены; чтения проверяют потомков, валидация полная, heap после прогрева выше. Далее: CI финального коммита PR и ревью. Слияния, публикации, повышения версии, тегов и удаления веток не было.

## Foundation STAB-01/02 + HF-011/012 — 2026-10-20

Ветка `feature/v2.3.0-foundation`, база master `9942aac`; пакет остаётся **2.2.0**. STAB-01: **54 → 0** диагностик тестовых типов, regression type tests и CI gate. STAB-02: воспроизводимые Node benchmarks и детерминированные тесты lifetime подписок; add/remove наблюдаемой коллекции из 1000 элементов остаётся дорогим (около 164/245 мс в повторе foundation). HF-011: weak identity по объекту, optional snapshot itemIds, insert/move без сопоставления значений в setters замены. HF-012: **только спецификация**, без dependency engine и Proxy; до HF-013 нужны решения владельца.

Коммиты этапов: STAB-01 `51dc501`, STAB-02 `b3974fe`, HF-011 `23b88bc`; HF-012 — сопровождающий documentation commit. Финальные локальные проверки: **591 тест / 30 файлов**, lint, source/test/demo types, library/demo builds, содержимое пакета (21 файл), audit 0 и diff прошли. Consumers собранных ESM/CJS declarations и изолированное ядро packed-пакета без Luxon прошли. Согласованные Luxon loaders работают; прежнее ограничение cross-loader instanceof документировано. Registry preflight через cloud proxy подтверждает skip опубликованной 2.2.0. См. [milestone](../roadmap/v2.3.0/PLAN.ru.md), [проверки](../roadmap/v2.3.0/VERIFICATION.ru.md), [бенчмарки](../roadmap/v2.3.0/BENCHMARKS.ru.md), [идентичность](HEADLESS_COLLECTION_IDENTITY.ru.md), [предложение зависимостей](HEADLESS_DEPENDENCIES.ru.md).

Далее: проверить CI финального head и независимо рассмотреть единственный интеграционный PR, затем утвердить вопросы HF-012. Identity metadata делает перестановку/замену равного содержимого видимой snapshot; dirty зависит от содержимого. Существующие touched/reset/commitBaseline, setters, JSON/FormData и optional Luxon сохранены. Нет HF-004/HF-013+, version bump, npm publication, merge, тегов, релиза и удаления веток. CI/PR URL и итоговый SHA фиксируются в отчёте доставки; локальный handoff не заявляет преждевременно remote checks. Исторические разделы ниже описывают прежние состояния source.

## Обновление демо опубликованной 2.2.0 — 2026-10-19

- GitHub Pages уже собирался из исходников 2.2.0, но на странице оставалась маркировка 2.1.0. Отдельный PR обновляет версию в шапке, метаданных и подвале до **опубликованной 2.2.0** и добавляет интерактивный стенд состояния Form: dirty/baseline, подписки, неизменяемые snapshots и уведомления синхронного batch.
- Двуязычное руководство и переводы сайта обновлены. `.github/workflows/deploy-demo.yml` автоматически публикует сайт **только из master**: сохранённая историческая ветка `v2.1.0` больше не сможет перезаписать актуальную страницу. Демо по-прежнему импортирует `../src/index`; runtime/API не менялись.
- CI PR: 566 тестов в 27 файлах, lint, TypeScript, сборки пакета/демо и аудит 0. Развёртывание GitHub Pages требуется проверить после merge. В npm `adaptform@2.2.0` уже опубликована, повторный выпуск при изменении демо не требуется. Известные 54 диагностики отдельного test-tsconfig вне задачи.

## Подтверждённая npm-публикация 2.2.0 — 2026-10-19

- **Опубликована** версия `adaptform@2.2.0` через npm OIDC Trusted Publisher `ArhiMEN/AdaptForm` / `publish-npm.yml`. Проверка точной версии в реестре успешна. [GitHub Actions #39209185356 (повторный запуск)](https://github.com/ArhiMEN/AdaptForm/actions/runs/39209185356) прошёл: сборка, проверка пакета и `npm publish` PASS; логи подтверждают `+ adaptform@2.2.0`, dist-tag `latest` и подписанный provenance ([Sigstore](https://search.sigstore.dev/?logIndex=3319507230)). Первые попытки падали из-за отсутствия dist (исправлено PR #21) и ENEEDAUTH до регистрации Trusted Publisher (PR #22 убрал заглушку токена). Успешный повторный запуск использовал сохранённую настройку npm без токенов.
- **Текущая настройка:** переменная GitHub `NPM_PUBLISH_ENABLED=true` (её работа подтверждена успешной публикацией), успешный CI после push в master запускает выпуск, preflight пропускает уже существующие версии. UI npm может обновлять `latest` с задержкой. GitHub Release, тег и удаление веток не выполнялись.
- Двуязычные документы и примеры обновлены отдельным PR после публикации. 54 прежние диагностики типов тестов и вопрос производительности остаются отдельным техническим долгом.

## Исходники 2.2.0 приняты в master — 2026-10-19

- [Release PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18) прошёл независимое ревью и **объединён** как `f717b8d590d1b753d5958b2ba19aa1b3e3aeef0a`. Версии в `package.json` и корневой записи lockfile — **2.2.0**; CHANGELOG, README, контекст и выпускные документы согласованы EN/RU. В PR #18 не менялись production-код, зависимости и workflow публикации.
- [CI кандидата #39198931542](https://github.com/ArhiMEN/AdaptForm/actions/runs/39198931542) и GitGuardian — PASS: **563/563 теста**, 27 файлов, lint, типы библиотеки/демо, ESM/CJS/declarations, package check, сборка демо и аудит 0. После merge [CI master #39199058088](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058088) — PASS, [демо #39199058150](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199058150) — PASS, [npm publish #39199123153](https://github.com/ArhiMEN/AdaptForm/actions/runs/39199123153) — **SKIPPED**.
- [Проверочный список](../roadmap/v2.2.0/RELEASE.ru.md) содержит закрытые проверки исходников и отметку об отсутствии публикации npm. Долг: 54 старые диагностики типов тестов, отсутствие benchmark snapshots; HF-004/reinitialize/HF-011+ исключены. Следующий этап — отдельное решение (публикация npm или следующий HF-блок). Ветки сохранить; тег/GitHub Release не создавались.

## Подготовка кандидата AdaptForm 2.2.0 — 2026-10-19

- **Рабочая ветка:** `release/v2.2.0-preparation` от master с принятыми HF-005–HF-010. В `package.json` и корневых записях `package-lock.json` готовится версия **2.2.0**; production/API/зависимости не меняются. Версия **не опубликована в npm**, последняя отдельно проверенная `latest` — 2.1.0.
- **Документы:** согласуются README/CHANGELOG EN/RU, [проверочный список](../roadmap/v2.2.0/RELEASE.ru.md), руководство/контракт состояний и дорожная карта. Принятая реализация HF-005–HF-010 уже прошла **563 теста в 27 файлах**, lint, TypeScript, ESM/CJS/DTS, сборки демо и аудит 0. Кандидат PR/CI требует независимой проверки перед merge.
- **Ограничения:** 54 старые диагностики `tsconfig.test.json`, reset отличается от commitBaseline, производительность snapshots отдельно не измерялась, нет `reinitialize()`, HF-004 или HF-011+. Не создавать теги/GitHub Release, не публиковать npm и не менять переменные публикации; после merge проверить итог workflow.

## Принятие HF-005–HF-010 — 2026-10-19

- После независимого ревью и исправления HF-009 [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) **объединён в master** squash-коммитом `e6b596de5eceecf2c235000f3d683d4a745cb44e`. Рабочая ветка сохранена.
- Итоговый PR head `1db4ab5`: 563/563 теста, 27 файлов, lint, source/demo typechecks, ESM/CJS/TS build, package check, audit (0), GitGuardian — PASS. Повторно подтверждены [CI master #39197203071](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203071) и [демо #39197203110](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197203110) — PASS. [Публикация npm #39197250143](https://github.com/ArhiMEN/AdaptForm/actions/runs/39197250143) — SKIPPED.
- HF-005–HF-010 приняты: baseline/dirty, подписки/snapshots, batch и вложенные уведомления. Версия исходного пакета в master остаётся **2.1.1**; 2.2.0 не выпущена в npm. Следующий этап — **отдельное решение о подготовке релиза 2.2.0**, а не HF-011 автоматически. HF-004/reset и reinitialize остаются вне данного объёма; 54 старые диагностики test-tsconfig сохраняются.

**Исторический отчёт до приёмки / Historical pre-acceptance handoff:**

Интеграционный [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16) открыт в master; ветка отправлена. Результаты финального head — в [проверках PR](https://github.com/ArhiMEN/AdaptForm/pull/16/checks). Merge/публикация не выполнялись.

CI реализации на `e067a34` пройден: [запуск #39153919017](https://github.com/ArhiMEN/AdaptForm/actions/runs/39153919017); GitGuardian пройден. Это исторические проверки; результаты текущего head доступны в PR.

## Исправление ревью PR #16 — 2026-10-19

- `ArrayField` и `ArrayFormField` направляют автоматические проверки `remove()`/`clear()` через `validateAfterMutation()`. Завершение batch использует контекст владеющей Form один раз; синхронная валидация вне batch и явный `checkValid()` сохранены.
- Добавлен `tests/unit/headless-collection-batch.test.ts`: **34 проходящих случая**, включая batch только с коллекцией/изменение соседей, вложенное владение/batch, исключения callback/восстановление, явные проверки, устранение повторных вызовов и атомарные уведомления.
- Последние локальные проверки: **563 теста в 27 файлах прошли**; lint, typecheck исходников/demo, build библиотеки/demo, package check (21 файл), audit (0 уязвимостей), выход demo и diff прошли.
- `tsconfig.test.json` по-прежнему завершается с кодом 2 и **54 прежними диагностиками**. Сравнение с нетронутым архивом `33717f2` на тех же зависимостях: нормализованная последовательность файл/позиция/код и кратность совпадают; новых диагностик нет. Сохраняются три известных различия структурных сообщений. Тесты/проверки не отключались.
- Следующее действие: проверить CI/GitGuardian отправленного исправления и повторно отревьюить HF-009 в существующем PR. Остальные контракты HF-005–HF-010, пакет 2.1.1, зависимости и reset не изменены. HF-011 не начат; новый PR и merge не выполняются.

## Фундамент HF-005–HF-010 — 2026-10-18

**Все шесть задач реализованы; независимое ревью выявило блокер HF-009, локально исправленный и ожидающий повторного ревью.** Одна разрешённая ветка: `feature/v2.2.0-headless-state-foundation`, база master `33717f2a88f04a3ad9c454b0477e52b299147432`. Версия пакета остаётся **2.1.1**, manifests/зависимости не изменены. Merge, удаление веток, теги, релиз и npm-публикация не выполнялись.

- [Контракт EN/RU](HEADLESS_STATE_CONTRACT.ru.md): жизненный цикл, baseline/reset, touched/dirty, совместимость и отложенное предложение reinitialize.
- [Примеры EN/RU](HEADLESS_STATE_USAGE.ru.md): подписки, представления snapshot, проверки/исключения batch, ограничения.
- [Проверки EN/RU](../roadmap/v2.2.0/VERIFICATION.ru.md): команды и журнал этапов; [план 2.2.0](../roadmap/v2.2.0/PLAN.ru.md) фиксирует оставшиеся условия релиза.

| Задача | Коммит | Результат |
| --- | --- | --- |
| HF-005 | `6cd1b11` | Контракт состояний и совместимости с 2.1.1 |
| HF-006 | `79f0345` | Baseline очищенного Field, isDirty, commitBaseline |
| HF-007 | `0df2b02` | Производный dirty Form/коллекций, baseline гидратации |
| HF-008 | `b9ed34a` | Общий ObservableNode, замороженные snapshots, подписки |
| HF-009 | `297bd47` | Вложенный sync batch, итоговая проверка, исключения |
| HF-010 | `7883269` | Передача изменений, очистка удаления/последней отписки, повторные изменения callback |
| Усиление | `c81575b` | Общие встроенные значения/разреженные массивы и дополнительные регрессии исключений/async |

Финальное ревью также проверяет симметричность при изменении общих ссылок структурированных значений и уведомления при очистке серверных ошибок пустой вложенной формы. Перед каждым коммитом реализации прошли точечные тесты, lint и source typecheck. Проверки фундамента 2026-10-18: **529 тестов прошли (26 файлов, 52 новых случая)**; lint, source typecheck, build библиотеки, проверка пакета (21 файл), typecheck/build demo, audit (0 уязвимостей), runtime ESM/CJS и декларации новых API проходят. git diff --check пройден.

`tsconfig.test.json` **по-прежнему падает с 54 прежними диагностиками**. Последовательность файл/позиция/код/кратность совпадает с нетронутым master; три старые структурные ошибки перечисляют больше отсутствующих свойств Form из-за расширения API. Отдельный потребитель прежнего mapped type fieldsValue получает TS2589 и здесь, и на отдельно собранном архиве master. Декларации новых snapshot/subscription/batch проходят strict NodeNext ESM/CJS. Проверки/тесты не отключались.

## Архитектура и совместимость

Field владеет кешированными очищенными значениями и независимым baseline. Form выводит dirty из узлов, коллекции сравнивают упорядоченное содержимое и dirty потомков. Общий синхронный механизм операций обновляет все затронутые snapshots до внешних callback. Родительские связи включаются при подписке и обновлении состава; удаление/последняя отписка их освобождают. Batch откладывает автоматическую проверку до одной проверки участвующего предка; явные валидаторы выполняются сразу. Исключения сохраняют записи, завершают уведомления и передаются вызывающему. Ошибка callback имеет приоритет над ошибками завершения.

Сохранены touched (включая setRawValue(value, false)), validity/errors, конструкторы/плагины, состав/цель reset, сериализация и необязательный Luxon. allErrors копирует массивы потомков, предотвращая накопление ошибок при чтении и заморозку живых массивов snapshot. UI-зависимостей нет.

Ограничения: snapshot использует безопасный union неизменяемых данных; произвольные классы непрозрачны. Snapshots собираются/сравниваются повторно; вложенность/принадлежность batch может стоить больше одного линейного обхода. Внешние внутренние изменения прежних массивов/значений/options и произвольная замена свойства Form не перехватываются. Вложенность — прежний ArrayFormField; циклическое владение и мутирующие валидаторы не поддерживаются. Тесты проверяют очистку связей/изоляцию удалённых узлов; универсальные GC/benchmark гарантии не заявляются.

HF-004/HF-011+ не реализованы. reinitialize — только предложение. Владельцу: независимое ревью по коммитам, принятие документированных аддитивных границ snapshot/batch, отдельное решение по прежнему долгу типов, затем отдельно разрешённая подготовка релиза. Не начинать следующие задачи автоматически, не выполнять merge/публикацию.

## Предыдущая база

HF-001, HF-002 ([PR #10](https://github.com/ArhiMEN/AdaptForm/pull/10)) и HF-003 ([PR #12](https://github.com/ArhiMEN/AdaptForm/pull/12)) приняты. Подготовка исходников 2.1.1 объединена в [PR #14](https://github.com/ArhiMEN/AdaptForm/pull/14); npm publish был пропущен. Новых заявлений о публикации registry эта работа не делает. План 2.2.0 вошёл в master через PR #15; текущее задание отдельно разрешило общую реализацию без разрешения релиза.
