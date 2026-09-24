// Owner: API role. Contract (interface + factory signature) is fixed by the Architect.
import type { Credentials, InstanceState, QueueNotification } from '../types'

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'GreenApiError'
  }
}

export interface GreenApiClient {
  /** GET getStateInstance. Used on login to validate credentials. */
  getStateInstance(): Promise<InstanceState>
  /** POST sendMessage. Returns idMessage. */
  sendMessage(chatId: string, text: string): Promise<{ idMessage: string }>
  /**
   * GET receiveNotification (HTTP API, long polling).
   * Resolves to null when the queue is empty.
   */
  receiveNotification(signal?: AbortSignal): Promise<QueueNotification | null>
  /** DELETE deleteNotification/{receiptId}. */
  deleteNotification(receiptId: number): Promise<void>
}

export function createGreenApiClient(credentials: Credentials): GreenApiClient {
  void credentials
  throw new Error('Not implemented: API role, see docs/tasks/01-api.md')
}
