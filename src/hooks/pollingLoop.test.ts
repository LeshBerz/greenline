import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBackoffDelay, runPollingLoop } from './pollingLoop'
import { createScriptedClient, textNotification } from './testClient'

const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('getBackoffDelay', () => {
  it('doubles from 1s and caps at 30s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(getBackoffDelay)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
    ])
  })
})

describe('runPollingLoop', () => {
  it('handles text messages and deletes every notification, including non-text ones', async () => {
    const { client } = createScriptedClient([
      textNotification(1),
      null,
      { receiptId: 2, message: null },
      textNotification(3),
    ])
    const onMessage = vi.fn()
    const controller = new AbortController()
    const loop = runPollingLoop(client, onMessage, controller.signal)
    await flush()

    expect(onMessage.mock.calls.map(([m]) => m.idMessage)).toEqual(['m1', 'm3'])
    expect(client.deleteNotification.mock.calls.map(([id]) => id)).toEqual([1, 2, 3])
    expect(client.receiveNotification).toHaveBeenCalledTimes(5)

    controller.abort()
    await expect(loop).resolves.toBeUndefined()
  })

  it('deletes the notification after onMessage, not before', async () => {
    const { client } = createScriptedClient([textNotification(1)])
    const order: string[] = []
    client.deleteNotification.mockImplementation(async () => {
      order.push('delete')
    })
    const controller = new AbortController()
    void runPollingLoop(client, () => order.push('handle'), controller.signal)
    await flush()
    expect(order).toEqual(['handle', 'delete'])
    controller.abort()
  })

  it('keeps going and still deletes when onMessage throws', async () => {
    const { client } = createScriptedClient([textNotification(1), textNotification(2)])
    const onMessage = vi.fn().mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const controller = new AbortController()
    void runPollingLoop(client, onMessage, controller.signal)
    await flush()
    expect(onMessage).toHaveBeenCalledTimes(2)
    expect(client.deleteNotification).toHaveBeenCalledWith(1)
    expect(client.deleteNotification).toHaveBeenCalledWith(2)
    controller.abort()
  })

  it('backs off 1s -> 2s -> 4s on network errors and resets after a success', async () => {
    const fail = () => new Error('network')
    const { client } = createScriptedClient([fail(), fail(), fail(), null, fail()])
    const onError = vi.fn()
    const controller = new AbortController()
    void runPollingLoop(client, vi.fn(), controller.signal, { onError })
    const calls = () => client.receiveNotification.mock.calls.length

    await flush()
    expect(calls()).toBe(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(calls()).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(calls()).toBe(2)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(calls()).toBe(3)
    await vi.advanceTimersByTimeAsync(3_999)
    expect(calls()).toBe(3)
    // 4s wait ends -> success (null) -> immediate retry -> error again, delay back to 1s.
    await vi.advanceTimersByTimeAsync(1)
    expect(calls()).toBe(5)
    expect(onError.mock.calls.map(([, delay]) => delay)).toEqual([1_000, 2_000, 4_000, 1_000])
    await vi.advanceTimersByTimeAsync(1_000)
    expect(calls()).toBe(6)
    controller.abort()
  })

  it('caps the backoff at 30s', async () => {
    const { client } = createScriptedClient(Array.from({ length: 8 }, () => new Error('down')))
    const onError = vi.fn()
    const controller = new AbortController()
    void runPollingLoop(client, vi.fn(), controller.signal, { onError })
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(onError.mock.calls.map(([, delay]) => delay)).toEqual([
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000,
    ])
    controller.abort()
  })

  it('backs off when deleteNotification fails', async () => {
    const { client } = createScriptedClient([textNotification(1)])
    client.deleteNotification.mockRejectedValueOnce(new Error('network'))
    const onError = vi.fn()
    const controller = new AbortController()
    void runPollingLoop(client, vi.fn(), controller.signal, { onError })
    await flush()
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 1_000)
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(client.receiveNotification).toHaveBeenCalledTimes(2)
    controller.abort()
  })

  it('stops on abort during a long poll', async () => {
    const { client, stats } = createScriptedClient([])
    const controller = new AbortController()
    const loop = runPollingLoop(client, vi.fn(), controller.signal)
    await flush()
    expect(stats.inFlight).toBe(1)
    controller.abort()
    await expect(loop).resolves.toBeUndefined()
    expect(stats.inFlight).toBe(0)
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
  })

  it('stops on abort during a backoff wait without another request', async () => {
    const { client } = createScriptedClient([new Error('network')])
    const controller = new AbortController()
    const loop = runPollingLoop(client, vi.fn(), controller.signal, { onError: vi.fn() })
    await flush()
    controller.abort()
    await expect(loop).resolves.toBeUndefined()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
  })

  it('does not handle a notification that arrives after abort', async () => {
    const controller = new AbortController()
    const { client } = createScriptedClient([])
    client.receiveNotification.mockImplementationOnce(async () => {
      controller.abort()
      return textNotification(1)
    })
    const onMessage = vi.fn()
    await runPollingLoop(client, onMessage, controller.signal)
    expect(onMessage).not.toHaveBeenCalled()
    expect(client.deleteNotification).not.toHaveBeenCalled()
  })

  it('does nothing when the signal is already aborted', async () => {
    const { client } = createScriptedClient([])
    const controller = new AbortController()
    controller.abort()
    await runPollingLoop(client, vi.fn(), controller.signal)
    expect(client.receiveNotification).not.toHaveBeenCalled()
  })
})
