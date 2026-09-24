import { createGreenApiClient, GreenApiError, RECEIVE_TIMEOUT_SEC } from './greenApi'

const credentials = {
  apiUrl: 'https://api.example.test/',
  idInstance: '1100000001',
  apiTokenInstance: 'test-token',
}
const BASE = 'https://api.example.test/waInstance1100000001'

const fetchMock = vi.fn<typeof fetch>()

function respond(body: unknown, status = 200) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  fetchMock.mockResolvedValueOnce(new Response(text, { status }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createGreenApiClient', () => {
  it('strips trailing slashes from apiUrl', async () => {
    respond({ stateInstance: 'authorized' })
    const client = createGreenApiClient({ ...credentials, apiUrl: 'https://api.example.test///' })
    await client.getStateInstance()
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/getStateInstance/test-token`)
  })

  describe('getStateInstance', () => {
    it('requests the state and returns it', async () => {
      respond({ stateInstance: 'authorized' })
      const client = createGreenApiClient(credentials)
      await expect(client.getStateInstance()).resolves.toBe('authorized')
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${BASE}/getStateInstance/test-token`)
      expect(init?.method ?? 'GET').toBe('GET')
    })

    it('maps unknown values to "unknown"', async () => {
      respond({ stateInstance: 'sleepMode' })
      await expect(createGreenApiClient(credentials).getStateInstance()).resolves.toBe('unknown')
      respond('')
      await expect(createGreenApiClient(credentials).getStateInstance()).resolves.toBe('unknown')
    })
  })

  describe('sendMessage', () => {
    it('posts chatId and message as JSON and returns idMessage', async () => {
      respond({ idMessage: 'BAE5F4886AFFEEEE' })
      const client = createGreenApiClient(credentials)
      await expect(client.sendMessage('79001234567@c.us', 'Hello')).resolves.toEqual({
        idMessage: 'BAE5F4886AFFEEEE',
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${BASE}/sendMessage/test-token`)
      expect(init?.method).toBe('POST')
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(init?.body as string)).toEqual({ chatId: '79001234567@c.us', message: 'Hello' })
    })

    it('throws when idMessage is missing', async () => {
      respond({})
      await expect(createGreenApiClient(credentials).sendMessage('1@c.us', 'x')).rejects.toThrow(
        GreenApiError,
      )
    })
  })

  describe('receiveNotification', () => {
    it('requests with receiveTimeout and passes the abort signal', async () => {
      respond('null')
      const controller = new AbortController()
      const client = createGreenApiClient(credentials)
      await expect(client.receiveNotification(controller.signal)).resolves.toBeNull()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${BASE}/receiveNotification/test-token?receiveTimeout=${RECEIVE_TIMEOUT_SEC}`)
      expect(init?.signal).toBe(controller.signal)
    })

    it('treats an empty body as an empty queue', async () => {
      respond('')
      await expect(createGreenApiClient(credentials).receiveNotification()).resolves.toBeNull()
    })

    it('parses a text notification', async () => {
      respond({
        receiptId: 3,
        body: {
          typeWebhook: 'incomingMessageReceived',
          timestamp: 1700000000,
          idMessage: 'MSG-3',
          senderData: { chatId: '79001234567@c.us', senderName: 'Ivan' },
          messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Hi' } },
        },
      })
      await expect(createGreenApiClient(credentials).receiveNotification()).resolves.toEqual({
        receiptId: 3,
        message: {
          idMessage: 'MSG-3',
          chatId: '79001234567@c.us',
          senderName: 'Ivan',
          text: 'Hi',
          timestamp: 1700000000000,
        },
      })
    })

    it('rethrows AbortError untouched', async () => {
      const abort = new DOMException('The operation was aborted.', 'AbortError')
      fetchMock.mockRejectedValueOnce(abort)
      await expect(createGreenApiClient(credentials).receiveNotification()).rejects.toBe(abort)
    })
  })

  describe('deleteNotification', () => {
    it('sends DELETE with receiptId in the path', async () => {
      respond({ result: true })
      await expect(createGreenApiClient(credentials).deleteNotification(42)).resolves.toBeUndefined()
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${BASE}/deleteNotification/test-token/42`)
      expect(init?.method).toBe('DELETE')
    })
  })

  describe('errors', () => {
    it.each([401, 403])('reports invalid credentials on %i', async (status) => {
      respond('Unauthorized', status)
      const error = await createGreenApiClient(credentials)
        .getStateInstance()
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(GreenApiError)
      expect(error).toMatchObject({ status, message: 'Неверные idInstance или apiTokenInstance' })
    })

    it('reports rate limiting on 429', async () => {
      respond('Too Many Requests', 429)
      await expect(createGreenApiClient(credentials).sendMessage('1@c.us', 'x')).rejects.toMatchObject({
        name: 'GreenApiError',
        status: 429,
        message: expect.stringContaining('Слишком много запросов'),
      })
    })

    it('reports server errors on 500', async () => {
      respond('Internal Server Error', 500)
      await expect(createGreenApiClient(credentials).deleteNotification(1)).rejects.toMatchObject({
        name: 'GreenApiError',
        status: 500,
      })
    })

    it('wraps network failures', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      const error = await createGreenApiClient(credentials)
        .receiveNotification()
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(GreenApiError)
      expect(error).toMatchObject({ status: undefined, message: expect.stringContaining('Нет связи') })
    })

    it('rejects invalid JSON', async () => {
      respond('<html>oops</html>')
      await expect(createGreenApiClient(credentials).getStateInstance()).rejects.toThrow(
        'некорректный JSON',
      )
    })
  })
})
