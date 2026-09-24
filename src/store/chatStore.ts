// Owner: State role. The ChatState shape and action signatures are the contract with the UI role.
import { create } from 'zustand'
import type { Chat, Credentials, IncomingTextMessage, Message, MessageStatus } from '../types'

export interface ChatState {
  credentials: Credentials | null
  chats: Chat[]
  /** Messages grouped by chatId, oldest first. */
  messages: Record<string, Message[]>
  activeChatId: string | null

  login(credentials: Credentials): void
  logout(): void

  /** Creates the chat if it does not exist and makes it active. Returns its chatId. */
  openChat(phone: string): string
  setActiveChat(chatId: string | null): void

  /** Adds an outgoing message with status "pending". Returns the temporary id. */
  addOutgoing(chatId: string, text: string): string
  /** Updates a pending message after the send result is known (id may be replaced by idMessage). */
  resolveOutgoing(tempId: string, result: { status: MessageStatus; idMessage?: string }): void

  /** Adds an incoming message; creates the chat if needed; dedupes by idMessage; bumps unread if chat is not active. */
  receiveIncoming(message: IncomingTextMessage): void
}

export const useChatStore = create<ChatState>()(() => {
  throw new Error('Not implemented: State role, see docs/tasks/03-state.md')
})
