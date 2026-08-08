import { describe, expect, it } from 'vitest'
import { DEFAULT_SYNC_STATE } from '../shared/constants'

describe('DEFAULT_SYNC_STATE', () => {
  it('starts idle with zero page/people progress', () => {
    expect(DEFAULT_SYNC_STATE.phase).toBe('idle')
    expect(DEFAULT_SYNC_STATE.running).toBe(false)
    expect(DEFAULT_SYNC_STATE.progress.pagesCaptured).toBe(0)
    expect(DEFAULT_SYNC_STATE.progress.peopleStored).toBe(0)
    expect(DEFAULT_SYNC_STATE.progress.currentPage).toBeNull()
  })
})
