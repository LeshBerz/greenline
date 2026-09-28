// Owner: Integrator.

/**
 * True for one-to-one chats. The app shows only those: Telegram groups and channels have
 * negative ids ("-10000000000000"), WhatsApp groups end with "@g.us".
 */
export function isPersonalChat(chatId: string): boolean {
  return chatId !== '' && !chatId.startsWith('-') && !chatId.endsWith('@g.us')
}
