import { describe, expect, it } from 'vitest'
import { canonicalProfileUrl, profileIdFromUrl } from './person'

describe('profileIdFromUrl', () => {
  it('extracts slug from /in/ URLs', () => {
    expect(
      profileIdFromUrl('https://www.linkedin.com/in/d%C3%B3ra-varga-9b3025273/'),
    ).toBe('dóra-varga-9b3025273')
    expect(profileIdFromUrl('/in/anthony-david/')).toBe('anthony-david')
  })

  it('rejects non-profile URLs', () => {
    expect(profileIdFromUrl('https://www.linkedin.com/mynetwork/')).toBeNull()
    expect(profileIdFromUrl('not a url')).toBeNull()
  })
})

describe('canonicalProfileUrl', () => {
  it('builds /in/ URL', () => {
    expect(canonicalProfileUrl('foo-bar')).toBe('https://www.linkedin.com/in/foo-bar/')
  })
})
