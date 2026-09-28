import { GreenApiError } from '../../api/greenApi'
import { createScriptedClient } from '../../hooks/testClient'
import type { Chat } from '../../types'
import { resolveChat } from './resolveChat'

function setup(checkAccount: (phone: string) => Promise<string | null>) {
  const { client } = createScriptedClient([])
  client.checkAccount.mockImplementation(checkAccount)
  return client
}

describe('resolveChat', () => {
  it('rejects an invalid phone without a request', async () => {
    const client = setup(async () => '1')
    await expect(resolveChat(client, '12-34', [])).resolves.toEqual({
      ok: false,
      error: expect.stringMatching(/Неверный номер/),
    })
    expect(client.checkAccount).not.toHaveBeenCalled()
  })

  it('uses the chatId returned by checkAccount', async () => {
    const client = setup(async () => '10000000')
    await expect(resolveChat(client, '8 900 123-45-67', [])).resolves.toEqual({
      ok: true,
      phone: '79001234567',
      chatId: '10000000',
    })
    expect(client.checkAccount).toHaveBeenCalledWith('79001234567')
  })

  it('reuses a known chat with the same phone', async () => {
    const client = setup(async () => 'other')
    const chats: Chat[] = [{ chatId: '10000000', phone: '79001234567', title: 'A', unreadCount: 0 }]
    await expect(resolveChat(client, '+79001234567', chats)).resolves.toMatchObject({
      chatId: '10000000',
    })
    expect(client.checkAccount).not.toHaveBeenCalled()
  })

  it('reports a number without an account', async () => {
    const client = setup(async () => null)
    await expect(resolveChat(client, '79001234567', [])).resolves.toMatchObject({ ok: false })
  })

  it('falls back to phone@c.us when checkAccount is not supported', async () => {
    const client = setup(async () => {
      throw new GreenApiError('not found', 404)
    })
    await expect(resolveChat(client, '79001234567', [])).resolves.toEqual({
      ok: true,
      phone: '79001234567',
      chatId: '79001234567@c.us',
    })
  })

  it('does not fall back on auth and network errors', async () => {
    for (const error of [new GreenApiError('bad keys', 401), new GreenApiError('offline')]) {
      const client = setup(async () => {
        throw error
      })
      await expect(resolveChat(client, '79001234567', [])).resolves.toEqual({
        ok: false,
        error: error.message,
      })
    }
  })
})
