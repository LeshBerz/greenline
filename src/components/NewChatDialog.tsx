import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import styles from './NewChatDialog.module.css'

export interface NewChatDialogProps {
  open: boolean
  /** Receives the phone exactly as typed (trimmed); normalization is up to the caller. */
  onSubmit(phone: string): void
  onClose(): void
  /** Error from the caller, e.g. an invalid number. */
  error?: string
}

export function NewChatDialog({ open, ...props }: NewChatDialogProps) {
  // Mounting the form on every open gives it fresh state, so there is nothing to reset.
  return open ? <NewChatForm {...props} /> : null
}

function NewChatForm({ onSubmit, onClose, error }: Omit<NewChatDialogProps, 'open'>) {
  const id = useId()
  const [phone, setPhone] = useState('')
  const [localError, setLocalError] = useState<string>()
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input on open and return focus to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => opener?.focus?.()
  }, [])

  const shownError = localError ?? error

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = phone.trim()
    if (!value) {
      setLocalError('Введите номер телефона')
      inputRef.current?.focus()
      return
    }
    onSubmit(value)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !dialogRef.current) return
    // Keep focus inside the dialog.
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'input, button:not(:disabled)',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit} noValidate>
          <h2 id={`${id}-title`} className={styles.title}>
            Новый чат
          </h2>
          <label className={styles.label} htmlFor={`${id}-phone`}>
            Номер телефона получателя
          </label>
          <input
            ref={inputRef}
            id={`${id}-phone`}
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+7 900 123-45-67"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              setLocalError(undefined)
            }}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? `${id}-error` : `${id}-hint`}
          />
          {shownError ? (
            <p id={`${id}-error`} className={styles.error} role="alert">
              {shownError}
            </p>
          ) : (
            <p id={`${id}-hint`} className={styles.hint}>
              С кодом страны, например 79001234567
            </p>
          )}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={styles.primary}>
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
