import { GreenApiError } from './errors'
import { parseNotification } from './parseNotification'

function incoming(messageData: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  return {
    receiptId: 7,
    body: {
      typeWebhook: 'incomingMessageReceived',
      instanceData: { idInstance: 1100000000, wid: '70000000000@c.us', typeInstance: 'telegram' },
      timestamp: 1700000000,
      idMessage: 'MSG-1',
      senderData: {
        chatId: '79001234567@c.us',
        sender: '79001234567@c.us',
        chatName: 'Ivan',
        senderName: 'Ivan Petrov',
      },
      messageData,
      ...overrides,
    },
  }
}

describe('parseNotification', () => {
  it('returns null for an empty queue', () => {
    expect(parseNotification(null)).toBeNull()
    expect(parseNotification(undefined)).toBeNull()
  })

  it('parses a textMessage and converts the timestamp to milliseconds', () => {
    const raw = incoming({ typeMessage: 'textMessage', textMessageData: { textMessage: 'Hello' } })
    expect(parseNotification(raw)).toEqual({
      receiptId: 7,
      message: {
        idMessage: 'MSG-1',
        chatId: '79001234567@c.us',
        senderName: 'Ivan Petrov',
        text: 'Hello',
        timestamp: 1700000000000,
      },
    })
  })

  it('parses an extendedTextMessage', () => {
    const raw = incoming({
      typeMessage: 'extendedTextMessage',
      extendedTextMessageData: { text: 'See https://example.com', description: '', title: '' },
    })
    expect(parseNotification(raw)?.message?.text).toBe('See https://example.com')
  })

  it('parses a reply (quotedMessage) as text', () => {
    const raw = incoming({
      typeMessage: 'quotedMessage',
      extendedTextMessageData: { text: 'Reply', stanzaId: 'MSG-0', participant: '10000000' },
      quotedMessage: { stanzaId: 'MSG-0', typeMessage: 'textMessage', textMessage: 'Hello' },
    })
    expect(parseNotification(raw)?.message?.text).toBe('Reply')
  })

  it('keeps a numeric Telegram chatId as is and falls back to chatName', () => {
    const raw = incoming(
      { typeMessage: 'textMessage', textMessageData: { textMessage: 'Hi' } },
      { senderData: { chatId: '10000000', sender: '10000000', chatName: 'Ivan', senderName: '' } },
    )
    const message = parseNotification(raw)?.message
    expect(message?.chatId).toBe('10000000')
    expect(message?.senderName).toBe('Ivan')
  })

  it('returns message null for an image', () => {
    const raw = incoming({
      typeMessage: 'imageMessage',
      fileMessageData: { downloadUrl: 'https://example.com/a.jpg', caption: '' },
    })
    expect(parseNotification(raw)).toEqual({ receiptId: 7, message: null })
  })

  it('returns message null for outgoing messages', () => {
    const messageData = { typeMessage: 'textMessage', textMessageData: { textMessage: 'Mine' } }
    for (const typeWebhook of ['outgoingMessageReceived', 'outgoingAPIMessageReceived']) {
      const raw = incoming(messageData, { typeWebhook })
      expect(parseNotification(raw)).toEqual({ receiptId: 7, message: null })
    }
  })

  it('returns message null for status webhooks and malformed bodies', () => {
    expect(
      parseNotification({ receiptId: 1, body: { typeWebhook: 'stateInstanceChanged' } }),
    ).toEqual({
      receiptId: 1,
      message: null,
    })
    expect(parseNotification({ receiptId: 2, body: null })).toEqual({ receiptId: 2, message: null })
    const noText = incoming({ typeMessage: 'textMessage', textMessageData: {} })
    expect(parseNotification(noText)?.message).toBeNull()
  })

  it('parses an outgoingMessageStatus webhook', () => {
    const body = {
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      instanceData: { idInstance: 1100000001, wid: '79001234567@c.us', typeInstance: 'telegram' },
      timestamp: 1755591519,
      idMessage: '115054445839974415',
      status: 'read',
    }
    expect(parseNotification({ receiptId: 3, body })).toEqual({
      receiptId: 3,
      message: null,
      status: { idMessage: '115054445839974415', chatId: '10000000', status: 'read' },
    })
  })

  it('skips statuses that cannot be matched to a message', () => {
    const noAccount = {
      typeWebhook: 'outgoingMessageStatus',
      chatId: '1@c.us',
      status: 'noAccount',
    }
    expect(parseNotification({ receiptId: 4, body: noAccount })).toEqual({
      receiptId: 4,
      message: null,
    })
  })

  it('throws GreenApiError when receiptId is missing', () => {
    expect(() => parseNotification({ body: {} })).toThrow(GreenApiError)
    expect(() => parseNotification('oops')).toThrow(GreenApiError)
  })
})
