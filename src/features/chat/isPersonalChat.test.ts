import { isPersonalChat } from './isPersonalChat'

describe('isPersonalChat', () => {
  it('accepts personal chats', () => {
    expect(isPersonalChat('10000000')).toBe(true)
    expect(isPersonalChat('79001234567@c.us')).toBe(true)
  })

  it('rejects groups and channels', () => {
    expect(isPersonalChat('-10000000000000')).toBe(false)
    expect(isPersonalChat('-1001234567890')).toBe(false)
    expect(isPersonalChat('120363000000000000@g.us')).toBe(false)
    expect(isPersonalChat('')).toBe(false)
  })
})
