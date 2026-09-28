// Owner: State role.
import { useEffect, useRef } from 'react'
import type { GreenApiClient } from '../api/greenApi'
import type { IncomingTextMessage, OutgoingStatusUpdate } from '../types'
import { runPollingLoop } from './pollingLoop'

// Tail of the currently running loop. A new loop starts only after the previous one has fully
// stopped, so two loops never poll at the same time: not on client change, not on remount and
// not under StrictMode's double effect run.
let lastLoop: Promise<void> = Promise.resolve()

/**
 * Runs the receiveNotification -> handle -> deleteNotification loop while `client` is non-null.
 * Stops on unmount or when client becomes null. Backs off on network errors.
 */
export function useNotificationPolling(
  client: GreenApiClient | null,
  onMessage: (message: IncomingTextMessage) => void,
  onStatus?: (update: OutgoingStatusUpdate) => void,
): void {
  // Latest callbacks without restarting the loop.
  const onMessageRef = useRef(onMessage)
  const onStatusRef = useRef(onStatus)
  useEffect(() => {
    onMessageRef.current = onMessage
    onStatusRef.current = onStatus
  }, [onMessage, onStatus])

  useEffect(() => {
    if (!client) return
    const controller = new AbortController()
    const { signal } = controller
    lastLoop = lastLoop.then(() =>
      signal.aborted
        ? undefined
        : runPollingLoop(client, (message) => onMessageRef.current(message), signal, {
            onStatus: (update) => onStatusRef.current?.(update),
          }),
    )
    return () => controller.abort()
  }, [client])
}
