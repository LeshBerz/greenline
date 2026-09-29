import { useEffect, useRef } from 'react'
import styles from './EmojiPicker.module.css'

/** A short fixed set: emoji are plain text, so no library or images are needed. */
const EMOJI = [
  '😀 😂 🤣 😊 😍 😘 😉 😎',
  '🤔 😅 😭 😢 😡 😱 🥳 😴',
  '👍 👎 👌 👏 🙏 💪 🤝 👋',
  '❤️ 🔥 🎉 ✨ 💯 ✅ ❌ ⭐',
  '😁 🙂 🙃 😇 🤗 🤯 😬 🙈',
]
  .join(' ')
  .split(' ')

export interface EmojiPickerProps {
  onPick(emoji: string): void
  onClose(): void
}

/** Popover grid of emoji; closes on Escape or a click outside. */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      const target = e.target as Element | null
      // The toggle button handles its own clicks.
      if (target?.closest('[data-emoji-toggle]')) return
      if (ref.current && !ref.current.contains(target)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className={styles.panel} role="dialog" aria-label="Эмодзи">
      {EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={styles.emoji}
          aria-label={emoji}
          // Keep focus (and the caret) in the textarea.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
