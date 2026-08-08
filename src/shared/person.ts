export type PersonCard = {
  profileId: string
  profileUrl: string
  name: string
  headline: string | null
  connectedOn: string | null
}

/** Normalize LinkedIn /in/ URLs to a stable profile id (slug). */
export function profileIdFromUrl(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.linkedin.com')
    const match = url.pathname.match(/\/in\/([^/?#]+)/i)
    if (!match?.[1]) return null
    return decodeURIComponent(match[1]).replace(/\/$/, '')
  } catch {
    return null
  }
}

export function canonicalProfileUrl(profileId: string): string {
  return `https://www.linkedin.com/in/${encodeURIComponent(profileId)}/`
}
