/** Soft session heuristics for content scripts (li_at is httpOnly). */
export function looksLikeLinkedInAuthWall(href: string = location.href): boolean {
  try {
    const url = new URL(href)
    const path = url.pathname.toLowerCase()
    return (
      path.includes('/login') ||
      path.includes('/checkpoint') ||
      path.includes('/authwall') ||
      path.includes('/uas/login')
    )
  } catch {
    return false
  }
}
