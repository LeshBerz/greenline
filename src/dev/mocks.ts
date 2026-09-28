// Mock data for the dev showcase. Phone numbers are fictional.
import type { Chat, Message } from '../types'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export const now = Date.now()

export const mockChats: Chat[] = [
  { chatId: '79001234567@c.us', phone: '79001234567', title: 'Анна Смирнова', unreadCount: 0 },
  { chatId: '79007654321@c.us', phone: '79007654321', title: 'Игорь', unreadCount: 3 },
  { chatId: '79005550101@c.us', phone: '79005550101', title: '79005550101', unreadCount: 0 },
  {
    chatId: '79005550202@c.us',
    phone: '79005550202',
    title: 'Очень длинное имя собеседника, которое не помещается в строку',
    unreadCount: 128,
  },
  { chatId: '79005550303@c.us', phone: '79005550303', title: 'Мария К.', unreadCount: 0 },
]

let seq = 0
function msg(
  chatId: string,
  direction: Message['direction'],
  text: string,
  ago: number,
  status?: Message['status'],
): Message {
  seq += 1
  return {
    id: `mock-${seq}`,
    chatId,
    text,
    direction,
    status: status ?? (direction === 'incoming' ? 'received' : 'sent'),
    timestamp: now - ago,
  }
}

const [anna, igor, phoneOnly, longName, maria] = mockChats.map((c) => c.chatId)

export const mockMessages: Record<string, Message[]> = {
  [anna]: [
    msg(anna, 'incoming', 'Привет! Ты завтра будешь на встрече?', DAY + 3 * HOUR),
    msg(anna, 'outgoing', 'Привет, да, буду к десяти', DAY + 2 * HOUR),
    msg(anna, 'incoming', 'Отлично 👍', DAY + 2 * HOUR - 5 * MIN),
    msg(
      anna,
      'incoming',
      'Скинула план встречи:\n1. Итоги недели\n2. Демо чата на GREEN-API\n3. Вопросы\n\nЕсли что-то добавить, напиши.',
      40 * MIN,
    ),
    msg(
      anna,
      'outgoing',
      'Посмотрел, всё хорошо. Добавлю ещё пункт про деплой: сборка статическая, поэтому GitHub Pages подойдёт, а ключи инстанса пользователь вводит сам в браузере и они нигде не сохраняются дольше сессии.',
      30 * MIN,
    ),
    msg(
      anna,
      'outgoing',
      'Ссылка: https://example.com/очень/длинная/ссылка/без/пробелов/которая/должна/переноситься/внутри/пузыря?query=1234567890',
      20 * MIN,
    ),
    msg(anna, 'outgoing', 'Это сообщение ещё отправляется', 2 * MIN, 'pending'),
    msg(anna, 'outgoing', 'А это не удалось отправить', MIN, 'failed'),
  ],
  [igor]: [
    msg(igor, 'outgoing', 'Игорь, привет, получил документы?', 3 * HOUR),
    msg(igor, 'incoming', 'Да, спасибо', 2 * HOUR),
    msg(igor, 'incoming', 'Есть пара вопросов', 2 * HOUR - MIN),
    msg(igor, 'incoming', 'Созвонимся вечером?', 15 * MIN),
  ],
  [phoneOnly]: [],
  [longName]: [
    msg(
      longName,
      'incoming',
      'Ааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааааа',
      10 * DAY,
    ),
  ],
  [maria]: [msg(maria, 'outgoing', 'Не получилось отправить', 400 * DAY, 'failed')],
}

export const sampleBubbles: Message[] = [
  msg('demo', 'incoming', 'Входящее сообщение', 9 * MIN),
  msg('demo', 'outgoing', 'Исходящее: pending', 8 * MIN, 'pending'),
  msg('demo', 'outgoing', 'Исходящее: sent', 7 * MIN, 'sent'),
  msg('demo', 'outgoing', 'Исходящее: failed (наведите на значок)', 6 * MIN, 'failed'),
  msg('demo', 'incoming', 'Многострочное\nсообщение\n\nс пустой строкой', 5 * MIN),
  msg(
    'demo',
    'incoming',
    'Длинный текст. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
    4 * MIN,
  ),
  msg('demo', 'outgoing', 'Длинноеслово_без_пробелов_'.repeat(6), 3 * MIN),
  msg('demo', 'outgoing', 'Ок', 2 * MIN),
]
