// Dev-only showcase of all presentational components on mock data. Not part of the app bundle.
import { useEffect, useRef, useState } from 'react'
import type { Chat, Credentials, Message } from '../types'
import {
  ChatLayout,
  ChatWindow,
  LoginForm,
  MessageBubble,
  NewChatDialog,
  Sidebar,
} from '../components'
import { mockChats, mockMessages, sampleBubbles } from './mocks'
import styles from './Showcase.module.css'

function noop() {}

/** Live mock of the main screen: select chats, send messages, create chats. */
function AppDemo({ onEvent }: { onEvent(text: string): void }) {
  const [chats, setChats] = useState<Chat[]>(mockChats)
  const [messages, setMessages] = useState<Record<string, Message[]>>(mockMessages)
  const [activeChatId, setActiveChatId] = useState<string | null>(mockChats[0].chatId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState<string>()
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const activeChat = chats.find((c) => c.chatId === activeChatId) ?? null

  function update(chatId: string, fn: (list: Message[]) => Message[]) {
    setMessages((m) => ({ ...m, [chatId]: fn(m[chatId] ?? []) }))
  }

  function select(chatId: string) {
    setActiveChatId(chatId)
    setChats((cs) => cs.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c)))
  }

  function send(text: string) {
    if (!activeChatId) return
    const chatId = activeChatId
    const id = `local-${Date.now()}`
    update(chatId, (l) => [...l, { id, chatId, text, direction: 'outgoing', status: 'pending', timestamp: Date.now() }])
    onEvent(`onSend(${JSON.stringify(text)})`)
    // Text containing "ошибка" fails; otherwise sent after a second, then a mock reply arrives.
    const failed = /ошибка|fail/i.test(text)
    timers.current.push(
      window.setTimeout(() => {
        update(chatId, (l) => l.map((m) => (m.id === id ? { ...m, status: failed ? 'failed' : 'sent' } : m)))
      }, 1000),
    )
    if (!failed) {
      timers.current.push(
        window.setTimeout(() => {
          update(chatId, (l) => [
            ...l,
            {
              id: `reply-${Date.now()}`,
              chatId,
              text: `Ответ на «${text.slice(0, 40)}»`,
              direction: 'incoming',
              status: 'received',
              timestamp: Date.now(),
            },
          ])
        }, 2500),
      )
    }
  }

  function createChat(phone: string) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) {
      setDialogError('Некорректный номер: нужно 10–15 цифр с кодом страны')
      return
    }
    const chatId = `${digits}@c.us`
    if (!chats.some((c) => c.chatId === chatId)) {
      setChats((cs) => [{ chatId, phone: digits, title: digits, unreadCount: 0 }, ...cs])
    }
    setActiveChatId(chatId)
    setDialogOpen(false)
    onEvent(`onSubmit(${JSON.stringify(phone)})`)
  }

  return (
    <>
      <ChatLayout
        showChat={activeChatId !== null}
        sidebar={
          <Sidebar
            chats={chats}
            messages={messages}
            activeChatId={activeChatId}
            onSelectChat={select}
            onNewChat={() => {
              setDialogError(undefined)
              setDialogOpen(true)
            }}
            onLogout={() => onEvent('onLogout()')}
            accountLabel="Инстанс 1101000000"
          />
        }
        chat={
          <ChatWindow
            chat={activeChat}
            messages={activeChatId ? (messages[activeChatId] ?? []) : []}
            onSend={send}
            onBack={() => setActiveChatId(null)}
            autoFocusInput={false}
          />
        }
      />
      <NewChatDialog
        open={dialogOpen}
        error={dialogError}
        onSubmit={createChat}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}

export function Showcase() {
  const [lastEvent, setLastEvent] = useState('—')
  const [dialog, setDialog] = useState<'closed' | 'plain' | 'error'>('closed')
  const log = (text: string) => setLastEvent(text)
  const logLogin = (c: Credentials) => log(`LoginForm.onSubmit(idInstance: ${c.idInstance})`)

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <h1>Greenline: витрина компонентов</h1>
        <p className={styles.event} aria-live="polite">
          Последний колбэк: <code>{lastEvent}</code>
        </p>
      </header>

      <section className={styles.section}>
        <h2>Главный экран (интерактивно)</h2>
        <p className={styles.note}>
          Отправьте сообщение: сначала часики, через секунду галочка, потом мок-ответ. Текст со словом
          «ошибка» станет failed. На ширине &lt; 768px виден либо список, либо чат с кнопкой «назад».
        </p>
        <div className={styles.appFrame}>
          <AppDemo onEvent={log} />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Экран входа</h2>
        <div className={styles.grid}>
          <div className={styles.cell}>
            <h3>По умолчанию</h3>
            <LoginForm onSubmit={logLogin} />
          </div>
          <div className={styles.cell}>
            <h3>Загрузка</h3>
            <LoginForm
              onSubmit={logLogin}
              loading
              initialValues={{ idInstance: '1101000000', apiTokenInstance: 'demo-token' }}
            />
          </div>
          <div className={styles.cell}>
            <h3>Ошибка входа</h3>
            <LoginForm
              onSubmit={logLogin}
              error="Не удалось войти: инстанс не авторизован (notAuthorized). Проверьте idInstance и apiTokenInstance."
              initialValues={{ idInstance: '1101000000', apiTokenInstance: 'wrong-token' }}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Диалог «Новый чат»</h2>
        <div className={styles.buttons}>
          <button type="button" className={styles.button} onClick={() => setDialog('plain')}>
            Открыть диалог
          </button>
          <button type="button" className={styles.button} onClick={() => setDialog('error')}>
            Открыть с ошибкой
          </button>
        </div>
        <NewChatDialog
          open={dialog !== 'closed'}
          error={dialog === 'error' ? 'Номер не найден в мессенджере' : undefined}
          onSubmit={(phone) => {
            log(`NewChatDialog.onSubmit(${JSON.stringify(phone)})`)
            setDialog('closed')
          }}
          onClose={() => setDialog('closed')}
        />
      </section>

      <section className={styles.section}>
        <h2>Пустые состояния</h2>
        <div className={styles.grid}>
          <div className={`${styles.cell} ${styles.panel}`}>
            <h3>Чат не выбран</h3>
            <div className={styles.panelBody}>
              <ChatWindow chat={null} messages={[]} onSend={noop} />
            </div>
          </div>
          <div className={`${styles.cell} ${styles.panel}`}>
            <h3>Чат без сообщений</h3>
            <div className={styles.panelBody}>
              <ChatWindow
                chat={mockChats[2]}
                messages={[]}
                onSend={(t) => log(`onSend(${JSON.stringify(t)})`)}
                autoFocusInput={false}
              />
            </div>
          </div>
          <div className={`${styles.cell} ${styles.panel}`}>
            <h3>Нет чатов</h3>
            <div className={styles.panelBody}>
              <Sidebar
                chats={[]}
                activeChatId={null}
                onSelectChat={noop}
                onNewChat={() => log('onNewChat()')}
                onLogout={() => log('onLogout()')}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Пузыри сообщений</h2>
        <div className={styles.bubbles}>
          {sampleBubbles.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </section>
    </div>
  )
}
