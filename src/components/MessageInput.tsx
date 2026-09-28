import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { EmojiPicker } from './EmojiPicker'
import { IconButton } from './IconButton'
import { SendIcon, SmileIcon } from './icons'
import styles from './MessageInput.module.css'

const MAX_HEIGHT = 160

export interface MessageInputProps {
  /** Called with the trimmed text; the field is cleared right after. */
  onSend(text: string): void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Сообщение',
  autoFocus = false,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const caretRef = useRef<number | null>(null)
  const canSend = !disabled && text.trim().length > 0
  const closeEmoji = useCallback(() => setEmojiOpen(false), [])

  // Puts the caret right after an inserted emoji.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || caretRef.current === null) return
    el.setSelectionRange(caretRef.current, caretRef.current)
    caretRef.current = null
  }, [text])

  function insertEmoji(emoji: string) {
    const el = ref.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    caretRef.current = start + emoji.length
    setText(text.slice(0, start) + emoji + text.slice(end))
    el?.focus()
  }

  // Auto-grow up to MAX_HEIGHT, then scroll inside the textarea. Recomputed on resize too:
  // a height measured at another width (rotation, hidden tab) would otherwise stick.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
      el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [text])

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    setEmojiOpen(false)
    ref.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline; ignore Enter while an IME composition is active.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    send()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <textarea
        ref={ref}
        className={styles.textarea}
        rows={1}
        value={text}
        placeholder={placeholder}
        aria-label="Текст сообщения"
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <IconButton
        label={emojiOpen ? 'Скрыть эмодзи' : 'Эмодзи'}
        aria-expanded={emojiOpen}
        data-emoji-toggle
        disabled={disabled}
        className={styles.emojiToggle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setEmojiOpen((open) => !open)}
      >
        <SmileIcon size={22} />
      </IconButton>
      {emojiOpen && <EmojiPicker onPick={insertEmoji} onClose={closeEmoji} />}
      <IconButton
        type="submit"
        label="Отправить"
        variant="accent"
        disabled={!canSend}
        className={styles.send}
      >
        <SendIcon size={20} />
      </IconButton>
    </form>
  )
}
