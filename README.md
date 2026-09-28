# Greenline

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

Веб-чат для отправки и получения текстовых сообщений через [GREEN-API](https://green-api.com).
Тестовое задание «Фронтенд разработчик React». Внешний вид сделан по мотивам
[web.max.ru](https://web.max.ru).

![Главный экран Greenline](docs/screenshots/main.png)

**Демо:** https://OWNER.github.io/REPO/ _(ссылка появится после первого деплоя)_

## Возможности

- Вход по `idInstance` и `apiTokenInstance` (плюс `apiUrl` из консоли GREEN-API); ключи
  проверяются запросом `getStateInstance`.
- Создание чата по номеру телефона получателя.
- Отправка текстовых сообщений методом `SendMessage`.
- Получение ответов через HTTP API: `ReceiveNotification` + `DeleteNotification`.
- Статусы исходящих сообщений: отправляется / отправлено / ошибка.

## Локальный запуск

Нужен **Node.js 22** (и npm, который идёт вместе с ним).

```bash
git clone https://github.com/OWNER/REPO.git
cd REPO
npm ci
npm run dev
```

Откройте адрес, который напечатает Vite (обычно http://localhost:5173).

Другие команды:

| Команда           | Что делает                                  |
| ----------------- | ------------------------------------------- |
| `npm run build`   | проверка типов и продакшен-сборка в `dist/` |
| `npm run preview` | локальный просмотр собранного `dist/`       |
| `npm test`        | юнит-тесты (Vitest, jsdom)                  |
| `npm run lint`    | ESLint                                      |
| `npm run format`  | Prettier                                    |

## Как получить ключи GREEN-API

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com).
2. Создайте инстанс (подойдёт бесплатный тариф «Разработчик») и выберите мессенджер.
3. Привяжите аккаунт мессенджера к инстансу по инструкции в кабинете (сканирование QR-кода или
   вход по номеру). Статус инстанса должен стать `authorized`.
4. На странице инстанса скопируйте `apiUrl`, `idInstance` и `apiTokenInstance`.

Подробнее: [документация GREEN-API](https://green-api.com/docs/before-start/).

Ключи вводятся только в браузере на экране входа и хранятся в `sessionStorage` текущей вкладки.
В код, URL и репозиторий они не попадают.

## Сценарий проверки

1. Откройте демо или локальный dev-сервер.
2. Введите `apiUrl`, `idInstance`, `apiTokenInstance` и нажмите «Войти». При неверных ключах
   появится ошибка, при верных откроется главный экран.
3. Нажмите «Новый чат» и введите номер получателя в международном формате (например,
   `79001234567`).
4. Напишите текст и отправьте. Сообщение появится в чате со статусом «отправлено», получатель
   увидит его в мессенджере.
5. Ответьте из мессенджера с телефона получателя.
6. Через несколько секунд ответ появится в этом же чате в Greenline.

## Почему Telegram, а не MAX

ТЗ разрешает вместо MAX использовать Telegram или WhatsApp. Для проверки взят инстанс Telegram.
HTTP API у GREEN-API общий для всех мессенджеров: те же методы `getStateInstance`, `sendMessage`,
`receiveNotification`, `deleteNotification` и тот же формат уведомлений. Код приложения к
мессенджеру не привязан: чтобы работать с MAX, достаточно создать MAX-инстанс и ввести его ключи
на экране входа.

## Стек

- [Vite](https://vite.dev) + [React 19](https://react.dev) + TypeScript (strict)
- [zustand](https://github.com/pmndrs/zustand) для состояния
- CSS Modules, без UI-библиотек
- Vitest + jsdom для тестов
- ESLint (typescript-eslint, react-hooks) + Prettier
- GitHub Actions: CI (lint, test, build) и деплой на GitHub Pages

Бэкенда нет: браузер обращается к GREEN-API напрямую.

## Архитектура

```
 Экран входа ──► createGreenApiClient(credentials) ──► GreenApiClient
                                                          │
    ┌──────────────── sendMessage ◄───── UI (чат) ◄───────┤
    │                                     ▲               │
    │                                     │ подписка      │ receiveNotification
    ▼                                     │               ▼ deleteNotification
 GREEN-API  ◄──── HTTP ────►  useChatStore (zustand) ◄── useNotificationPolling
```

- **Клиент** (`src/api/greenApi.ts`) — тонкая обёртка над `fetch` для четырёх методов HTTP API,
  парсинг уведомлений в доменные типы. Номер телефона превращается в `chatId` в одном месте
  (`src/lib/phone.ts`).
- **Стор** (`src/store/chatStore.ts`) — чаты, сообщения, активный чат. Исходящее сообщение
  добавляется сразу со статусом `pending` и обновляется после ответа `sendMessage`. Входящие
  дедуплицируются по `idMessage`.
- **Поллинг** (`src/hooks/useNotificationPolling.ts`) — цикл `receiveNotification` → обработка →
  `deleteNotification`, пока пользователь залогинен. Уведомление удаляется из очереди только после
  обработки; при сетевых ошибках цикл делает паузу с нарастающей задержкой и продолжает.
- **UI** (`src/components/**`) — презентационные компоненты, получают данные только через props.

## Структура проекта

```
src/
  api/          HTTP-клиент GREEN-API
  lib/          утилиты (нормализация номера, chatId)
  store/        zustand-стор
  hooks/        поллинг уведомлений
  components/   UI-компоненты
  styles/       общие стили и переменные
  types.ts      доменные типы
docs/
  deploy.md     деплой на GitHub Pages / Vercel
  tasks/        задачи ролей
.github/workflows/
  ci.yml        lint + test + build на push и PR
  deploy.yml    деплой на GitHub Pages из main
```

## Ограничения

- Только текстовые сообщения: медиа, файлы, стикеры и прочие типы уведомлений пропускаются
  (удаляются из очереди без показа).
- Получение сообщений только через HTTP API (`ReceiveNotification`), без вебхук-сервера.
  Сообщение появляется с задержкой до нескольких секунд.
- История чатов не загружается с сервера и хранится только в памяти вкладки: после перезагрузки
  страницы список чатов пустой.
- Одна вкладка на инстанс: две вкладки с одними ключами будут забирать уведомления из общей
  очереди друг у друга.
