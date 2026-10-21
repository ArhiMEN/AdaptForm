# Проверки foundation — 2026-10-20

[English](VERIFICATION.md) · [Русский](VERIFICATION.ru.md)

Ветка: `feature/v2.3.0-foundation`; база master `9942aac71dbd5b20121f634bbad5663a812ef6ee`. Версия source-пакета **2.2.0**, TypeScript 5.9.3, Node 24.19.0, npm 11.9.0. Зависимости, версия и publish workflow не изменены. Независимое review и приёмка PR — отдельные шаги.

## Реально выполненные проверки этапов

| Этап | Проверки / результат |
| --- | --- |
| STAB-01 | Исходный test tsc: 54 ошибки; итоговый: 0. Точечно 13 файлов: 313 тестов прошли; отдельно новые type regressions: 2 прошли. Source tsc/lint прошли. Первый lint отклонил standalone expression отрицательного теста; добавлен void, повторная проверка прошла. |
| STAB-02 | Lifecycle + nested: 16 тестов прошли; повторно новый lifetime file: 4 прошли. Test tsc/lint/build прошли. Node harness завершился с прогревом, семью сериями и expose-gc; baseline JSON сохранён. |
| HF-011 | Существующие collections/nested/batch: 90 тестов прошли до добавления новых случаев. Итоговые шесть целевых файлов: 113 прошли (включая 19 новых identity cases). Оба tsc/lint/build/diff прошли. Изначально regression test ожидал clean корень после reset; тест исправлен с сохранением различия defaults/baseline гидратированных строк. Код reset не менялся. |
| HF-012 | Только документация; проверены локальные Markdown targets, разделы EN/RU и whitespace diff. Dependency engine и type exports не реализованы. |

## Финальные локальные проверки

| Команда | Фактический результат |
| --- | --- |
| npm test | **591/591 тестов**, 30 файлов, на 25 случаев больше master |
| npm run lint | PASS, без предупреждений |
| npx tsc --noEmit -p tsconfig.json | PASS |
| npx tsc --noEmit -p tsconfig.test.json | PASS, **0 диагностик** |
| npm run build | PASS, ESM/CJS/declarations, включая optional Luxon entry |
| npm run check:package | PASS, 21 файл пакета |
| npm run check:demo | PASS |
| npm run build:demo | PASS; index.html/assets существуют |
| npm audit --audit-level=moderate | PASS, 0 уязвимостей |
| git diff --check | PASS |

Дополнительно реально проверены strict NodeNext consumers собранных деклараций в `.mts` и `.cts`: scalar/nested inference, типы insert, snapshot IDs, прежние structural snapshot producers, отрицательный numeric case и optional Luxon types. Локальный npm pack установлен с ignore-scripts/omit=optional в изолированной директории **вне предков node_modules репозитория**; package-root ESM и CJS работают без Luxon, включая move/insert/batch/snapshots. С установленным Luxon согласованные ESM и CJS consumers прошли проверки DateTime и ISO input.

Дополнительные неудачи smoke не скрыты: первоначальная проверка отсутствия Luxon внутри work репозитория разрешила его из devDependencies предка; действительно изолированная проверка прошла. Первый mixed-loader Luxon smoke упал: DateLuxonType использует instanceof DateTime, а ESM/CJS Luxon имеют разные конструкторы. Существующее ограничение явно воспроизведено; исходник идентичен master, согласованные loaders работают. Оно не исправляется попутно, универсальная cross-realm compatibility не заявляется.

Прямой Node registry preflight сначала не прошёл: Node fetch не использовал HTTP proxy cloud runner. `NODE_USE_ENV_PROXY=1 node scripts/check-npm-release.mjs` прошёл: **adaptform@2.2.0 is already published; skipping.** Workflow не менялся, публикации не было. Реальный post-merge workflow не запускался этой задачей; будущий skip не выдаётся за наблюдавшийся.

## Измерения и оставшиеся решения

[Бенчмарки](BENCHMARKS.ru.md) содержат baseline и повтор HF-011, среду, команды и ограничения. Большие наблюдаемые коллекции и глубина остаются проблемами, не исправленными здесь дефектами для release gate. Короткое GC-измерение не доказывает отсутствие утечек. [HF-011](../../ai/HEADLESS_COLLECTION_IDENTITY.ru.md) описывает аддитивную границу совместимости snapshot/events. [HF-012](../../ai/HEADLESS_DEPENDENCIES.ru.md) перечисляет решения владельца до HF-013; API остаётся предложением. HF-004/reset redesign исключён.

Интеграционный CI проверяется для финального pushed head единственного PR; локальные проверки выше не заявляют успех GitGuardian/GitHub CI. Отчёт доставки фиксирует фактические PR URL, итоговый SHA и conclusions после push. Merge, force push, удаления веток, version bump, npm publish, тегов и GitHub Release нет.

## PERF-01 — 2026-10-21

[Отчёт о производительности](PERFORMANCE.ru.md): локально прошли 606 тестов / 31 файл, включая 15 новых регрессионных тестов; lint, typecheck исходников/тестов/демо, сборки библиотеки/демо, проверка пакета (21 файл), аудит (0 уязвимостей), diff и полные бенчмарки до/после. Версия 2.2.0 и публичное поведение сохранены; слияния и публикации не было. CI PR следует проверить на финальном коммите.
