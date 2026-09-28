// Owner: Integrator.
import { GreenApiError, type GreenApiClient } from '../../api/greenApi'
import { isValidPhone, normalizePhone, toChatId } from '../../lib/phone'
import type { Chat } from '../../types'

export type ResolveResult =
  { ok: true; phone: string; chatId: string } | { ok: false; error: string }

/**
 * Turns the phone typed in "new chat" into a chatId.
 *
 * Telegram reports incoming messages by a numeric chat id, not by "phone@c.us", so the id is
 * resolved with checkAccount; otherwise replies would land in a separate chat. An existing chat
 * with the same phone is reused without a request (GREEN-API warns against frequent checks).
 * If the instance does not support checkAccount (HTTP 4xx other than auth/limits, e.g. a
 * WhatsApp instance), the legacy "phone@c.us" id is used.
 */
export async function resolveChat(
  client: GreenApiClient,
  input: string,
  chats: Chat[],
): Promise<ResolveResult> {
  const phone = normalizePhone(input)
  if (!isValidPhone(phone)) {
    return { ok: false, error: 'Неверный номер: нужно 10–15 цифр с кодом страны' }
  }

  const known = chats.find((c) => c.phone === phone)
  if (known) return { ok: true, phone, chatId: known.chatId }

  try {
    const chatId = await client.checkAccount(phone)
    if (chatId) return { ok: true, phone, chatId }
    return {
      ok: false,
      error: 'На этом номере нет аккаунта мессенджера, или он скрыт настройками приватности',
    }
  } catch (error) {
    if (isUnsupported(error)) return { ok: true, phone, chatId: toChatId(phone) }
    return {
      ok: false,
      error: error instanceof GreenApiError ? error.message : 'Не удалось проверить номер',
    }
  }
}

function isUnsupported(error: unknown): boolean {
  if (!(error instanceof GreenApiError) || error.status === undefined) return false
  const { status } = error
  return status >= 400 && status < 500 && ![401, 403, 429, 466].includes(status)
}
