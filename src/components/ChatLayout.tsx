import type { ReactNode } from 'react'
import styles from './ChatLayout.module.css'

export interface ChatLayoutProps {
  sidebar: ReactNode
  chat: ReactNode
  /**
   * Narrow screens (< 768px) show one pane at a time: the chat when true, the list when false.
   * Usually `activeChatId !== null`. Ignored on wide screens, where both panes are visible.
   */
  showChat: boolean
}

/** Two-pane shell: chat list on the left, conversation on the right. */
export function ChatLayout({ sidebar, chat, showChat }: ChatLayoutProps) {
  return (
    <div className={[styles.layout, showChat ? styles.chatOpen : styles.listOpen].join(' ')}>
      <div className={styles.sidebarPane}>{sidebar}</div>
      <main className={styles.chatPane}>{chat}</main>
    </div>
  )
}
