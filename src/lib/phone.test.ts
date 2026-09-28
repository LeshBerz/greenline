import { isValidPhone, normalizePhone, toChatId } from './phone'

describe('normalizePhone', () => {
  it('strips formatting from an international number', () => {
    expect(normalizePhone('+7 (900) 123-45-67')).toBe('79001234567')
  })

  it('converts a leading Russian 8 to 7', () => {
    expect(normalizePhone('8 900 123 45 67')).toBe('79001234567')
  })

  it('keeps a leading 8 when the number is not 11 digits long', () => {
    expect(normalizePhone('+86 138 0013 8000')).toBe('8613800138000')
  })

  it('drops letters and other garbage', () => {
    expect(normalizePhone('abc')).toBe('')
    expect(normalizePhone('tel: 1-234-567-8901 ext')).toBe('12345678901')
  })
})

describe('isValidPhone', () => {
  it('accepts 10 to 15 digits', () => {
    expect(isValidPhone('9001234567')).toBe(true)
    expect(isValidPhone('79001234567')).toBe(true)
    expect(isValidPhone('123456789012345')).toBe(true)
  })

  it('rejects too short, too long and non-digit input', () => {
    expect(isValidPhone('')).toBe(false)
    expect(isValidPhone('123456789')).toBe(false)
    expect(isValidPhone('1234567890123456')).toBe(false)
    expect(isValidPhone('+79001234567')).toBe(false)
    expect(isValidPhone(normalizePhone('garbage'))).toBe(false)
  })
})

describe('toChatId', () => {
  it('builds a personal chat id', () => {
    expect(toChatId('79001234567')).toBe('79001234567@c.us')
  })
})
