import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { IconButton } from './IconButton'
import { SendIcon } from './icons'
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
  const ref = useRef<HTMLTextAreaElement>(null)
  const canSend = !disabled && text.trim().length > 0

  // Auto-grow up to MAX_HEIGHT, then scroll inside the textarea.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [text])

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
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
      <IconButton type="submit" label="Отправить" variant="accent" disabled={!canSend} className={styles.send}>
        <SendIcon size={20} />
      </IconButton>
    </form>
  )
}
