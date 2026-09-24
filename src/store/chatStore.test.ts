import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Credentials, IncomingTextMessage } from '../types'
import { isTempId, selectLastMessage, selectSortedChats, useChatStore } from './chatStore'
import { historyKey, SESSION_KEY } from './storage'

// phone.ts is implemented by the API role in parallel; the store only needs its contract.
vi.mock('../lib/phone', () => ({
  normalizePhone: (input: string) => input.replace(/\D/g, '').replace(/^8/, '7'),
  toChatId: (phone: string) => `${phone}@c.us`,
  isValidPhone: () => true,
}))

const creds: Credentials = { apiUrl: 'https://api.example.test', idInstance: '1101', apiTokenInstance: 'token-a' }
const otherCreds: Credentials = { apiUrl: 'https://api.example.test', idInstance: '2202', apiTokenInstance: 'token-b' }

const CHAT = '79001234567@c.us'

function incoming(overrides: Partial<IncomingTextMessage> = {}): IncomingTextMessage {
  return { idMessage: 'in-1', chatId: CHAT, senderName: 'Alice', text: 'hi', timestamp: 1_000, ...overrides }
}

const store = () => useChatStore.getState()

beforeEach(() => {
  useChatStore.setState({ credentials: null, chats: [], messages: {}, activeChatId: null })
  sessionStorage.clear()
  localStorage.clear()
  vi.useRealTimers()
})

describe('openChat / setActiveChat', () => {
  it('creates a chat from a raw phone and makes it active', () => {
    const chatId = store().openChat('8 (900) 123-45-67')
    expect(chatId).toBe(CHAT)
    expect(store().activeChatId).toBe(CHAT)
    expect(store().chats).toEqual([{ chatId: CHAT, phone: '79001234567', title: '79001234567', unreadCount: 0 }])
  })

  it('does not duplicate an existing chat and resets its unread counter', () => {
    store().receiveIncoming(incoming())
    expect(store().chats[0].unreadCount).toBe(1)
    store().openChat('+7 900 123 45 67')
    expect(store().chats).toHaveLength(1)
    expect(store().chats[0].unreadCount).toBe(0)
    expect(store().activeChatId).toBe(CHAT)
  })

  it('setActiveChat resets unread of the selected chat only', () => {
    store().receiveIncoming(incoming())
    store().receiveIncoming(incoming({ idMessage: 'in-2', chatId: '111@c.us' }))
    store().setActiveChat(CHAT)
    const byId = Object.fromEntries(store().chats.map((c) => [c.chatId, c.unreadCount]))
    expect(byId).toEqual({ [CHAT]: 0, '111@c.us': 1 })
    store().setActiveChat(null)
    expect(store().activeChatId).toBeNull()
  })
})

describe('outgoing messages', () => {
  it('adds a pending message with a temporary id', () => {
    store().openChat('79001234567')
    const tempId = store().addOutgoing(CHAT, 'hello')
    expect(isTempId(tempId)).toBe(true)
    expect(store().messages[CHAT]).toEqual([
      expect.objectContaining({ id: tempId, text: 'hello', direction: 'outgoing', status: 'pending' }),
    ])
  })

  it('generates unique temporary ids', () => {
    const a = store().addOutgoing(CHAT, 'a')
    const b = store().addOutgoing(CHAT, 'b')
    expect(a).not.toBe(b)
  })

  it('replaces the temporary id with idMessage on success', () => {
    const tempId = store().addOutgoing(CHAT, 'hello')
    store().resolveOutgoing(tempId, { status: 'sent', idMessage: 'BAE5' })
    expect(store().messages[CHAT]).toEqual([expect.objectContaining({ id: 'BAE5', status: 'sent' })])
  })

  it('marks the message failed and keeps the temporary id on error', () => {
    const tempId = store().addOutgoing(CHAT, 'hello')
    store().resolveOutgoing(tempId, { status: 'failed' })
    expect(store().messages[CHAT]).toEqual([expect.objectContaining({ id: tempId, status: 'failed' })])
  })

  it('ignores an unknown temporary id', () => {
    store().addOutgoing(CHAT, 'hello')
    const before = store().messages
    store().resolveOutgoing('local:nope', { status: 'sent', idMessage: 'X' })
    expect(store().messages).toBe(before)
  })

  it('creates the chat when sending to an unknown chatId', () => {
    store().addOutgoing('555@c.us', 'hello')
    expect(store().chats).toEqual([{ chatId: '555@c.us', phone: '555', title: '555', unreadCount: 0 }])
  })
})

