import {
  canonicalProfileUrl,
  profileIdFromUrl,
  type PersonCard,
} from '../shared/person'
import type { PaginatorState } from '../shared/messages'

function dbg(...args: unknown[]) {
  console.log('[search-extract]', ...args)
}

function resultsRoot(): Element {
  return (
    document.querySelector('[data-testid="lazy-column"]') ??
    document.querySelector('[data-component-type="LazyColumn"]') ??
    document.querySelector('section[aria-label="Primary content"]') ??
    document.querySelector('main') ??
    document.body
  )
}

/** Extract people cards from LinkedIn people-search HTML (stable attrs only). */
export function extractSearchPeople(): PersonCard[] {
  const root = resultsRoot()
  const map = new Map<string, PersonCard>()

  for (const node of root.querySelectorAll('a[href*="/in/"]')) {
    if (!(node instanceof HTMLAnchorElement)) continue
    const profileId = profileIdFromUrl(node.href)
    if (!profileId) continue

    const name = (node.innerText || node.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!name || name.length < 2) continue
    if (/^\d+(st|nd|rd|th)$/i.test(name)) continue
    // avatar-only links often have empty/short alt text already filtered

    const existing = map.get(profileId)
    if (existing && existing.name.length >= name.length) continue

    const headline = findHeadlineNear(node, name)
    map.set(profileId, {
      profileId,
      profileUrl: canonicalProfileUrl(profileId),
      name,
      headline,
      connectedOn: null,
    })
  }

  const people = [...map.values()]
  dbg('extractSearchPeople', { count: people.length, sample: people.slice(0, 3) })
  return people
}

function findHeadlineNear(anchor: Element, name: string): string | null {
  let node: Element | null = anchor
  for (let depth = 0; depth < 10 && node; depth++) {
    node = node.parentElement
    if (!node) break

    const texts = [...node.querySelectorAll('p, span')]
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)

    for (const t of texts) {
      if (t === name) continue
      if (t.length < 3 || t.length > 240) continue
      if (/^\d+(st|nd|rd|th)\b/i.test(t)) continue
      if (/mutual connection/i.test(t)) continue
      if (/^connect$/i.test(t) || /^follow$/i.test(t) || /^message$/i.test(t)) continue
      if (/^https?:\/\//i.test(t)) continue
      // location lines are ok as headline fallback; prefer longer role-like strings
      if (t.includes(name) && t.length < name.length + 5) continue
      return t
    }

    // Prefer a tight card: few profile links
    const linkCount = node.querySelectorAll('a[href*="/in/"]').length
    if (linkCount > 0 && linkCount <= 4 && texts.length >= 2) {
      // already scanned texts; keep walking if nothing found
    }
  }
  return null
}

/** Scroll results so lazy rows + paginator are in the DOM. */
export async function prepareSearchPage(): Promise<void> {
  const root = resultsRoot()
  const scrollable =
    (root.closest('[data-testid="lazy-column"]') as HTMLElement | null) ??
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement

  for (let i = 0; i < 8; i++) {
    const top =
      'scrollHeight' in scrollable
        ? (scrollable as HTMLElement).scrollHeight
        : document.documentElement.scrollHeight
    if (scrollable === document.documentElement || scrollable === document.body) {
      window.scrollTo(0, top)
    } else {
      ;(scrollable as HTMLElement).scrollTop = top
    }
    await new Promise((r) => setTimeout(r, 250))
    if (document.querySelector('[data-testid="pagination-controls-list"]')) break
    if (document.querySelector('.artdeco-pagination')) break
  }

  document
    .querySelector('[data-testid="pagination-controls-list"]')
    ?.scrollIntoView({ block: 'end' })
  await new Promise((r) => setTimeout(r, 200))
}

/**
 * Paginator via stable testids / aria — do not use hashed class names.
 */
export function readSearchPaginator(): PaginatorState {
  const currentBtn =
    document.querySelector<HTMLButtonElement>(
      'button[data-testid="pagination-indicator"][aria-current="true"]',
    ) ??
    document.querySelector<HTMLButtonElement>(
      '[data-testid="pagination-controls-list"] button[aria-current="true"]',
    )

  let currentPage = 1
  if (currentBtn) {
    const fromLabel = currentBtn.getAttribute('aria-label')?.match(/page\s+(\d+)/i)
    const n = Number(fromLabel?.[1] ?? currentBtn.textContent?.trim())
    if (Number.isFinite(n) && n >= 1) currentPage = n
  } else {
    const fromUrl = Number(new URLSearchParams(location.search).get('page') ?? '1')
    if (Number.isFinite(fromUrl) && fromUrl >= 1) currentPage = fromUrl
  }

  const next =
    document.querySelector<HTMLButtonElement>(
      'button[aria-label="Next"], button[aria-label="Next page"]',
    ) ??
    document.querySelector<HTMLButtonElement>(
      'button.artdeco-pagination__button--next',
    )

  let hasNext = false
  if (next) {
    hasNext = !(
      next.disabled ||
      next.getAttribute('aria-disabled') === 'true' ||
      next.classList.contains('artdeco-button--disabled')
    )
  } else {
    // Fallback: any indicator with higher page number than current
    const nums = [
      ...document.querySelectorAll(
        'button[data-testid="pagination-indicator"], [data-testid="pagination-controls-list"] button',
      ),
    ]
      .map((el) => {
        const label = el.getAttribute('aria-label')?.match(/page\s+(\d+)/i)
        return Number(label?.[1] ?? el.textContent?.trim())
      })
      .filter((n) => Number.isFinite(n) && n > 0)
    if (nums.length > 0) hasNext = currentPage < Math.max(...nums)
  }

  dbg('paginator', { currentPage, hasNext, nextFound: !!next })
  return { currentPage, hasNext }
}
