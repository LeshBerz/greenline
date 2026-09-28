// Test helper: a scripted GreenApiClient. Not imported by app code.
import { vi } from 'vitest'
import type { GreenApiClient } from '../api/greenApi'
import type { QueueNotification } from '../types'

export type Step = QueueNotification | null | Error

/**
 * receiveNotification answers with the scripted steps in order (an Error step rejects), then
 * hangs like a long poll until the signal aborts. Tracks how many requests are in flight.
 */
export function createScriptedClient(steps: Step[]) {
  const queue = [...steps]
  const stats = { inFlight: 0, maxInFlight: 0 }

  const receiveNotification = vi.fn((signal?: AbortSignal) => {
    stats.inFlight += 1
    stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight)
    const done = () => {
      stats.inFlight -= 1
    }
    if (queue.length > 0) {
      const step = queue.shift()!
      done()
      return step instanceof Error ? Promise.reject(step) : Promise.resolve(step)
    }
    return new Promise<QueueNotification | null>((_, reject) => {
      const abort = () => {
        done()
        reject(new DOMException('Aborted', 'AbortError'))
      }
      if (signal?.aborted) abort()
      else signal?.addEventListener('abort', abort, { once: true })
    })
  })

  const client = {
    getStateInstance: vi.fn(async () => 'authorized' as const),
    sendMessage: vi.fn(async () => ({ idMessage: 'x' })),
    receiveNotification,
    deleteNotification: vi.fn(async (receiptId: number) => {
      void receiptId
    }),
  } satisfies GreenApiClient

  return { client, stats }
}

export function textNotification(
  receiptId: number,
  idMessage = `m${receiptId}`,
): QueueNotification {
  return {
    receiptId,
    message: {
      idMessage,
      chatId: '79001234567@c.us',
      text: `text ${receiptId}`,
      timestamp: receiptId,
    },
  }
}
