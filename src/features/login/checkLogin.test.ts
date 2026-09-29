import { checkLogin } from './checkLogin'

const credentials = {
  apiUrl: 'https://api.example.test',
  idInstance: '1100000001',
  apiTokenInstance: 'test-token',
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkLogin', () => {
  it('accepts an authorized instance', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ stateInstance: 'authorized' })))
    await expect(checkLogin(credentials)).resolves.toBeNull()
  })

  it('explains a not authorized instance', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ stateInstance: 'notAuthorized' })),
    )
    await expect(checkLogin(credentials)).resolves.toMatch(/не авторизован/)
  })

  it('reports wrong keys', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(checkLogin(credentials)).resolves.toMatch(/Неверные/)
  })

  it('reports a network failure instead of throwing', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(checkLogin(credentials)).resolves.toMatch(/Нет связи/)
  })
})
