// Owner: State role. The ChatState shape and action signatures are the contract with the UI role.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizePhone, toChatId } from '../lib/phone'
import type { Chat, Credentials, IncomingTextMessage, Message, MessageStatus } from '../types'
import { chatPersistStorage, EMPTY_HISTORY, loadHistory, type PersistedChatState } from './storage'

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

  /** Adds an incoming message; creates the chat if needed; dedupes by idMessage; bumps unread if chat is not active. */
  receiveIncoming(message: IncomingTextMessage): void
}

export const TEMP_ID_PREFIX = 'local:'

let tempCounter = 0

function createTempId(): string {
  tempCounter += 1
  return `${TEMP_ID_PREFIX}${Date.now().toString(36)}-${tempCounter}`
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

      receiveIncoming(incoming) {
        set((state) => {
          const { chatId } = incoming
          const list = state.messages[chatId] ?? []
          if (list.some((m) => m.id === incoming.idMessage)) return state

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

export {
  selectActiveChat,
  selectActiveMessages,
  selectLastMessage,
  selectMessages,
  selectSortedChats,
  selectTotalUnread,
} from './selectors'
