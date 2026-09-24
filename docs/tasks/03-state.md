# Роль 3: State

Ты отвечаешь за состояние приложения и цикл получения сообщений. Сначала прочитай `CLAUDE.md`,
`ROADMAP.md`, `src/types.ts`, `src/api/greenApi.ts` (интерфейс `GreenApiClient`).

**Ветка:** `feat/state`
**Твои файлы:** `src/store/**`, `src/hooks/**`, тесты рядом.

## Что сделать
1. `useChatStore` в `src/store/chatStore.ts` строго по интерфейсу `ChatState`:
   - `openChat(phone)`: получает chatId через `toChatId(normalizePhone(phone))` из `src/lib/phone.ts`.
     Реализацию пишет API-роль параллельно, в тестах мокай модуль через `vi.mock`. Не дублирует
     существующий чат, делает его активным, сбрасывает `unreadCount`.
   - `setActiveChat` сбрасывает `unreadCount` у выбранного чата.
   - `addOutgoing` / `resolveOutgoing`: оптимистичное сообщение с временным id. После успеха id
     заменяется на `idMessage`, статус `sent`. После ошибки статус `failed`.
   - `receiveIncoming`: дедуп по `idMessage`, автосоздание чата (title = `senderName` или номер),
     `unreadCount++`, если чат не активный.
   - Порядок чатов: самый свежий по последнему сообщению сверху. Сделай селектор
     `selectSortedChats` и `selectLastMessage(chatId)`, они нужны UI.
   - `logout` очищает всё.
   - Персистентность через `zustand/middleware` `persist`: **credentials в `sessionStorage`**
     (не `localStorage`), чаты и сообщения в `localStorage` с ключом, зависящим от `idInstance`.
     Если нужен второй стор или своя логика `partialize`, это на твоё усмотрение, но публичный
     `ChatState` не меняй.
2. `useNotificationPolling(client, onMessage)` в `src/hooks/useNotificationPolling.ts`:
   - Цикл: `receiveNotification` → если `message`, вызвать `onMessage` → `deleteNotification(receiptId)`
     (удалять и нетекстовые уведомления). Если `null`, сразу следующий запрос: сервер сам держит long poll.
   - Отмена через `AbortController` при размонтировании или смене `client`. Никаких параллельных
     циклов, в том числе в React StrictMode (двойной mount).
   - Сетевые ошибки: экспоненциальный backoff 1s → 2s → 4s … максимум 30s, сброс после успеха.
     Ошибка в `onMessage` не должна ронять цикл и не должна мешать удалению уведомления.
   - Держи `onMessage` в ref, чтобы новый колбэк не перезапускал цикл.
3. Тесты Vitest: все экшены стора и дедуп, сортировка, unread, persist (sessionStorage для ключей);
   поллинг с мок-клиентом (`@testing-library/react` не ставь, используй `renderHook`-аналог через
   `react-dom/client` + `act` или вынеси цикл в чистую функцию `runPollingLoop(client, onMessage, signal)`
   и тестируй её, это предпочтительнее), backoff на fake timers, отмена.

## Не делать
- Не трогать UI, API, `App.tsx`, `package.json`.

## Готово, когда
- `npm run build` и `npm test` зелёные.
- Отчёт: публичные селекторы и хелперы, решения по persist, открытые вопросы.
