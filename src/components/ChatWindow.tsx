import { Fragment, useLayoutEffect, useRef } from 'react'
import type { Chat, Message } from '../types'
import { Avatar } from './Avatar'
import { IconButton } from './IconButton'
import { BackIcon, ChatIcon } from './icons'
import { formatDay, formatPhone } from './format'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import styles from './ChatWindow.module.css'

export interface ChatWindowProps {
  /** Active chat; null shows the "select a chat" empty state. */
  chat: Chat | null
  /** Messages of the active chat, oldest first. */
  messages: Message[]
  onSend(text: string): void
  /** Back to the chat list; the button is shown only on narrow screens (< 768px). */
  onBack?(): void
  /** Disables the input, e.g. while offline. */
  inputDisabled?: boolean
  /** Focus the input when a chat opens. Default true. */
  autoFocusInput?: boolean
}

/** Distance from the bottom (px) within which the feed keeps sticking to new messages. */
const STICK_THRESHOLD = 80

export function ChatWindow({
  chat,
  messages,
  onSend,
  onBack,
  inputDisabled,
  autoFocusInput = true,
}: ChatWindowProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const prevChatIdRef = useRef<string | null>(null)
  const last = messages[messages.length - 1]

  // Autoscroll: always on chat switch and on own messages; for incoming ones only if the user
  // is already near the bottom (so reading history is not interrupted).
  useLayoutEffect(() => {
    const el = feedRef.current
    if (!el) return
    const chatChanged = prevChatIdRef.current !== (chat?.chatId ?? null)
    prevChatIdRef.current = chat?.chatId ?? null
    if (chatChanged || atBottomRef.current || last?.direction === 'outgoing') {
      el.scrollTop = el.scrollHeight
      atBottomRef.current = true
    }
  }, [chat?.chatId, messages.length, last?.id, last?.direction])

  function handleScroll() {
    const el = feedRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD
  }

  if (!chat) {
    return (
      <section className={styles.window} aria-label="Переписка">
        <div className={styles.placeholder}>
          <ChatIcon size={56} className={styles.placeholderIcon} />
          <p>Выберите чат или создайте новый</p>
        </div>
      </section>
    )
  }

  const phone = formatPhone(chat.phone)

  return (
    <section className={styles.window} aria-label={`Переписка: ${chat.title}`}>
      <header className={styles.header}>
        {onBack && (
          <IconButton label="Назад к списку чатов" onClick={onBack} className={styles.back}>
            <BackIcon size={22} />
          </IconButton>
        )}
        <Avatar title={chat.title} colorKey={chat.chatId} size={40} />
        <div className={styles.heading}>
          <h2 className={styles.title}>{chat.title}</h2>
          {phone !== chat.title && <p className={styles.subtitle}>{phone}</p>}
        </div>
      </header>

      <div
        ref={feedRef}
        className={styles.feed}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
      >
        {messages.length === 0 ? (
          <p className={styles.noMessages}>Сообщений пока нет. Напишите первым.</p>
        ) : (
          <div className={styles.messages}>
            {messages.map((m, i) => {
              const day = formatDay(m.timestamp)
              const showDay = i === 0 || formatDay(messages[i - 1].timestamp) !== day
              return (
                <Fragment key={m.id}>
                  {showDay && (
                    <div className={styles.day}>
                      <span>{day}</span>
                    </div>
                  )}
                  <MessageBubble message={m} />
                </Fragment>
              )
            })}
          </div>
        )}
      </div>

      <MessageInput
        key={chat.chatId}
        onSend={onSend}
        disabled={inputDisabled}
        autoFocus={autoFocusInput}
      />
    </section>
  )
}
