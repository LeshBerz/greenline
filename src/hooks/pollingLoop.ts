// Owner: State role.
// The notification loop without React: easy to test with a mock client and fake timers.
import type { GreenApiClient } from '../api/greenApi'
import type { IncomingTextMessage, OutgoingStatusUpdate } from '../types'

export const BACKOFF_BASE_MS = 1_000
export const BACKOFF_MAX_MS = 30_000

/** 1s, 2s, 4s, ... capped at 30s. `attempt` is the number of consecutive failures minus one. */
export function getBackoffDelay(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS)
}

/** Resolves after `ms`, or immediately when the signal is aborted. Never rejects. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export interface PollingLoopOptions {
  /** Called on every network error before backing off. Defaults to console.warn. */
  onError?: (error: unknown, retryInMs: number) => void
  /** Called for outgoingMessageStatus notifications (delivered/read receipts). */
  onStatus?: (update: OutgoingStatusUpdate) => void
}

/**
 * receiveNotification -> onMessage (text messages only) -> deleteNotification, until `signal`
 * is aborted. Network errors back off exponentially; the delay resets after a successful call.
 * Errors thrown by onMessage are logged and do not stop the loop or skip the delete.
 * The returned promise never rejects.
 */
export async function runPollingLoop(
  client: GreenApiClient,
  onMessage: (message: IncomingTextMessage) => void,
  signal: AbortSignal,
  options: PollingLoopOptions = {},
): Promise<void> {
  const onError =
    options.onError ??
    ((error: unknown, retryInMs: number) =>
      console.warn(`[greenline] polling error, retry in ${retryInMs} ms`, error))
  let failures = 0

  const backOff = async (error: unknown) => {
    const delay = getBackoffDelay(failures)
    failures += 1
    onError(error, delay)
    await sleep(delay, signal)
  }

  while (!signal.aborted) {
    let notification
    try {
      notification = await client.receiveNotification(signal)
    } catch (error) {
      if (signal.aborted) return
      await backOff(error)
      continue
    }
    // Stopped while the request was in flight: leave the notification in the queue for the
    // next loop instead of handling it twice.
    if (signal.aborted) return
    failures = 0
    // Empty queue: the server already held the long poll, ask again right away.
    if (!notification) continue

    try {
      if (notification.message) onMessage(notification.message)
      if (notification.status) options.onStatus?.(notification.status)
    } catch (error) {
      console.error('[greenline] notification handler failed', error)
    }

    try {
      await client.deleteNotification(notification.receiptId)
    } catch (error) {
      // Not deleted: GREEN-API returns it again later; the store dedupes by idMessage.
      if (signal.aborted) return
      await backOff(error)
    }
  }
}
