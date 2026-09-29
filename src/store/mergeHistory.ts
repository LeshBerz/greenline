// Owner: State role.
// Cross-tab sync: every tab keeps the whole history in memory and writes all of it to the same
// localStorage key, so a tab with an older copy would erase what another tab added. Instead,
// a tab merges the other tab's history into its own when localStorage changes.
import type { Chat, Message, MessageStatus } from '../types'
import type { ChatHistory } from './storage'

const RANK: Partial<Record<MessageStatus, number>> = { sent: 1, delivered: 2, read: 3 }

function rank(status: MessageStatus): number {
  return RANK[status] ?? 0
}

/**
 * Union of `local` and `remote` chats and messages (by chatId / message id); for a message
 * present in both, the more advanced delivery status wins. activeChatId and unread counters stay
 * local. A temporary (pending) message is kept only while it is ours or still present remotely:
 * once the other tab replaces it by its idMessage, the temporary copy must go.
 */
export function mergeHistory(
  local: ChatHistory,
  remote: ChatHistory,
  isOwnTempId: (id: string) => boolean,
  isTempId: (id: string) => boolean,
): ChatHistory {
  const knownChats = new Set(local.chats.map((c) => c.chatId))
  const chats: Chat[] = [...local.chats, ...remote.chats.filter((c) => !knownChats.has(c.chatId))]

  const messages: Record<string, Message[]> = {}
  const chatIds = new Set([...Object.keys(local.messages), ...Object.keys(remote.messages)])
  for (const chatId of chatIds) {
    const remoteList = remote.messages[chatId] ?? []
    const remoteIds = new Set(remoteList.map((m) => m.id))
    const byId = new Map<string, Message>()
    for (const m of local.messages[chatId] ?? []) {
      if (isTempId(m.id) && !isOwnTempId(m.id) && !remoteIds.has(m.id)) continue
      byId.set(m.id, m)
    }
    for (const m of remoteList) {
      const mine = byId.get(m.id)
      if (!mine || rank(m.status) > rank(mine.status)) byId.set(m.id, m)
    }
    messages[chatId] = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp)
  }

  return { chats, messages, activeChatId: local.activeChatId }
}
