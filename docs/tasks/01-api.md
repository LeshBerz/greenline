# Роль 1: API

Ты отвечаешь за слой работы с GREEN-API. Сначала прочитай `CLAUDE.md`, `ROADMAP.md` и `src/types.ts`.

**Ветка:** `feat/api`
**Твои файлы:** `src/api/**`, `src/lib/phone.ts`, тесты рядом (`*.test.ts`).

## Документация
- SendMessage: https://green-api.com/v3/docs/api/sending/SendMessage/
- HTTP API (ReceiveNotification / DeleteNotification): https://green-api.com/v3/docs/api/receiving/technology-http-api/
- GetStateInstance и формат вебхука `incomingMessageReceived`: найди в той же документации.
- Формат URL: `{apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}`. Сверься с документацией.

## Что сделать
1. `createGreenApiClient(credentials)` в `src/api/greenApi.ts` по интерфейсу `GreenApiClient`:
   - `getStateInstance()` возвращает `stateInstance`, неизвестные значения превращаются в `'unknown'`.
   - `sendMessage(chatId, text)`: `POST` с JSON `{ chatId, message }`, возвращает `{ idMessage }`.
   - `receiveNotification(signal?)`: пустой ответ (`null`) означает `null`. Иначе `{ receiptId, message }`,
     где `message` получается из `body` вебхука `incomingMessageReceived` с `typeMessage`
     `textMessage` или `extendedTextMessage`. Для всех остальных типов `message: null`.
     `timestamp` в ответе в секундах, в модели в миллисекундах.
   - `deleteNotification(receiptId)`.
   - Все ошибки HTTP и сети бросают `GreenApiError` со `status` и понятным текстом.
     Отдельно обработай 401/403 («неверные idInstance/apiTokenInstance») и 429.
   - Убери лишний `/` в конце `apiUrl`.
   - Вынеси парсинг вебхука в чистую функцию `parseNotification(raw)` в `src/api/parseNotification.ts`.
2. `src/lib/phone.ts`: `normalizePhone`, `isValidPhone` (10–15 цифр), `toChatId`.
   **Проверь по документации GREEN-API, какой `chatId` нужен для Telegram-инстанса** (для WhatsApp это
   `79001234567@c.us`). Если форматы отличаются, опиши это в отчёте и предложи решение.
3. Тесты Vitest с замоканным `fetch`: URL и тело каждого метода, парсинг всех ветвей вебхука
   (текст, extended text, картинка → null, исходящее → null), ошибки 401/500/сеть, нормализация номеров
   (`+7 (900) 123-45-67`, `8 900 123 45 67`, мусор).
4. **Проверка CORS:** выясни (документация, заголовки ответа, например `curl -I` с заголовком `Origin`),
   разрешает ли GREEN-API запросы из браузера. Результат напиши в отчёте. Если не разрешает,
   предложи dev-proxy в `vite.config.ts` (сам файл не правь, это чужая зона).

## Не делать
- Не трогать UI, стор, `App.tsx`, `package.json`.
- Не хранить реальные ключи нигде.

## Готово, когда
- `npm run build` и `npm test` зелёные, покрыты все методы и ветви парсинга.
- Отчёт: API, формат `chatId`, CORS, открытые вопросы.
