import { getInitials, hashIndex } from './format'
import styles from './Avatar.module.css'

export interface AvatarProps {
  title: string
  /** Seed for the background color; defaults to the title. */
  colorKey?: string
  size?: number
}

export function Avatar({ title, colorKey, size = 48 }: AvatarProps) {
  const color = `var(--avatar-${hashIndex(colorKey ?? title, 6)})`
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: color }}
      aria-hidden="true"
    >
      {getInitials(title)}
    </span>
  )
}
