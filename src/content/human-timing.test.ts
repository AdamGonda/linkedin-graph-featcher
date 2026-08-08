import { describe, expect, it } from 'vitest'
import { randomInt, scrollDelayMs } from '../content/human-timing'

describe('human-timing', () => {
  it('randomInt stays in range', () => {
    for (let i = 0; i < 40; i++) {
      const n = randomInt(3, 5)
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(5)
    }
  })

  it('scrollDelayMs is shorter in fast test', () => {
    const fast = scrollDelayMs(true)
    const slow = scrollDelayMs(false)
    expect(fast).toBeLessThanOrEqual(800)
    expect(slow).toBeGreaterThanOrEqual(1500)
  })
})
