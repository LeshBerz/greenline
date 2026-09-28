// Shared domain types. This file is the contract between roles:
// change it only via the Architect (see ROADMAP.md, "Contract changes").

/** GREEN-API instance credentials entered on the login screen. */
export interface Credentials {
  /** Base API host from the GREEN-API console, e.g. "https://api.green-api.com". */
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

/** Subset of GREEN-API getStateInstance values the app cares about. */
export type InstanceState =
  'authorized' | 'notAuthorized' | 'blocked' | 'starting' | 'yellowCard' | 'unknown'

export type MessageDirection = 'incoming' | 'outgoing'

/** Outgoing: pending -> sent -> delivered -> read (or failed). Incoming: received. */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'

/** Status of a sent message from an outgoingMessageStatus webhook. */
export interface OutgoingStatusUpdate {
  idMessage: string
  chatId: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

export interface Message {
  /** idMessage from GREEN-API, or a temporary local id while status is "pending". */
  id: string
  chatId: string
  text: string
  direction: MessageDirection
  status: MessageStatus
  /** Unix time in milliseconds. */
  timestamp: number
}

export interface Chat {
  /** GREEN-API chat id, e.g. "79001234567@c.us". */
  chatId: string
  /** Phone number as the user typed it, normalized to digits. */
  phone: string
  /** Display name: sender name from incoming messages, otherwise the phone. */
  title: string
  unreadCount: number
}

/** A text message extracted from an incomingMessageReceived webhook. */
export interface IncomingTextMessage {
  idMessage: string
  chatId: string
  senderName?: string
  text: string
  /** Unix time in milliseconds. */
  timestamp: number
}

/** One item taken from the GREEN-API notification queue. */
export interface QueueNotification {
  receiptId: number
  /** Parsed text message, or null for any other webhook type (to be deleted and skipped). */
  message: IncomingTextMessage | null
  /** Parsed outgoingMessageStatus webhook, if this notification is one. */
  status?: OutgoingStatusUpdate | null
}
