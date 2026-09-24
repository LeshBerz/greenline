// Owner: API role.

/** Strips everything except digits; converts a leading Russian "8" to "7". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  // "8 900 123-45-67" is the domestic form of "+7 900 123-45-67".
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

/** Returns true if the normalized phone looks like a valid international number. */
export function isValidPhone(phone: string): boolean {
  return /^\d{10,15}$/.test(phone)
}

/**
 * Builds a GREEN-API chatId from a normalized phone, e.g. "79001234567@c.us".
 * WhatsApp uses this format natively; Telegram accepts it for sending (legacy format),
 * but reports incoming chats by a numeric id. See the API role report.
 */
export function toChatId(phone: string): string {
  return `${phone}@c.us`
}
