# AdaptForm 2.3.0 — milestone foundation

[English](PLAN.md) · [Русский](PLAN.ru.md)

Утверждённый объём source в `feature/v2.3.0-foundation` от master `9942aac`. **Это не release candidate и не публикация npm.** Manifests и опубликованная версия остаются 2.2.0. Один интеграционный PR без auto-merge, тегов, релиза и удаления веток.

| Этап | Статус source | Подтверждение |
| --- | --- | --- |
| STAB-01 | Завершён; 54 → 0 диагностик | [Типизация](TEST_TYPES.ru.md), regression type tests и тестовый typecheck CI |
| STAB-02 | Измерения/lifecycle завершены; проблемы производительности отложены | [Бенчмарки](BENCHMARKS.ru.md), raw baseline/foundation JSON и lifecycle tests |
| HF-011 | Реализован, ожидает независимого review | [Контракт идентичности](../../ai/HEADLESS_COLLECTION_IDENTITY.ru.md), insert/move/упорядоченные ID snapshot |
| HF-012 | Спецификация завершена, решения владельца ожидаются | [Предложение зависимостей](../../ai/HEADLESS_DEPENDENCIES.ru.md); engine не реализован |

[Проверки](VERIFICATION.ru.md) фиксируют локальные и интеграционные результаты. Приёмка PR не означает утверждение предложенного API HF-012. Вопросы владельцу: activation/disposal, missing/cyclic refs, opt-in purity и selective invalidation. Следующий безопасный шаг — независимое review и эти решения; **не начинать HF-013 автоматически**.

Совместимость: setters замены не сопоставляют значения; touched/reset/commitBaseline и JSON/FormData сохранены. Snapshot получает опциональный itemIds и теперь наблюдает смену идентичности при равном содержимом; exact-key consumers должны учитывать добавление. ID локальны модулю, не domain identifiers. Фабрикам следует возвращать разные экземпляры для разных элементов. Обновления больших наблюдаемых коллекций всё ещё дороги; до переработки scheduler/cache нужно profiling. Короткие GC samples не доказывают отсутствия утечек.

HF-004 reset membership, reinitialize, HF-013+, UI/async/submission и release/version/publishing исключены. Неизменённый publication preflight сообщает, что 2.2.0 опубликована, и пропускает её; будущий результат подтвердит только реальный post-merge workflow. Codex не объединяет этот PR.
