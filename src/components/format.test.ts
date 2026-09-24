import { formatDay, formatListTime, formatPhone, formatTime, getInitials, hashIndex } from './format'

const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()

describe('formatTime', () => {
  it('pads hours and minutes', () => {
    expect(formatTime(at(2026, 9, 24, 7, 5))).toBe('07:05')
  })
})

describe('formatListTime', () => {
  const now = at(2026, 9, 24, 18)
  it('shows time for today', () => expect(formatListTime(at(2026, 9, 24, 9, 30), now)).toBe('09:30'))
  it('shows date for this year', () => expect(formatListTime(at(2026, 3, 2), now)).toBe('02.03'))
  it('shows full date for older', () => expect(formatListTime(at(2025, 12, 31), now)).toBe('31.12.25'))
})

describe('formatDay', () => {
  const now = at(2026, 9, 24, 18)
  it('labels today and yesterday', () => {
    expect(formatDay(at(2026, 9, 24, 1), now)).toBe('Сегодня')
    expect(formatDay(at(2026, 9, 23, 23), now)).toBe('Вчера')
  })
  it('uses month names', () => {
    expect(formatDay(at(2026, 9, 1), now)).toBe('1 сентября')
    expect(formatDay(at(2025, 5, 9), now)).toBe('9 мая 2025')
  })
})

describe('getInitials', () => {
  it('takes first letters of two words', () => expect(getInitials('анна смирнова')).toBe('АС'))
  it('takes two letters of a single word', () => expect(getInitials('Игорь')).toBe('ИГ'))
  it('uses last digits for phones', () => expect(getInitials('+7 900 123-45-67')).toBe('67'))
  it('handles empty', () => expect(getInitials('  ')).toBe('?'))
})

describe('formatPhone', () => {
  it('formats 11-digit numbers', () => expect(formatPhone('79001234567')).toBe('+7 900 123-45-67'))
  it('prefixes other lengths with +', () => expect(formatPhone('4915112345678')).toBe('+4915112345678'))
})

describe('hashIndex', () => {
  it('is stable and within range', () => {
    const i = hashIndex('79001234567@c.us', 6)
    expect(i).toBe(hashIndex('79001234567@c.us', 6))
    expect(i).toBeGreaterThanOrEqual(1)
    expect(i).toBeLessThanOrEqual(6)
  })
})
