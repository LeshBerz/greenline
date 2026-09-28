import type { Chat, Message } from '../types'
import { ChatListItem } from './ChatListItem'
import { IconButton } from './IconButton'
import { EditIcon, LogoIcon, LogoutIcon } from './icons'
import styles from './Sidebar.module.css'

export interface SidebarProps {
  /** Chats in display order (sorting is up to the caller). */
  chats: Chat[]
  /** Messages by chatId, oldest first (same shape as ChatState.messages); the last one is previewed. */
  messages?: Record<string, Message[]>
  activeChatId: string | null
  onSelectChat(chatId: string): void
  onNewChat(): void
  onLogout(): void
  /** Optional caption under the app name, e.g. the instance id. */
  accountLabel?: string
}

export function Sidebar({
  chats,
  messages,
  activeChatId,
  onSelectChat,
  onNewChat,
  onLogout,
  accountLabel,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Чаты">
      <header className={styles.header}>
        <LogoIcon size={32} />
        <div className={styles.brand}>
          <span className={styles.name}>Greenline</span>
          {accountLabel && <span className={styles.account}>{accountLabel}</span>}
        </div>
        <IconButton label="Новый чат" variant="accent" onClick={onNewChat}>
          <EditIcon size={18} />
        </IconButton>
        <IconButton label="Выйти" onClick={onLogout}>
          <LogoutIcon size={20} />
        </IconButton>
      </header>

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <p>Чатов пока нет</p>
          <button type="button" className={styles.emptyAction} onClick={onNewChat}>
            Создать чат
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {chats.map((chat) => {
            const list = messages?.[chat.chatId]
            return (
              <li key={chat.chatId}>
                <ChatListItem
                  chat={chat}
                  lastMessage={list?.[list.length - 1]}
                  active={chat.chatId === activeChatId}
                  onSelect={onSelectChat}
                />
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
