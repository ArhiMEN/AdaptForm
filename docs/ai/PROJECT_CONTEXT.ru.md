# Контекст проекта

[English](PROJECT_CONTEXT.md) · [Русский](PROJECT_CONTEXT.ru.md)

AdaptForm — независимый от UI-фреймворков headless-движок форм на TypeScript с class-based API. Версия **2.1.0 опубликована 2026-10-14**; исходники **2.1.1** были подготовлены в GitHub, но не опубликованы, а после принятия HF-005–HF-010 **версия 2.2.0** объединена через [PR #18](https://github.com/ArhiMEN/AdaptForm/pull/18) и опубликована в npm 2026-10-19 через OIDC Trusted Publisher ([успешный запуск](https://github.com/ArhiMEN/AdaptForm/actions/runs/39209185356)). См. [CHANGELOG](../../CHANGELOG.ru.md) и [проверочный список 2.2.0](../roadmap/v2.2.0/RELEASE.ru.md). Публикация npm — отдельное действие; новые задачи требуют утверждения.

- Публичные точки входа: `src/index.ts`, `src/luxon.ts`; реализация: `src/core/`. Luxon необязателен.
- Тесты: `tests/unit/`, `tests/integration/`, `tests/demo/`; интерактивное демо из исходников: `demo/`.
- Команды и зависимости: `package.json`; CI: `.github/workflows/ci.yml`; дистрибутив: ESM, CommonJS и декларации в `dist/`.
- Начинать с [AGENTS](../../AGENTS.ru.md). Читать только нужные разделы README, файлы и skills; эта карта не является аудитом кода.

Использовать [DECISIONS](DECISIONS.ru.md) для согласованного процесса, [BACKLOG](BACKLOG.ru.md) для предложений и [HANDOFF](HANDOFF.ru.md) для продолжения работы. Эти документы хранят публичные факты проекта, а не приватные переписки ChatGPT.
