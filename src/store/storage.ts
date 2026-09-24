// Owner: State role.
// Split persistence for the chat store: credentials live in sessionStorage (gone when the tab
// closes), chat history lives in localStorage under a key bound to idInstance, so switching
// instances never mixes their chats.
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import type { Chat, Credentials, Message } from '../types'

export const SESSION_KEY = 'greenline:session'
export const HISTORY_KEY_PREFIX = 'greenline:history:'

export function historyKey(idInstance: string): string {
  return HISTORY_KEY_PREFIX + idInstance
}

export interface ChatHistory {
  chats: Chat[]
  messages: Record<string, Message[]>
  activeChatId: string | null
}

export interface PersistedChatState extends ChatHistory {
  credentials: Credentials | null
}

export const EMPTY_HISTORY: ChatHistory = { chats: [], messages: {}, activeChatId: null }

// Storage access can throw (private mode, quota, disabled storage): never let it break the app.
function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore: the app keeps working in memory.
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    // Ignore.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCredentials(value: unknown): value is Credentials {
  return (
    isRecord(value) &&
    typeof value.apiUrl === 'string' &&
    typeof value.idInstance === 'string' &&
    typeof value.apiTokenInstance === 'string'
  )
}

export function loadCredentials(): Credentials | null {
  const value = readJson(sessionStorage, SESSION_KEY)
  return isCredentials(value) ? value : null
}

/**
 * Reads the saved history of an instance. Messages that were still "pending" when the page was
 * closed never got a result, so they come back as "failed".
 */
export function loadHistory(idInstance: string): ChatHistory {
  const value = readJson(localStorage, historyKey(idInstance))
  if (!isRecord(value) || !Array.isArray(value.chats) || !isRecord(value.messages)) {
    return EMPTY_HISTORY
  }
  const messages: Record<string, Message[]> = {}
  for (const [chatId, list] of Object.entries(value.messages)) {
    if (!Array.isArray(list)) continue
    messages[chatId] = (list as Message[]).map((m) =>
      m.status === 'pending' ? { ...m, status: 'failed' } : m,
    )
  }
  return {
    chats: value.chats as Chat[],
    messages,
    activeChatId: typeof value.activeChatId === 'string' ? value.activeChatId : null,
  }
}

/** Removes the saved chat history of an instance from localStorage. */
export function clearHistory(idInstance: string): void {
  remove(localStorage, historyKey(idInstance))
}

/** zustand persist storage that routes each part of the state to its own Web Storage. */
export const chatPersistStorage: PersistStorage<PersistedChatState> = {
  getItem(): StorageValue<PersistedChatState> | null {
    const credentials = loadCredentials()
    if (!credentials) return null
    // version must match the persist option (0 by default), otherwise zustand discards the value.
    return { state: { credentials, ...loadHistory(credentials.idInstance) }, version: 0 }
  },
  setItem(_name, { state }) {
    if (!state.credentials) {
      remove(sessionStorage, SESSION_KEY)
      return
    }
    writeJson(sessionStorage, SESSION_KEY, state.credentials)
    const history: ChatHistory = {
      chats: state.chats,
      messages: state.messages,
      activeChatId: state.activeChatId,
    }
    writeJson(localStorage, historyKey(state.credentials.idInstance), history)
  },
  removeItem() {
    remove(sessionStorage, SESSION_KEY)
  },
}
