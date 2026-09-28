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
import { isPersonalChat } from './isPersonalChat'
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

  // Stops when the page unmounts on logout. Groups and channels are skipped (their
  // notifications are still deleted from the queue by the polling loop).
  useNotificationPolling(
    client,
    (message) => {
      if (isPersonalChat(message.chatId)) receiveIncoming(message)
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

  async function handleSend(text: string) {
    if (!activeChat) return
    const tempId = addOutgoing(activeChat.chatId, text)
    try {
      const { idMessage } = await client.sendMessage(activeChat.chatId, text)
      resolveOutgoing(tempId, { status: 'sent', idMessage })
    } catch (error) {
      console.warn('[greenline] sendMessage failed', error)
      resolveOutgoing(tempId, { status: 'failed' })
    }
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
