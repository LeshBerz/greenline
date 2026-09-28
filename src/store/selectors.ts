// Owner: State role.
// Selectors for useChatStore. Every selector returns a stable reference while its inputs are
// unchanged, so they are safe to pass straight to useChatStore(...) without useShallow.
import type { Chat, Message } from '../types'
import type { ChatState } from './chatStore'

type ChatSlice = Pick<ChatState, 'chats' | 'messages' | 'activeChatId'>

const EMPTY_MESSAGES: Message[] = []

let sortedCache: { chats: Chat[]; messages: ChatState['messages']; result: Chat[] } | null = null

/**
 * Chats ordered by their last message, newest first. Chats without messages (just opened via
 * "new chat") stay on top in creation order, so the chat the user just created is visible.
 */
export function selectSortedChats(state: ChatSlice): Chat[] {
  if (sortedCache && sortedCache.chats === state.chats && sortedCache.messages === state.messages) {
    return sortedCache.result
  }
  const lastTime = (chat: Chat): number => {
    const list = state.messages[chat.chatId]
    return list && list.length > 0 ? list[list.length - 1].timestamp : Number.POSITIVE_INFINITY
  }
  const result = state.chats
    .map((chat, index) => ({ chat, index, time: lastTime(chat) }))
    .sort((a, b) => (b.time === a.time ? a.index - b.index : b.time > a.time ? 1 : -1))
    .map(({ chat }) => chat)
  sortedCache = { chats: state.chats, messages: state.messages, result }
  return result
}

/** Usage: useChatStore(selectLastMessage(chatId)). */
export function selectLastMessage(chatId: string): (state: ChatSlice) => Message | undefined {
  return (state) => {
    const list = state.messages[chatId]
    return list && list.length > 0 ? list[list.length - 1] : undefined
  }
}

/** Usage: useChatStore(selectMessages(chatId)). Always returns an array, oldest first. */
export function selectMessages(chatId: string | null): (state: ChatSlice) => Message[] {
  return (state) => (chatId ? state.messages[chatId] : undefined) ?? EMPTY_MESSAGES
}

export function selectActiveChat(state: ChatSlice): Chat | undefined {
  return state.chats.find((c) => c.chatId === state.activeChatId)
}

export function selectActiveMessages(state: ChatSlice): Message[] {
  return selectMessages(state.activeChatId)(state)
}

export function selectTotalUnread(state: ChatSlice): number {
  return state.chats.reduce((sum, c) => sum + c.unreadCount, 0)
}
