import { act, StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GreenApiClient } from '../api/greenApi'
import type { IncomingTextMessage } from '../types'
import { createScriptedClient, textNotification } from './testClient'
import { useNotificationPolling } from './useNotificationPolling'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

type Props = { client: GreenApiClient | null; onMessage: (m: IncomingTextMessage) => void }

function Poller({ client, onMessage }: Props) {
  useNotificationPolling(client, onMessage)
  return null
}

let root: Root | null = null

async function render(ui: ReactNode) {
  await act(async () => {
    root ??= createRoot(document.createElement('div'))
    root.render(ui)
  })
}

async function unmount() {
  await act(async () => root?.unmount())
  root = null
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
  await unmount()
})

describe('useNotificationPolling', () => {
  it('does not poll without a client', async () => {
    const { client } = createScriptedClient([])
    await render(<Poller client={null} onMessage={vi.fn()} />)
    expect(client.receiveNotification).not.toHaveBeenCalled()
  })

  it('runs exactly one loop under StrictMode', async () => {
    const { client, stats } = createScriptedClient([textNotification(1)])
    const onMessage = vi.fn()
    await render(
      <StrictMode>
        <Poller client={client} onMessage={onMessage} />
      </StrictMode>,
    )
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(stats.inFlight).toBe(1)
    expect(stats.maxInFlight).toBe(1)
  })

  it('stops polling on unmount', async () => {
    const { client, stats } = createScriptedClient([])
    await render(<Poller client={client} onMessage={vi.fn()} />)
    expect(stats.inFlight).toBe(1)
    await unmount()
    expect(stats.inFlight).toBe(0)
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
  })

  it('switches clients without overlapping loops', async () => {
    const a = createScriptedClient([])
    const b = createScriptedClient([textNotification(7)])
    const onMessage = vi.fn()
    await render(<Poller client={a.client} onMessage={onMessage} />)
    await render(<Poller client={b.client} onMessage={onMessage} />)
    expect(a.stats.inFlight).toBe(0)
    expect(b.stats.inFlight).toBe(1)
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ idMessage: 'm7' }))

    await render(<Poller client={null} onMessage={onMessage} />)
    expect(b.stats.inFlight).toBe(0)
  })

  it('uses the latest onMessage without restarting the loop', async () => {
    const { client } = createScriptedClient([])
    let deliver: ((n: ReturnType<typeof textNotification>) => void) | null = null
    client.receiveNotification.mockImplementationOnce(
      () => new Promise((resolve) => (deliver = resolve)),
    )
    const first = vi.fn()
    const second = vi.fn()
    await render(<Poller client={client} onMessage={first} />)
    await render(<Poller client={client} onMessage={second} />)
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)

    await act(async () => deliver!(textNotification(1)))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(client.receiveNotification).toHaveBeenCalledTimes(2)
  })
})
