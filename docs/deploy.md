# Деплой

Greenline — статическое SPA без бэкенда: после `npm run build` в папке `dist/` лежат HTML, JS и CSS,
которые можно положить на любой статический хостинг. В `vite.config.ts` стоит `base: './'`, поэтому
сборка работает и из подпапки (`https://<user>.github.io/<repo>/`), и из корня домена.

Ключи GREEN-API в сборку не попадают: пользователь вводит их в браузере на экране входа.
Переменные окружения и секреты для деплоя не нужны.

## GitHub Pages (основной вариант)

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). Запускается на каждый
push в `main` и вручную (Actions → Deploy to GitHub Pages → Run workflow). Шаги: `npm ci` →
`npm run build` → загрузка `dist/` как Pages-артефакта → `actions/deploy-pages`.

### Что включить в настройках репозитория (один раз)

1. Репозиторий должен быть **публичным** (на бесплатном плане Pages работает только для публичных).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   Без этого шаг `deploy-pages` упадёт с ошибкой про отсутствие Pages-сайта.
3. **Settings → Actions → General → Workflow permissions:** достаточно значения по умолчанию
   (read). Права `pages: write` и `id-token: write` workflow запрашивает сам.
4. **Settings → Environments → github-pages** создаётся автоматически при первом деплое. Если в
   нём включено правило «Deployment branches», в списке должна быть ветка `main`.
5. После первого успешного запуска адрес сайта появится в Settings → Pages и в summary джоба
   `deploy`. Его нужно вписать в README (раздел «Демо»).

### Проверка

- Вкладка Actions: оба workflow (CI и Deploy) зелёные.
- Открыть адрес Pages, в DevTools → Network убедиться, что `assets/*.js` отдаются с кодом 200
  (если 404, значит сломан `base`).

## Vercel (альтернатива)

Импортировать репозиторий на [vercel.com/new](https://vercel.com/new): фреймворк определится как
Vite автоматически (Build Command `npm run build`, Output Directory `dist`), переменные окружения
не нужны. Каждый push в `main` деплоит продакшен, каждый PR получает preview-ссылку. Если
GREEN-API начнёт отвечать ошибкой CORS на запросы из браузера, на Vercel проще всего добавить
serverless-прокси (`api/*.ts`) — на GitHub Pages такой возможности нет.
