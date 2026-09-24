# Greenline

Тестовое задание «Фронтенд разработчик React» для GREEN-API: веб-чат для отправки и получения
текстовых сообщений через GREEN-API. Внешний вид по мотивам web.max.ru. Мессенджер инстанса:
Telegram (ТЗ разрешает Telegram/WhatsApp вместо MAX); API у GREEN-API общий, поэтому код не
привязан к конкретному мессенджеру.

План и роли: [ROADMAP.md](ROADMAP.md). Задача каждой роли: `docs/tasks/*.md`.

## Стек
Vite + React 19 + TypeScript (strict) + zustand + Vitest. Без UI-библиотек, стили на CSS Modules.
Бэкенда нет: браузер ходит в GREEN-API напрямую.

## Команды
- `npm run dev`: dev-сервер
- `npm run build`: typecheck + сборка
- `npm test`: юнит-тесты (Vitest, jsdom)

## Правила для всех ролей
- Редактируй только файлы своей роли (таблица владения в ROADMAP.md). Нужна правка чужого
  файла или `src/types.ts`: остановись и опиши нужное изменение в отчёте, не правь сам.
- Сигнатуры из контрактов (`src/types.ts`, `GreenApiClient`, `ChatState`,
  `useNotificationPolling`) не меняй.
- Перед завершением: `npm run build` и `npm test` должны проходить.
- Коммиты: маленькие, осмысленные, на английском, в формате Conventional Commits
  (`feat(api): ...`). **Не добавлять** `Co-Authored-By` и строки «Generated with Claude Code»
  ни в коммиты, ни в PR.
- Никаких реальных `idInstance`/`apiTokenInstance` в коде, тестах, README и коммитах.
- В конце работы напиши краткий отчёт: что сделано, что проверено, открытые вопросы.
