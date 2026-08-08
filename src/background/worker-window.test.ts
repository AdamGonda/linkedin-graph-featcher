import { describe, expect, it } from 'vitest'
import { isStoredWorkerWindowId } from './worker-window'

describe('isStoredWorkerWindowId', () => {
  it('matches equal number ids', () => {
    expect(isStoredWorkerWindowId(42, 42)).toBe(true)
  })

  it('rejects mismatch or non-number', () => {
    expect(isStoredWorkerWindowId(41, 42)).toBe(false)
    expect(isStoredWorkerWindowId('42', 42)).toBe(false)
    expect(isStoredWorkerWindowId(undefined, 42)).toBe(false)
  })
})
