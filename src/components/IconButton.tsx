import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as a native tooltip. */
  label: string
  children: ReactNode
  variant?: 'ghost' | 'accent'
}

export function IconButton({ label, children, variant = 'ghost', className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
