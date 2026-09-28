// Display helpers for presentational components. Pure functions, no React.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** "HH:MM" in local time. */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Chat list time: "HH:MM" for today, "DD.MM" for this year, "DD.MM.YY" otherwise. */
export function formatListTime(timestamp: number, now: number = Date.now()): string {
  const d = new Date(timestamp)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) return formatTime(timestamp)
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
  if (d.getFullYear() === n.getFullYear()) return date
  return `${date}.${String(d.getFullYear()).slice(-2)}`
}

/** Up to two initials from a title; for phone-like titles, the last two digits. */
export function getInitials(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return '?'
  if (/^\+?[\d\s()-]+$/.test(trimmed)) return trimmed.replace(/\D/g, '').slice(-2) || '#'
  const words = trimmed.split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : Array.from(words[0]).slice(0, 2).join('')
  return letters.toUpperCase()
}

/** Stable 1..count index from a string (for avatar colors). */
export function hashIndex(value: string, count: number): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return (Math.abs(h) % count) + 1
}

/** "+7 900 123-45-67"-style formatting for digit-only phones; other input is returned as is. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  return digits ? `+${digits}` : phone
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** Day divider label: "Сегодня", "Вчера", "12 сентября" or "12 сентября 2025". */
export function formatDay(timestamp: number, now: number = Date.now()): string {
  const d = new Date(timestamp)
  const n = new Date(now)
  if (d.toDateString() === n.toDateString()) return 'Сегодня'
  const yesterday = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера'
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === n.getFullYear() ? base : `${base} ${d.getFullYear()}`
}
