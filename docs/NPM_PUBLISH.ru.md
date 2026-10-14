# Автоматическая публикация в npm

[English](NPM_PUBLISH.md) · [Русский](NPM_PUBLISH.ru.md)

Workflow [Publish npm package](../.github/workflows/publish-npm.yml) запускается после успешного `CI`, вызванного отправкой коммита в `master`. Слияние pull request создаёт такой коммит. Прямая отправка в `master` тоже подходит. Если CI завершился с ошибкой, проверял pull request или выполнялся из другого репозитория, публикация не произойдёт.

Workflow проверяет точные значения `name` и `version` из `package.json` в публичном реестре npm. Если версия уже опубликована, публикация пропускается без ошибки. Версия **не** увеличивается автоматически. Для нового выпуска нужно до слияния изменить версию в `package.json` и `package-lock.json` и обновить changelog. Опубликованную версию npm нельзя перезаписать.

## Первоначальная настройка

Выберите один способ авторизации перед включением workflow:

**Trusted Publisher (предпочтительно).** Включите двухфакторную аутентификацию учётной записи npm, которая управляет пакетом [`adaptform`](https://www.npmjs.com/package/adaptform): npm требует её для настройки Trusted Publisher. После появления `.github/workflows/publish-npm.yml` в `master` укажите в настройках npm владельца `ArhiMEN`, репозиторий `AdaptForm`, имя workflow `publish-npm.yml` и разрешите **npm publish**, а не только staging. Эквивалентная команда npm CLI:

```bash
npm trust github adaptform --repo ArhiMEN/AdaptForm --file publish-npm.yml --allow-publish
```

**Granular token npm.** На сайте npm создайте granular access token только для пакета `adaptform` с правами **Read and write (publish and stage)** и включённым **Bypass 2FA**. Сохраните его напрямую в секрет репозитория `NPM_TOKEN` из своего терминала:

```bash
gh secret set NPM_TOKEN --repo ArhiMEN/AdaptForm
```

Команда запросит значение; не отправляйте токен в чат, аргумент команды или файл под Git. Токен с ограниченным сроком нужно обновлять до истечения. npm планирует прекратить прямую публикацию через токены с обходом 2FA в январе 2027 года, поэтому затем потребуется перейти на Trusted Publisher. Если настройки пакета запрещают токены, используйте Trusted Publisher.

После настройки одного из способов установите переменную GitHub Actions `NPM_PUBLISH_ENABLED` в `true`:

```bash
gh variable set NPM_PUBLISH_ENABLED --repo ArhiMEN/AdaptForm --body true
```

Trusted Publisher использует краткоживущий идентификатор OIDC от GitHub и обходится без npm-токена. Если есть `NPM_TOKEN`, шаг публикации передаст его как `NODE_AUTH_TOKEN`. Пока переменная не включена, задание публикации пропускается. Чтобы приостановить новые публикации, установите `false`; уже опубликованные версии останутся в npm.

Первое подходящее слияние после настройки опубликует текущую версию из `package.json`, если её ещё нет в npm. После включения проверьте [запуски Actions](https://github.com/ArhiMEN/AdaptForm/actions/workflows/publish-npm.yml) и [версии пакета в npm](https://www.npmjs.com/package/adaptform?activeTab=versions).
