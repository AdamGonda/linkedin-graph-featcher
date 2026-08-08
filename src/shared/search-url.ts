/** Pure helpers for people-search URL page bumps (no Chrome). */

export function assertPeopleSearchUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid search URL')
  }
  if (!/(^|\.)linkedin\.com$/i.test(parsed.hostname)) {
    throw new Error('URL must be on linkedin.com')
  }
  if (!parsed.pathname.includes('/search/results/people')) {
    throw new Error('URL must be a LinkedIn people search (/search/results/people)')
  }
}

export function readSearchPage(url: string): number {
  const raw = new URL(url).searchParams.get('page')
  if (raw == null || raw === '') return 1
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export function setSearchPage(url: string, page: number): string {
  const u = new URL(url)
  u.searchParams.set('page', String(Math.max(1, Math.floor(page))))
  return u.toString()
}

/** Stop when paginator says there is no Next. */
export function shouldContinueCapture(hasNext: boolean): boolean {
  return hasNext
}

/**
 * Viewport scroll Y offsets for full-page capture bands.
 * `stickyTop` = fixed/sticky header height; step overlaps so content advances
 * without duplicating the chrome when stitching (crop sticky from later bands).
 */
export function computeScrollOffsets(
  scrollHeight: number,
  viewportHeight: number,
  stickyTop = 0,
): number[] {
  if (viewportHeight <= 0) return [0]
  if (scrollHeight <= viewportHeight) return [0]
  const sticky = Math.max(0, Math.min(stickyTop, viewportHeight - 50))
  const step = Math.max(50, viewportHeight - sticky)
  const offsets: number[] = []
  let y = 0
  while (y + viewportHeight < scrollHeight) {
    offsets.push(y)
    y += step
  }
  const last = Math.max(0, scrollHeight - viewportHeight)
  if (offsets.length === 0 || offsets[offsets.length - 1] !== last) {
    offsets.push(last)
  }
  return offsets
}
