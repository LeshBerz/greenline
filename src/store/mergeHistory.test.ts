import type { Message } from '../types'
import { mergeHistory } from './mergeHistory'
import type { ChatHistory } from './storage'

const CHAT = '10000000'
const chat = { chatId: CHAT, phone: '79001234567', title: 'Ivan', unreadCount: 0 }
const isTemp = (id: string) => id.startsWith('local:')

function msg(id: string, timestamp: number, status: Message['status'] = 'sent'): Message {
  return { id, chatId: CHAT, text: id, direction: 'outgoing', status, timestamp }
}

function history(messages: Message[], extra: Partial<ChatHistory> = {}): ChatHistory {
  return { chats: [chat], messages: { [CHAT]: messages }, activeChatId: null, ...extra }
}

describe('mergeHistory', () => {
  it('keeps messages from both tabs, ordered by time', () => {
    const merged = mergeHistory(
      history([msg('a', 1), msg('c', 3)]),
      history([msg('a', 1), msg('b', 2)]),
      () => false,
      isTemp,
    )
    expect(merged.messages[CHAT].map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('takes the more advanced status', () => {
    const merged = mergeHistory(
      history([msg('a', 1, 'sent'), msg('b', 2, 'read')]),
      history([msg('a', 1, 'read'), msg('b', 2, 'delivered')]),
      () => false,
      isTemp,
    )
    expect(merged.messages[CHAT].map((m) => m.status)).toEqual(['read', 'read'])
  })

  it('drops a foreign temporary copy once the other tab resolved it', () => {
    const merged = mergeHistory(
      history([msg('local:x', 1, 'pending'), msg('local:own', 2, 'pending')]),
      history([msg('idMessage-x', 1)]),
      (id) => id === 'local:own',
      isTemp,
    )
    expect(merged.messages[CHAT].map((m) => m.id)).toEqual(['idMessage-x', 'local:own'])
  })

  it('adds chats created in the other tab and keeps local activeChatId and unread', () => {
    const other = { chatId: '20000000', phone: '79007654321', title: 'Petr', unreadCount: 2 }
    const merged = mergeHistory(
      history([], { activeChatId: CHAT, chats: [{ ...chat, unreadCount: 1 }] }),
      { chats: [chat, other], messages: { '20000000': [] }, activeChatId: '20000000' },
      () => false,
      isTemp,
    )
    expect(merged.chats).toEqual([{ ...chat, unreadCount: 1 }, other])
    expect(merged.activeChatId).toBe(CHAT)
  })

  it('does not bring back chats that were not opened by phone', () => {
    const stray = { chatId: '30000000', phone: '30000000', title: 'Group', unreadCount: 1 }
    const merged = mergeHistory(
      history([]),
      { chats: [chat, stray], messages: { '30000000': [msg('s', 1)] }, activeChatId: null },
      () => false,
      isTemp,
    )
    expect(merged.chats).toEqual([chat])
    expect(merged.messages).toEqual({ [CHAT]: [] })
  })
})