describe('receiveIncoming', () => {
  it('creates the chat titled by senderName and counts unread', () => {
    store().receiveIncoming(incoming())
    expect(store().chats).toEqual([{ chatId: CHAT, phone: '79001234567', title: 'Alice', unreadCount: 1 }])
    expect(store().messages[CHAT]).toEqual([
      { id: 'in-1', chatId: CHAT, text: 'hi', direction: 'incoming', status: 'received', timestamp: 1_000 },
    ])
  })

  it('falls back to the phone when there is no senderName', () => {
    store().receiveIncoming(incoming({ senderName: undefined }))
    expect(store().chats[0].title).toBe('79001234567')
  })

  it('dedupes by idMessage', () => {
    store().receiveIncoming(incoming())
    const snapshot = store().messages
    store().receiveIncoming(incoming())
    expect(store().messages).toBe(snapshot)
    expect(store().messages[CHAT]).toHaveLength(1)
    expect(store().chats[0].unreadCount).toBe(1)
  })

  it('does not bump unread for the active chat', () => {
    store().openChat('79001234567')
    store().receiveIncoming(incoming())
    store().receiveIncoming(incoming({ idMessage: 'in-2' }))
    expect(store().chats[0].unreadCount).toBe(0)
  })

  it('names a chat opened by phone once the contact replies', () => {
    store().openChat('79001234567')
    store().receiveIncoming(incoming())
    expect(store().chats[0].title).toBe('Alice')
  })

  it('keeps messages ordered by timestamp', () => {
    store().receiveIncoming(incoming({ idMessage: 'b', timestamp: 2_000 }))
    store().receiveIncoming(incoming({ idMessage: 'a', timestamp: 1_000 }))
    store().receiveIncoming(incoming({ idMessage: 'c', timestamp: 3_000 }))
    expect(store().messages[CHAT].map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('selectors', () => {
  it('sorts chats by last message, newest first; empty chats stay on top', () => {
    store().receiveIncoming(incoming({ idMessage: '1', chatId: 'old@c.us', timestamp: 1_000 }))
    store().receiveIncoming(incoming({ idMessage: '2', chatId: 'new@c.us', timestamp: 5_000 }))
    store().receiveIncoming(incoming({ idMessage: '3', chatId: 'old@c.us', timestamp: 9_000 }))
    store().openChat('111')
    expect(selectSortedChats(store()).map((c) => c.chatId)).toEqual(['111@c.us', 'old@c.us', 'new@c.us'])
  })

  it('selectSortedChats returns a stable reference while inputs are unchanged', () => {
    store().receiveIncoming(incoming())
    const first = selectSortedChats(store())
    expect(selectSortedChats(store())).toBe(first)
    store().receiveIncoming(incoming({ idMessage: 'in-2' }))
    expect(selectSortedChats(store())).not.toBe(first)
  })

  it('selectLastMessage returns the newest message of the chat', () => {
    expect(selectLastMessage(CHAT)(store())).toBeUndefined()
    store().receiveIncoming(incoming())
    store().addOutgoing(CHAT, 'reply')
    expect(selectLastMessage(CHAT)(store())?.text).toBe('reply')
  })
})

describe('logout', () => {
  it('clears everything', () => {
    store().login(creds)
    store().openChat('79001234567')
    store().addOutgoing(CHAT, 'hello')
    store().logout()
    expect(store()).toMatchObject({ credentials: null, chats: [], messages: {}, activeChatId: null })
  })
})

describe('persistence', () => {
  it('keeps credentials in sessionStorage, never in localStorage', () => {
    store().login(creds)
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).toEqual(creds)
    for (let i = 0; i < localStorage.length; i++) {
      expect(localStorage.getItem(localStorage.key(i)!)).not.toContain(creds.apiTokenInstance)
    }
  })

  it('stores chats and messages in localStorage under the idInstance key', () => {
    store().login(creds)
    store().receiveIncoming(incoming())
    const saved = JSON.parse(localStorage.getItem(historyKey(creds.idInstance))!)
    expect(saved.chats).toHaveLength(1)
    expect(saved.messages[CHAT]).toHaveLength(1)
    expect(saved).not.toHaveProperty('credentials')
  })

  it('logout removes the session but keeps the instance history for the next login', () => {
    store().login(creds)
    store().receiveIncoming(incoming())
    store().logout()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()

    store().login(creds)
    expect(store().chats).toHaveLength(1)
    expect(store().messages[CHAT]).toHaveLength(1)
  })

  it('does not mix histories of different instances', () => {
    store().login(creds)
    store().receiveIncoming(incoming())
    store().logout()
    store().login(otherCreds)
    expect(store().chats).toEqual([])
    expect(store().messages).toEqual({})
  })

  it('rehydrates after reload and turns stale pending messages into failed', async () => {
    store().login(creds)
    store().receiveIncoming(incoming())
    const tempId = store().addOutgoing(CHAT, 'in flight')
    store().setActiveChat(CHAT)

    // Simulate a page reload: memory is gone, storages survive.
    useChatStore.setState({ credentials: null, chats: [], messages: {}, activeChatId: null }, false)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(creds))
    await useChatStore.persist.rehydrate()

    expect(store().credentials).toEqual(creds)
    expect(store().activeChatId).toBe(CHAT)
    expect(store().messages[CHAT]).toEqual([
      expect.objectContaining({ id: 'in-1', status: 'received' }),
      expect.objectContaining({ id: tempId, status: 'failed' }),
    ])
  })

  it('stays logged out when the session is empty', async () => {
    localStorage.setItem(historyKey(creds.idInstance), JSON.stringify({ chats: [], messages: {}, activeChatId: null }))
    await useChatStore.persist.rehydrate()
    expect(store().credentials).toBeNull()
  })

  it('ignores corrupted storage', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(creds))
    localStorage.setItem(historyKey(creds.idInstance), '{not json')
    await useChatStore.persist.rehydrate()
    expect(store().credentials).toEqual(creds)
    expect(store().chats).toEqual([])
  })
})
