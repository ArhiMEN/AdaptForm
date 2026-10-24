# HF-013 — зависимая валидация

[English](HEADLESS_DEPENDENCIES_USAGE.md) · [Русский](HEADLESS_DEPENDENCIES_USAGE.ru.md)

Принят и объединён в [PR #27](https://github.com/ArhiMEN/AdaptForm/pull/27). HF-015 добавляет [структурированные ошибки](HEADLESS_ERRORS.ru.md): выбранные зависимые правила могут возвращать объекты/массивы ошибок, не меняя планирование, touched/dirty или прежнюю очистку.

Реализованный исходный API этапа 2.3.0; версия пакета остаётся **2.2.0**, новой публикации npm нет. Это намеренно ограниченная реализация [HF-012](HEADLESS_DEPENDENCIES.ru.md): обычные свойства `Field` одной `Form`, с явной активацией.

## API и примеры

```ts
import {Field, Form, StringType} from 'adaptform'

class Registration extends Form {
  password = new Field(StringType)
  confirmation = new Field(StringType, null, {
    dependsOn: [{path: ['password']}],
    validate: (value: string, form?: Registration) =>
      !form || value === form.password.valueClear || 'Passwords differ',
  })
}

const form = new Registration()
const disable = form.enableDependencies() // After all subclass fields initialize; no validation
form.confirmation.rawValue = 'secret'
form.password.rawValue = 'different' // Automatically checks password and confirmation

form.batch(() => {
  form.password.rawValue = 'final'
  form.confirmation.rawValue = 'final'
}) // Each selected field's validation pipeline once, using final values

disable() // Idempotent; removes graph ownership, indexes and pending requests
```

Тип `FieldOptions.dependsOn` — `readonly DependencyRef[]`, где `DependencyRef` — `{readonly path: DependencyPath}`, а `DependencyPath` — `readonly [string]`. Путь содержит ровно одно буквальное имя свойства: `['a.b']` означает свойство с именем `a.b`, а не вложенный путь. Имена проверяются в runtime среди настоящих обычных Field. Повторные рёбра дедуплицируются. Зависимости относятся ко всему существующему pipeline target, включая `isRequired` и правила типа; порядок валидаторов и сообщений сохраняется.

Пример страны и почтового индекса:

```ts
class Address extends Form {
  country = new Field(StringType, 'CA')
  postalCode = new Field(StringType, null, {
    dependsOn: [{path: ['country']}],
    validate: (value: string, form?: Address) =>
      !form || form.country.valueClear !== 'US' || /^\d{5}$/.test(value) || 'Use five digits',
  })
}
const address = new Address()
address.enableDependencies()
address.setFields({country: 'US', postalCode: '12345'})
```

Повторная активация возвращает тот же disable callback без подсчёта ссылок. После отключения активация собирает новый граф и возвращает новый callback; старый callback не отключит новый граф. Подписки не требуются. Удаление подписок не отключает граф.

## Планирование и состояние

- Автоматическое присваивание проверяет source и target, достижимые по рёбрам source → target. Цепочки и ромбы используют стабильный топологический порядок; независимые узлы упорядочиваются свойствами Form. Несвязанные обычные поля не проверяются. Результаты false/string не пропускают зависимые проверки.
- Распространение запускают только изменившиеся **очищенные значения** с запросом автоматической проверки. Равные очищенные значения и записи, вернувшиеся к исходному очищенному значению, не требуют зависимых проверок; прямой запрошенный check выполняется. Изменение validation metadata не является источником зависимостей.
- Вложенные синхронные batch дают один проход графа на внешнем commit. `setFields()` сначала присваивает все данные, затем выбирает присвоенные обычные поля и достижимые target. `setRawValue(value, false)` и `setFields(data, false)` не порождают graph requests. Более ранний true-запрос проверяет конечное значение; реальное ребро другого source может выбрать подавленный target.
- `Form.checkValid()` остаётся полной немедленной проверкой в обычном порядке обхода. Явные Field checks немедленны и локальны. Они дополняют автоматические проверки; дедупликация относится к автоматическому проходу графа.
- Конечные snapshots фиксируются до callbacks подписчиков. Повторная запись из подписчика образует следующую транзакцию. Чтение snapshot не запускает валидаторы. Перепроверка target меняет validity/errors, не устанавливая touched или dirty.
- Без активации и при активном пустом графе автоматическое планирование сохраняет поведение 2.2.0. Constructor checks, цели/состав reset, touched, dirty/baselines, сериализация и optional Luxon не изменены.

## Конфигурация, исключения и чистота

Экспортируемый `DependencyConfigurationError` обозначает отсутствующие/неподдерживаемые пути, self/multi-node cycles, aliases/общие узлы и пересечение активных деревьев. Диагностика содержит имена свойств, но не значения полей. Активация сначала полностью компилирует конфигурацию, затем устанавливает владение; ошибка активации ничего не устанавливает. Активная Form резервирует своё дерево вложенности независимо от подписок, запрещая другому активному корню захватывать эти узлы. Внутреннее совместное использование узлов тоже отклоняется: фабрики должны создавать разные экземпляры.

Заменяйте декларации через поддерживаемый setter options:

```ts
form.confirmation.options = {dependsOn: [{path: ['password']}]}
form.confirmation.options = {dependsOn: []} // Remove this target's incoming edges
```

Изменения options внутри batch оцениваются по конечной конфигурации. Ошибка конфигурации сохраняет выполненные записи, завершает уведомления и выбрасывается до graph validators. Следующие автоматические проходы графа и полные проверки Form требуют успешной повторной компиляции. Исправьте options или отключите граф; искусственная field/global error не добавляется. После перехваченной ошибки конфигурации одного `isValid` недостаточно для подтверждения корректности графа.

Callbacks правил активного графа должны быть синхронными и чистыми. Библиотечные методы мутации/setters из required, type-specific или custom rules выбрасывают экспортируемый `ValidationMutationError` до применения записи. Это включает изменения других узлов, reset/baseline/errors и активацию/отключение графа. Engine может применять validation metadata target. Произвольные in-place JavaScript edits нельзя перехватить без Proxy; они запрещены контрактом. Legacy-валидаторы без активного непустого графа сохраняют прежнее поведение.

Исключения callbacks сохраняют записи; исходная ошибка batch callback приоритетнее ошибок validation/finalization/subscribers. Исключение валидатора останавливает его проход графа, завершает snapshots/уведомления и передаётся вызывающему коду. Полная проверка оставшихся target не обещается. Планирование и защита чистоты восстанавливаются для следующих транзакций.

## Намеренные ограничения

Нет зависимостей от коллекций, их элементов, вложенных Form, прямых node references, числовых/позиционных путей, `scope`, metadata или неявных чтений. Независимые Form могут включать собственные графы при непересекающихся деревьях вложенности. Коллекции рядом с обычными полями сохраняют legacy-правила валидации. Constructor checks коллекций, их рекурсивные проверки и явные checks не входят в дедупликацию автоматического прохода графа; гарантий межколлекционного планирования нет.

Произвольная замена/удаление свойств Form и in-place edits options/контейнеров не перехватываются. Используйте `field.options = ...`; после изменения свойств Form явно отключите и снова активируйте граф. Поддерживаемые методы коллекций согласуют владение графа, но не создают зависимости через границы коллекций. Нет Proxy, async validation, новых runtime-зависимостей, изменения reset или public breaking changes для неактивированных форм.

Engine согласует состав дерева и копирует очищенные значения при commit мутаций. Топология переиспользуется, пока имена свойств, идентичности узлов и readonly-массивов зависимостей не меняются; заменяйте декларации через setter options. Активация и компиляция изменённой конфигурации сканируют порядок обхода и могут занимать квадратичное время по числу полей. Гарантируется выборочное число вызовов валидаторов, а не константная стоимость записи; дальнейшая производительность больших графов остаётся отдельной задачей.
