import type { Message, MessageStatus } from '../types'
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from './icons'
import { formatTime } from './format'
import styles from './MessageBubble.module.css'

export interface MessageBubbleProps {
  message: Message
  /** If set, a failed outgoing message shows a "send again" button. */
  onRetry?(messageId: string): void
}

const STATUS_LABELS: Partial<Record<MessageStatus, string>> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено. Проверьте соединение и данные инстанса',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  const label = STATUS_LABELS[status]
  if (!label) return null
  return (
    <span
      className={[styles.status, styles[status]].join(' ')}
      role="img"
      aria-label={label}
      title={label}
    >
      {status === 'pending' && <ClockIcon size={13} />}
      {(status === 'sent' || status === 'delivered') && <CheckIcon size={15} />}
      {status === 'read' && <DoubleCheckIcon size={17} />}
      {status === 'failed' && <AlertIcon size={15} />}
    </span>
  )
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const outgoing = message.direction === 'outgoing'
  const canRetry = outgoing && message.status === 'failed' && onRetry !== undefined
  return (
    <div className={[styles.row, outgoing ? styles.outgoing : styles.incoming].join(' ')}>
      <div
        className={[styles.bubble, message.status === 'failed' && styles.bubbleFailed]
          .filter(Boolean)
          .join(' ')}
      >
        <span className={styles.text}>
          {message.text}
          {/* Reserves room on the last line for the absolutely positioned time/status. */}
          <span className={outgoing ? styles.spacerOut : styles.spacerIn} aria-hidden="true" />
        </span>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && <StatusIcon status={message.status} />}
        </span>
      </div>
      {canRetry && (
        <button type="button" className={styles.retry} onClick={() => onRetry(message.id)}>
          Не отправлено. Повторить
        </button>
      )}
    </div>
  )
}
