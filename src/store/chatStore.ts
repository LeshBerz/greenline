// Owner: State role. The ChatState shape and action signatures are the contract with the UI role.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizePhone, toChatId } from '../lib/phone'
import type { Chat, Credentials, IncomingTextMessage, Message, MessageStatus } from '../types'
import { mergeHistory } from './mergeHistory'
import {
  chatPersistStorage,
  EMPTY_HISTORY,
  historyKey,
  loadHistory,
  parseHistory,
  type PersistedChatState,
} from './storage'

export interface ChatState {
  credentials: Credentials | null
  chats: Chat[]
  /** Messages grouped by chatId, oldest first. */
  messages: Record<string, Message[]>
  activeChatId: string | null

  login(credentials: Credentials): void
  logout(): void

  /**
   * Creates the chat if it does not exist and makes it active. Returns its chatId.
   * `chatId` is the id resolved by the messenger (Telegram: checkAccount); defaults to
   * toChatId(phone). If a chat with that id already exists (e.g. created by an incoming
   * message), it gets the phone number.
   */
  openChat(phone: string, chatId?: string): string
  setActiveChat(chatId: string | null): void

  /** Adds an outgoing message with status "pending". Returns the temporary id. */
  addOutgoing(chatId: string, text: string): string
  /** Updates a pending message after the send result is known (id may be replaced by idMessage). */
  resolveOutgoing(tempId: string, result: { status: MessageStatus; idMessage?: string }): void

  /**
   * Applies a status webhook to a sent message found by idMessage. Statuses only move forward
   * (sent -> delivered -> read), so a late "delivered" never overrides "read".
   */
  updateOutgoingStatus(idMessage: string, status: MessageStatus): void

  /**
   * Adds an incoming message; creates the chat if needed; dedupes by idMessage; bumps unread if
   * chat is not active. A reply means the contact has seen the chat, so earlier sent messages
   * of this chat become "read" (works even without status webhooks).
   */
  receiveIncoming(message: IncomingTextMessage): void
}

export const TEMP_ID_PREFIX = 'local:'

let tempCounter = 0
/** Temporary ids created by this tab (see mergeHistory). */
const ownTempIds = new Set<string>()

function createTempId(): string {
  tempCounter += 1
  const id = `${TEMP_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${tempCounter}`
  ownTempIds.add(id)
  return id
}

/** True for ids created by addOutgoing that were not replaced by an idMessage yet. */
export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}

/** "79001234567@c.us" -> "79001234567". */
export function phoneFromChatId(chatId: string): string {
  return chatId.split('@')[0] ?? chatId
}

function newChat(chatId: string, phone: string, title = phone): Chat {
  return { chatId, phone, title, unreadCount: 0 }
}

function resetUnread(chats: Chat[], chatId: string | null): Chat[] {
  return chats.map((c) =>
    c.chatId === chatId && c.unreadCount !== 0 ? { ...c, unreadCount: 0 } : c,
  )
}

const DELIVERY_RANK: Partial<Record<MessageStatus, number>> = { sent: 1, delivered: 2, read: 3 }

/** True if an outgoing message may move from `current` to `next`. */
function canAdvance(current: MessageStatus, next: MessageStatus): boolean {
  if (next === 'failed') return current === 'pending' || current === 'sent'
  const from = DELIVERY_RANK[current] ?? (current === 'failed' ? 0 : undefined)
  const to = DELIVERY_RANK[next]
  return from !== undefined && to !== undefined && to > from
}

/** Appends a message keeping the list ordered by timestamp (stable for equal timestamps). */
function insertByTime(list: Message[], message: Message): Message[] {
  let index = list.length
  while (index > 0 && list[index - 1].timestamp > message.timestamp) index -= 1
  return [...list.slice(0, index), message, ...list.slice(index)]
}

