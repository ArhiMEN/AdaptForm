# Использование headless-состояний

[English](HEADLESS_STATE_USAGE.md) · [Русский](HEADLESS_STATE_USAGE.ru.md)

HF-005–HF-010 прошли независимое ревью и объединены в [PR #16](https://github.com/ArhiMEN/AdaptForm/pull/16). **Кандидат исходников 2.2.0** объединён в master ([PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18)), и **опубликован в npm как 2.2.0** через OIDC Trusted Publisher; см. [проверочный список релиза](../roadmap/v2.2.0/RELEASE.ru.md). Полная семантика и совместимость: [контракт](HEADLESS_STATE_CONTRACT.ru.md).

```ts
import {Form, Field, StringType, NumberType} from 'adaptform'

class Profile extends Form {
  name = new Field(StringType, 'Alex')
  age = new Field(NumberType, 25)
}

const form = new Profile()
const unsubscribe = form.subscribe(() => {
  const state = form.getSnapshot()
  render(state.fieldsValue, state.isValid, state.allErrors)
})

form.batch(() => {
  form.name.rawValue = 'Alexandra'
  form.age.rawValue = 26
})
// One root notification, after final validation. Direct child edits also notify.
form.name.setRawValue('Alex', false) // Still touched; validity becomes null.
form.commitBaseline()              // Commit values without changing errors/touched.
unsubscribe()                      // Call when the UI consumer is disposed.
```

render — код приложения, не зависимость ядра. subscribe, getSnapshot, isDirty и commitBaseline доступны Field, Form, ArrayField и ArrayFormField; публичный batch — у Form. Подписка не вызывает listener сразу: начальное состояние читается через getSnapshot(). Две регистрации одного callback независимы; отписка идемпотентна. Исключение listener не мешает остальным, первое исключение передаётся после завершения уведомлений. Изменения из listener идут следующим синхронным циклом; текущие callback читают текущий завершённый snapshot.

Snapshots содержат только неизменяемые данные. Field предоставляет rawValue, valueClear, errors, isValid, isTouched, isDirty. Form — fieldsValue, allErrors, globalErrors, fields и общие флаги; коллекции — значения, snapshots потомков, ошибки коллекции и флаги. Интерфейсы snapshots и SnapshotValue экспортируются. Элементы fields формы имеют безопасный union типов узлов: перед чтением специфичного свойства требуется сужение типа. Значения представлены union SnapshotValue; минимальный API не обещает исходный изменяемый T в snapshot.

Date превращается в {kind: 'Date', timestamp: milliseconds}, Luxon — {kind: 'DateTime', iso: ...}. Map/Set — {kind, entries}, бинарные контейнеры — {kind, bytes}, RegExp — {kind, source, flags}. Обычные объекты/массивы обходятся рекурсивно, циклы сохраняются; неподдерживаемые экземпляры, символы и функции — {kind: 'Opaque', type: ...}. Непрозрачные описания не различают все экземпляры одного класса. Исходные значения доступны через getters модели и сериализацию; представление snapshot не меняет toJSON()/toFormData().

Автоматические уведомления обеспечивают методы/setters библиотеки. Внутренние мутации прежних массивов items/forms/errors, options, изменяемых значений и произвольная замена свойств Form не перехватываются. Для уведомления используйте поддерживаемые присваивания; повторное чтение обновит snapshot. Вложенность использует прежнюю модель ArrayFormField; произвольные свойства со значением Form не включаются в сериализацию и обнаружение полей.

## Batch и проверки

```ts
try {
  form.batch(() => {
    form.name.rawValue = 'Saved locally'
    throw new Error('stop')
  })
} catch {
  // The completed write stays; validation and notification finalization ran.
}
```

Batch синхронен, поддерживает вложенность и возвращает результат callback. Promise запрещён сигнатурой TypeScript и проверяется во время выполнения. Асинхронная работа не планируется. Если batch запрашивает хотя бы одну автоматическую проверку, участвующая внешняя Form проверяется один раз после присваиваний, включая остальные поля. validate=false подавляет запрос данной операции, но не отменяет итоговую проверку, запрошенную другой операцией. Batch только с отложенными присваиваниями не проверяет. Несвязанные узлы сохраняют собственные отложенные проверки. Вложенные формы, покрытые родителем, проверяются через него, без дублирования.

Явные checkValid()/checkAndSetValid() выполняются немедленно и могут видеть промежуточные значения модели. Чтение snapshot внутри batch сохраняет прежнюю ссылку; getters модели показывают выполненные записи. Batch с равным итоговым состоянием не уведомляет. Отката нет. Исключение callback имеет приоритет над ошибками проверки/listener; иначе ошибки завершения передаются вызывающему. Следующие batch работают штатно.

## Baseline и reset

Конструктор Field фиксирует очищенное значение после плагинов/cast. Новые формы после гидратации коллекцией фиксируют её значения как собственный baseline. Коллекции фиксируют упорядоченное очищенное содержимое и учитывают dirty потомков. После принятия серверных данных вызовите form.commitBaseline(), чтобы очистить всю форму. Фиксация одного потомка не переписывает baseline содержимого коллекции.

Фиксация baseline не очищает ошибки, не меняет touched/validity/значения и не запускает проверку. Reset сохраняет семантику 2.1.1: сохранившиеся потомки возвращают default конструктора, состав/порядок коллекций остаётся. Он не восстанавливает baseline и может оставлять dirty=true. reinitialize — только будущее предложение.

## Стоимость и ограничения

Нет обязательных runtime-зависимостей, таймеров и асинхронных очередей. Сравнения/snapshots обходят значения; сбор на нескольких уровнях и проверки принадлежности batch могут стоить больше одного линейного обхода. Чтения сохраняют ссылку, но пока заново собирают и сравнивают состояние, без selectors/dependency graph. Benchmark и доказательство отсутствия всех GC-утечек не заявляются. Детерминированные тесты проверяют detach, последнюю отписку, общих потомков, циклы добавления/удаления и повторные изменения из callback. Циклическое владение узлами и мутирующие валидаторы не поддерживаются; циклы структурированных значений поля поддерживаются. HF-004/HF-011+ и подготовка релиза остаются отдельными работами.
