import type { Chat, Message } from '../types'
import { Avatar } from './Avatar'
import { formatListTime, formatPhone } from './format'
import styles from './ChatListItem.module.css'

export interface ChatListItemProps {
  chat: Chat
  /** Last message in the chat, for the preview line and time. */
  lastMessage?: Message
  active?: boolean
  onSelect(chatId: string): void
}

export function ChatListItem({ chat, lastMessage, active = false, onSelect }: ChatListItemProps) {
  const unread = chat.unreadCount > 0
  const preview = lastMessage
    ? (lastMessage.direction === 'outgoing' ? 'Вы: ' : '') + lastMessage.text
    : formatPhone(chat.phone)
  const unreadLabel = unread ? `, непрочитанных: ${chat.unreadCount}` : ''

  return (
    <button
      type="button"
      className={[styles.item, active && styles.active].filter(Boolean).join(' ')}
      onClick={() => onSelect(chat.chatId)}
      aria-current={active ? 'true' : undefined}
      aria-label={`${chat.title}${unreadLabel}`}
    >
      <Avatar title={chat.title} colorKey={chat.chatId} />
      <span className={styles.body}>
        <span className={styles.row}>
          <span className={styles.title}>{chat.title}</span>
          {lastMessage && (
            <time className={styles.time} dateTime={new Date(lastMessage.timestamp).toISOString()}>
              {formatListTime(lastMessage.timestamp)}
            </time>
          )}
        </span>
        <span className={styles.row}>
          <span className={[styles.preview, lastMessage?.status === 'failed' && styles.previewFailed].filter(Boolean).join(' ')}>
            {preview}
          </span>
          {unread && (
            <span className={styles.badge} aria-hidden="true">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
