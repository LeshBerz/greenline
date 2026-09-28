# Роль 4: DevOps & Docs

Ты отвечаешь за инфраструктуру и документацию. Сначала прочитай `CLAUDE.md` и `ROADMAP.md`.

**Ветка:** `feat/devops`
**Твои файлы:** `README.md`, `.github/**`, `eslint.config.js`, `.prettierrc`, `.prettierignore`,
`docs/deploy.md`, `package.json` (только `scripts` и `devDependencies`), `package-lock.json`.

## Что сделать

1. ESLint (flat config): `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
   Prettier: без точек с запятой, одинарные кавычки, trailing commas, ширина 100 (как в текущем коде).
   Скрипты `lint`, `format`, `format:check`. Прогони форматирование только по своим файлам.
   Чужие `src/**` не переформатируй: это породит конфликты с параллельными ветками.
2. GitHub Actions `.github/workflows/ci.yml`: на push/PR выполняются `npm ci`, `lint`, `test`, `build`, Node 22, кеш npm.
3. Деплой на GitHub Pages: `.github/workflows/deploy.yml` (push в `main` → build → `actions/deploy-pages`).
   `vite.config.ts` уже использует `base: './'`. Опиши в `docs/deploy.md`, что включить в настройках
   репозитория. Альтернатива Vercel описывается одним абзацем.
4. README.md на русском, для проверяющего из GREEN-API:
   - что это и скриншот (плейсхолдер `docs/screenshots/main.png`, скриншот снимет QA);
   - ссылка на демо (плейсхолдер);
   - **инструкция локального запуска** (требуется по ТЗ): Node 22, `npm ci`, `npm run dev`;
   - как получить `idInstance`/`apiTokenInstance` и привязать инстанс (кратко, со ссылками на green-api.com);
   - сценарий проверки по шагам (логин → новый чат → отправка → ответ из мессенджера → ответ в чате);
   - почему Telegram, а не MAX: ТЗ разрешает, API GREEN-API общий, для MAX меняется только инстанс;
   - стек и структура папок, архитектура (клиент → стор → поллинг), ограничения (только текст, HTTP API).
5. `.vscode/extensions.json` с рекомендациями ESLint и Prettier (опционально).

## Не делать

- Не трогать `src/**` (кроме случая, когда lint падает на чужом файле: тогда не чини, а опиши в отчёте
  или ослабь правило).
- Не добавлять runtime-зависимости.

## Готово, когда

- `npm run lint`, `npm test`, `npm run build` проходят локально на текущем `main`.
- Отчёт: какие файлы добавлены и что тимлиду нужно сделать руками на GitHub.
