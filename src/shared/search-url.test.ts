import { describe, expect, it } from 'vitest'
import {
  assertPeopleSearchUrl,
  computeScrollOffsets,
  readSearchPage,
  setSearchPage,
  shouldContinueCapture,
} from './search-url'

const SAMPLE =
  'https://www.linkedin.com/search/results/people/?origin=FACETED_SEARCH&network=%5B%22F%22%2C%22S%22%5D&geoUrn=%5B%22103644278%22%5D&title=%22founder%22&profileLanguage=%5B%22en%22%5D&page=1&spellCorrectionEnabled=true&prioritizeMessage=false'

describe('search-url helpers', () => {
  it('accepts people search URLs', () => {
    expect(() => assertPeopleSearchUrl(SAMPLE)).not.toThrow()
  })

  it('rejects non-people URLs', () => {
    expect(() =>
      assertPeopleSearchUrl('https://www.linkedin.com/feed/'),
    ).toThrow(/people search/)
  })

  it('reads and bumps page=', () => {
    expect(readSearchPage(SAMPLE)).toBe(1)
    const next = setSearchPage(SAMPLE, 2)
    expect(readSearchPage(next)).toBe(2)
    expect(next).toContain('page=2')
  })

  it('stops when hasNext is false', () => {
    expect(shouldContinueCapture(true)).toBe(true)
    expect(shouldContinueCapture(false)).toBe(false)
  })

  it('computes scroll offsets with a final bottom band', () => {
    expect(computeScrollOffsets(900, 900)).toEqual([0])
    expect(computeScrollOffsets(2000, 900)).toEqual([0, 900, 1100])
  })

  it('steps by viewport minus sticky chrome', () => {
    expect(computeScrollOffsets(2000, 900, 100)).toEqual([0, 800, 1100])
  })
})