const emptyState = {
  credentials: null,
  ...EMPTY_HISTORY,
} satisfies PersistedChatState

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      ...emptyState,

      login(credentials) {
        // History is bound to idInstance: restore what this instance had before.
        set({ credentials, ...loadHistory(credentials.idInstance) })
      },

      logout() {
        // Clears the in-memory state and the session; saved history stays in localStorage
        // under the instance key and comes back on the next login to the same instance.
        set({ ...emptyState })
      },

      openChat(phone, resolvedChatId) {
        const normalized = normalizePhone(phone)
        const chatId = resolvedChatId ?? toChatId(normalized)
        set((state) => {
          const exists = state.chats.some((c) => c.chatId === chatId)
          const chats = exists
            ? resetUnread(state.chats, chatId).map((c) =>
                c.chatId === chatId && c.phone !== normalized
                  ? { ...c, phone: normalized, title: c.title === c.phone ? normalized : c.title }
                  : c,
              )
            : [newChat(chatId, normalized), ...state.chats]
          return { chats, activeChatId: chatId }
        })
        return chatId
      },

      setActiveChat(chatId) {
        set((state) => ({ activeChatId: chatId, chats: resetUnread(state.chats, chatId) }))
      },

      addOutgoing(chatId, text) {
        const id = createTempId()
        const message: Message = {
          id,
          chatId,
          text,
          direction: 'outgoing',
          status: 'pending',
          timestamp: Date.now(),
        }
        set((state) => {
          const chats = state.chats.some((c) => c.chatId === chatId)
            ? state.chats
            : [newChat(chatId, phoneFromChatId(chatId)), ...state.chats]
          return {
            chats,
            messages: { ...state.messages, [chatId]: [...(state.messages[chatId] ?? []), message] },
          }
        })
        return id
      },

      resolveOutgoing(tempId, { status, idMessage }) {
        const { messages } = get()
        for (const [chatId, list] of Object.entries(messages)) {
          const index = list.findIndex((m) => m.id === tempId)
          if (index === -1) continue
          const id = idMessage ?? tempId
          // If a message with this idMessage is already present, the temporary copy is redundant.
          const duplicate = id !== tempId && list.some((m) => m.id === id)
          const next = duplicate
            ? list.filter((_, i) => i !== index)
            : list.map((m, i) => (i === index ? { ...m, id, status } : m))
          set({ messages: { ...messages, [chatId]: next } })
          return
        }
      },

      updateOutgoingStatus(idMessage, status) {
        set((state) => {
          for (const [chatId, list] of Object.entries(state.messages)) {
            const index = list.findIndex((m) => m.id === idMessage && m.direction === 'outgoing')
            if (index === -1) continue
            if (!canAdvance(list[index].status, status)) return state
            const next = list.map((m, i) => (i === index ? { ...m, status } : m))
            return { messages: { ...state.messages, [chatId]: next } }
          }
          return state
        })
      },

      receiveIncoming(incoming) {
        set((state) => {
          const { chatId } = incoming
          const known = state.messages[chatId] ?? []
          if (known.some((m) => m.id === incoming.idMessage)) return state
          const list = known.map((m) =>
            m.direction === 'outgoing' &&
            m.timestamp <= incoming.timestamp &&
            canAdvance(m.status, 'read') &&
            m.status !== 'failed'
              ? { ...m, status: 'read' as const }
              : m,
          )

          const isActive = state.activeChatId === chatId
          const existing = state.chats.find((c) => c.chatId === chatId)
          let chats: Chat[]
          if (!existing) {
            const phone = phoneFromChatId(chatId)
            chats = [
              {
                ...newChat(chatId, phone, incoming.senderName || phone),
                unreadCount: isActive ? 0 : 1,
              },
              ...state.chats,
            ]
          } else {
            chats = state.chats.map((c) => {
              if (c.chatId !== chatId) return c
              // A chat opened by phone gets a real name once the contact writes back.
              const title =
                c.title === c.phone && incoming.senderName ? incoming.senderName : c.title
              return { ...c, title, unreadCount: isActive ? 0 : c.unreadCount + 1 }
            })
          }

          const message: Message = {
            id: incoming.idMessage,
            chatId,
            text: incoming.text,
            direction: 'incoming',
            status: 'received',
            timestamp: incoming.timestamp,
          }
          return { chats, messages: { ...state.messages, [chatId]: insertByTime(list, message) } }
        })
      },
    }),
    {
      name: 'greenline',
      storage: chatPersistStorage,
      partialize: ({ credentials, chats, messages, activeChatId }): PersistedChatState => ({
        credentials,
        chats,
        messages,
        activeChatId,
      }),
    },
  ),
)

/**
 * Merges history that another tab of the same instance wrote to localStorage. Without it the
 * tab with an older copy would erase the other tab's messages on its next write. The state is
 * set only if the merge adds something, so two tabs do not keep re-writing each other.
 */
export function syncFromOtherTab(event: StorageEvent): void {
  const { credentials, chats, messages, activeChatId } = useChatStore.getState()
  if (!credentials || event.newValue === null) return
  if (event.key !== historyKey(credentials.idInstance)) return
  const remote = parseHistory(event.newValue)
  if (!remote) return
  const merged = mergeHistory(
    { chats, messages, activeChatId },
    remote,
    (id) => ownTempIds.has(id),
    isTempId,
  )
  if (
    merged.chats.length === chats.length &&
    JSON.stringify(merged.messages) === JSON.stringify(messages)
  ) {
    return
  }
  useChatStore.setState({ chats: merged.chats, messages: merged.messages })
}

if (typeof window !== 'undefined') window.addEventListener('storage', syncFromOtherTab)

export {
  selectActiveChat,
  selectActiveMessages,
  selectLastMessage,
  selectMessages,
  selectSortedChats,
  selectTotalUnread,
} from './selectors'
