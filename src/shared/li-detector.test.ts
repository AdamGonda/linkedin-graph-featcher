import { describe, expect, it } from 'vitest'
import { looksLikeLinkedInAuthWall } from './li-detector'

describe('looksLikeLinkedInAuthWall', () => {
  it('detects login and checkpoint paths', () => {
    expect(looksLikeLinkedInAuthWall('https://www.linkedin.com/login')).toBe(true)
    expect(looksLikeLinkedInAuthWall('https://www.linkedin.com/checkpoint/challenge')).toBe(true)
    expect(looksLikeLinkedInAuthWall('https://www.linkedin.com/uas/login')).toBe(true)
  })

  it('allows normal feed/connections URLs', () => {
    expect(
      looksLikeLinkedInAuthWall(
        'https://www.linkedin.com/mynetwork/invite-connect/connections/',
      ),
    ).toBe(false)
    expect(looksLikeLinkedInAuthWall('https://www.linkedin.com/in/someone/')).toBe(false)
  })
})
