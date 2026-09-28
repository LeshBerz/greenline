// Owner: API role. Contract (interface + factory signature) is fixed by the Architect.
import type { Credentials, InstanceState, QueueNotification } from '../types'
import { GreenApiError } from './errors'
import { parseNotification } from './parseNotification'

export { GreenApiError }

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

/** Seconds the server holds receiveNotification open when the queue is empty (GREEN-API: 5–60). */
export const RECEIVE_TIMEOUT_SEC = 5

const KNOWN_STATES: readonly InstanceState[] = [
  'authorized',
  'notAuthorized',
  'blocked',
  'starting',
  'yellowCard',
]

function errorMessage(status: number): string {
  if (status === 401 || status === 403) return 'Неверные idInstance или apiTokenInstance'
  if (status === 429) return 'Слишком много запросов к GREEN-API, попробуйте позже'
  if (status === 466) return 'Исчерпан лимит запросов тарифа GREEN-API'
  if (status >= 500) return `GREEN-API временно недоступен (HTTP ${status})`
  return `Ошибка запроса к GREEN-API (HTTP ${status})`
}

function isAbortError(error: unknown): boolean {
  // Duck-typed: DOMException differs between realms (browser, Node, jsdom).
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

export function createGreenApiClient(credentials: Credentials): GreenApiClient {
  const base = credentials.apiUrl.trim().replace(/\/+$/, '')
  const { idInstance, apiTokenInstance } = credentials

  const url = (method: string, suffix = '') =>
    `${base}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`

  /**
   * Performs a request and returns the parsed JSON body (null for an empty body).
   * An aborted request rethrows the original AbortError so callers can tell it from a failure.
   */
  async function request(input: string, init?: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await fetch(input, init)
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new GreenApiError('Нет связи с GREEN-API: проверьте интернет и apiUrl')
    }

    if (!response.ok) throw new GreenApiError(errorMessage(response.status), response.status)

    let text: string
    try {
      text = await response.text()
    } catch (error) {
      if (isAbortError(error)) throw error
      throw new GreenApiError('Не удалось прочитать ответ GREEN-API', response.status)
    }
    if (text.trim() === '') return null
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new GreenApiError('GREEN-API вернул некорректный JSON', response.status)
    }
  }

  return {
    async getStateInstance() {
      const data = await request(url('getStateInstance'))
      const state = (data as { stateInstance?: unknown } | null)?.stateInstance
      return KNOWN_STATES.find((known) => known === state) ?? 'unknown'
    },

    async sendMessage(chatId, text) {
      const data = await request(url('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: text }),
      })
      const idMessage = (data as { idMessage?: unknown } | null)?.idMessage
      if (typeof idMessage !== 'string' || idMessage === '') {
        throw new GreenApiError('GREEN-API не вернул idMessage')
      }
      return { idMessage }
    },

    async receiveNotification(signal) {
      const data = await request(
        url('receiveNotification', `?receiveTimeout=${RECEIVE_TIMEOUT_SEC}`),
        {
          signal,
        },
      )
      return parseNotification(data)
    },

    async deleteNotification(receiptId) {
      await request(url('deleteNotification', `/${receiptId}`), { method: 'DELETE' })
    },
  }
}
