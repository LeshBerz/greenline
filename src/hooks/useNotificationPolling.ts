// Owner: State role.
import type { GreenApiClient } from '../api/greenApi'
import type { IncomingTextMessage } from '../types'

/**
 * Runs the receiveNotification -> handle -> deleteNotification loop while `client` is non-null.
 * Stops on unmount or when client becomes null. Backs off on network errors.
 */
export function useNotificationPolling(
  client: GreenApiClient | null,
  onMessage: (message: IncomingTextMessage) => void,
): void {
  void client
  void onMessage
  throw new Error('Not implemented: State role, see docs/tasks/03-state.md')
}
