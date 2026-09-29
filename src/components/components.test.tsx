// Behaviour tests with plain react-dom (no testing-library in the project).
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { NewChatDialog } from './NewChatDialog'
import { LoginForm } from './LoginForm'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(ui: ReactNode) {
  act(() => root.render(ui))
}

/** Sets a controlled input's value the way React listens for it. */
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function key(el: Element, k: string, init: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
    )
  })
}

describe('MessageInput', () => {
  it('disables send for blank text', () => {
    render(<MessageInput onSend={vi.fn()} />)
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Отправить"]')!
    expect(button.disabled).toBe(true)
    type(container.querySelector('textarea')!, '   ')
    expect(button.disabled).toBe(true)
  })

  it('sends trimmed text on Enter and clears the field', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} />)
    const textarea = container.querySelector('textarea')!
    type(textarea, '  привет  ')
    key(textarea, 'Enter')
    expect(onSend).toHaveBeenCalledWith('привет')
    expect(textarea.value).toBe('')
  })

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn()
    render(<MessageInput onSend={onSend} />)
    const textarea = container.querySelector('textarea')!
    type(textarea, 'строка')
    key(textarea, 'Enter', { shiftKey: true })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('inserts an emoji at the caret and keeps the picker open', () => {
    render(<MessageInput onSend={vi.fn()} />)
    const textarea = container.querySelector('textarea')!
    type(textarea, 'ab')
    textarea.setSelectionRange(1, 1)
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Эмодзи"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="👍"]')!.click())
    expect(textarea.value).toBe('a👍b')
    expect(textarea.selectionStart).toBe(3)
    expect(container.querySelector('[aria-label="Эмодзи"][role="dialog"]')).not.toBeNull()
    key(document.body, 'Escape')
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('MessageBubble', () => {
  const base = {
    id: '1',
    chatId: '10000000',
    text: 'hi',
    direction: 'outgoing' as const,
    timestamp: 0,
  }

  it('shows one check when sent and two when read', () => {
    render(<MessageBubble message={{ ...base, status: 'sent' }} />)
    expect(container.querySelector('[aria-label="Отправлено"] path')).not.toBeNull()
    render(<MessageBubble message={{ ...base, status: 'read' }} />)
    expect(container.querySelectorAll('[aria-label="Прочитано"] path')).toHaveLength(2)
  })

  it('offers to resend a failed message', () => {
    const onRetry = vi.fn()
    render(<MessageBubble message={{ ...base, status: 'failed' }} onRetry={onRetry} />)
    const retry = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Повторить'),
    )!
    act(() => retry.click())
    expect(onRetry).toHaveBeenCalledWith('1')
    render(<MessageBubble message={{ ...base, status: 'sent' }} onRetry={onRetry} />)
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('NewChatDialog', () => {
  it('renders nothing when closed', () => {
    render(<NewChatDialog open={false} onSubmit={vi.fn()} onClose={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<NewChatDialog open onSubmit={vi.fn()} onClose={onClose} />)
    key(container.querySelector('input')!, 'Escape')
    expect(onClose).toHaveBeenCalled()
  })

  it('validates empty phone and submits a filled one', () => {
    const onSubmit = vi.fn()
    render(<NewChatDialog open onSubmit={onSubmit} onClose={vi.fn()} />)
    const form = container.querySelector('form')!
    act(() => form.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/номер/i)
    type(container.querySelector('input')!, ' 79001234567 ')
    act(() => form.requestSubmit())
    expect(onSubmit).toHaveBeenCalledWith('79001234567')
  })
})

describe('LoginForm', () => {
  it('requires all fields and defaults apiUrl', () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)
    const [apiUrl, id, token] = Array.from(container.querySelectorAll('input'))
    expect(apiUrl.value).toBe('https://api.green-api.com')
    expect(token.type).toBe('password')
    const form = container.querySelector('form')!
    act(() => form.requestSubmit())
    expect(onSubmit).not.toHaveBeenCalled()
    type(id, '1101000000')
    type(token, 'secret')
    act(() => form.requestSubmit())
    expect(onSubmit).toHaveBeenCalledWith({
      apiUrl: 'https://api.green-api.com',
      idInstance: '1101000000',
      apiTokenInstance: 'secret',
    })
  })

  it('toggles token visibility', () => {
    render(<LoginForm onSubmit={vi.fn()} />)
    const token = container.querySelectorAll('input')[2]
    act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Показать токен"]')!.click(),
    )
    expect(token.type).toBe('text')
  })
})
