// Owner: Integrator.
import { useMemo, useRef, useState } from 'react'
import { createGreenApiClient } from '../../api/greenApi'
import { ChatLayout, ChatWindow, NewChatDialog, Sidebar } from '../../components'
import { useNotificationPolling } from '../../hooks/useNotificationPolling'
import {
  selectActiveChat,
  selectActiveMessages,
  selectSortedChats,
  useChatStore,
} from '../../store/chatStore'
import type { Credentials } from '../../types'
import { resolveChat } from './resolveChat'

export function ChatPage({ credentials }: { credentials: Credentials }) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials])

  const chats = useChatStore(selectSortedChats)
  const messages = useChatStore((s) => s.messages)
  const activeChat = useChatStore(selectActiveChat) ?? null
  const activeMessages = useChatStore(selectActiveMessages)
  const {
    receiveIncoming,
    updateOutgoingStatus,
    openChat,
    setActiveChat,
    addOutgoing,
    resolveOutgoing,
    logout,
  } = useChatStore.getState()

  // Stops when the page unmounts on logout. Only chats the user created by phone are shown:
  // messages from other chats, groups and channels are skipped (the polling loop still
  // deletes them from the queue).
  useNotificationPolling(
    client,
    (message) => {
      const known = useChatStore.getState().chats.some((c) => c.chatId === message.chatId)
      if (known) receiveIncoming(message)
    },
    (update) => updateOutgoingStatus(update.idMessage, update.status),
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const resolving = useRef(false)

  async function handleNewChat(input: string) {
    if (resolving.current) return
    resolving.current = true
    setDialogError(undefined)
    const result = await resolveChat(client, input, useChatStore.getState().chats)
    resolving.current = false
    if (!result.ok) {
      setDialogError(result.error)
      return
    }
    openChat(result.phone, result.chatId)
    closeDialog()
  }

  function closeDialog() {
    setDialogOpen(false)
    setDialogError(undefined)
  }

  async function deliver(messageId: string, chatId: string, text: string) {
    try {
      const { idMessage } = await client.sendMessage(chatId, text)
      resolveOutgoing(messageId, { status: 'sent', idMessage })
    } catch (error) {
      console.warn('[greenline] sendMessage failed', error)
      resolveOutgoing(messageId, { status: 'failed' })
    }
  }

  function handleSend(text: string) {
    if (!activeChat) return
    void deliver(addOutgoing(activeChat.chatId, text), activeChat.chatId, text)
  }

  function handleRetry(messageId: string) {
    const message = activeMessages.find((m) => m.id === messageId)
    if (!message || message.status !== 'failed') return
    resolveOutgoing(messageId, { status: 'pending' })
    void deliver(messageId, message.chatId, message.text)
  }

  return (
    <>
      <ChatLayout
        showChat={activeChat !== null}
        sidebar={
          <Sidebar
            chats={chats}
            messages={messages}
            activeChatId={activeChat?.chatId ?? null}
            onSelectChat={setActiveChat}
            onNewChat={() => setDialogOpen(true)}
            onLogout={logout}
            accountLabel={`Инстанс ${credentials.idInstance}`}
          />
        }
        chat={
          <ChatWindow
            chat={activeChat}
            messages={activeMessages}
            onSend={handleSend}
            onRetry={handleRetry}
            onBack={() => setActiveChat(null)}
          />
        }
      />
      <NewChatDialog
        open={dialogOpen}
        onSubmit={handleNewChat}
        onClose={closeDialog}
        error={dialogError}
      />
    </>
  )
}
