// Owner: API role. Pure parsing of receiveNotification responses.
import type { IncomingTextMessage, OutgoingStatusUpdate, QueueNotification } from '../types'
import { GreenApiError } from './errors'

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Extracts the message text for supported text types, otherwise undefined. */
function extractText(messageData: Json): string | undefined {
  switch (messageData.typeMessage) {
    case 'textMessage': {
      const data = messageData.textMessageData
      return isObject(data) ? str(data.textMessage) : undefined
    }
    // A reply to a message ("quotedMessage") carries its text the same way as extendedTextMessage.
    case 'extendedTextMessage':
    case 'quotedMessage': {
      const data = messageData.extendedTextMessageData
      return isObject(data) ? str(data.text) : undefined
    }
    default:
      return undefined
  }
}

/** Turns an incomingMessageReceived webhook body into a text message, or null if it is not one. */
function parseBody(body: unknown): IncomingTextMessage | null {
  if (!isObject(body) || body.typeWebhook !== 'incomingMessageReceived') return null
  const { senderData, messageData } = body
  if (!isObject(senderData) || !isObject(messageData)) return null

  const idMessage = str(body.idMessage)
  const chatId = str(senderData.chatId)
  const text = extractText(messageData)
  if (!idMessage || !chatId || text === undefined) return null

  const timestamp = typeof body.timestamp === 'number' ? body.timestamp * 1000 : Date.now()
  const senderName = str(senderData.senderName) || str(senderData.chatName) || undefined
  return { idMessage, chatId, senderName, text, timestamp }
}

const OUTGOING_STATUSES: readonly OutgoingStatusUpdate['status'][] = [
  'sent',
  'delivered',
  'read',
  'failed',
]

/** Turns an outgoingMessageStatus webhook body into a status update, or null if it is not one. */
function parseStatus(body: unknown): OutgoingStatusUpdate | null {
  if (!isObject(body) || body.typeWebhook !== 'outgoingMessageStatus') return null
  const idMessage = str(body.idMessage)
  const chatId = str(body.chatId)
  const status = OUTGOING_STATUSES.find((known) => known === body.status)
  // "noAccount" and other statuses without idMessage cannot be matched to a message.
  if (!idMessage || !chatId || !status) return null
  return { idMessage, chatId, status }
}

/**
 * Parses a raw receiveNotification response.
 * Returns null for an empty queue; `message` is null for any non-text webhook,
 * `status` is null for anything but a known outgoingMessageStatus.
 * Throws GreenApiError if the response has no numeric receiptId (it could not be deleted).
 */
export function parseNotification(raw: unknown): QueueNotification | null {
  if (raw === null || raw === undefined) return null
  if (!isObject(raw) || typeof raw.receiptId !== 'number') {
    throw new GreenApiError('Неожиданный формат уведомления от GREEN-API')
  }
  const status = parseStatus(raw.body)
  return { receiptId: raw.receiptId, message: parseBody(raw.body), ...(status && { status }) }
}
