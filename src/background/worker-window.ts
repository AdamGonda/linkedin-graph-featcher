import { WORKER_PAGE } from '../shared/constants'

const STORAGE_KEY = 'workerWindowId'

export function isStoredWorkerWindowId(
  stored: unknown,
  windowId: number,
): boolean {
  return typeof stored === 'number' && stored === windowId
}

async function getStoredWindowId(): Promise<number | null> {
  const result = await chrome.storage.session.get(STORAGE_KEY)
  const id = result[STORAGE_KEY]
  return typeof id === 'number' ? id : null
}

async function setStoredWindowId(windowId: number): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: windowId })
}

async function clearStoredWindowId(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEY)
}

async function windowExists(windowId: number): Promise<boolean> {
  try {
    await chrome.windows.get(windowId)
    return true
  } catch {
    return false
  }
}

export type WorkerWindowOpts = {
  /**
   * Minimized windows often get a 0-height viewport → LinkedIn LazyColumn never loads.
   * Crawl uses a real-sized, unfocused window instead.
   */
  forCrawl?: boolean
}

/** Create or reuse the worker window; returns windowId. */
export async function ensureWorkerWindow(
  opts: WorkerWindowOpts = {},
): Promise<number> {
  const forCrawl = opts.forCrawl === true
  const stored = await getStoredWindowId()
  if (stored != null && (await windowExists(stored))) {
    if (forCrawl) {
      // Ensure usable viewport for IntersectionObserver / LazyColumn
      try {
        await chrome.windows.update(stored, {
          state: 'normal',
          focused: false,
          width: 1200,
          height: 900,
        })
      } catch {
        /* ignore */
      }
    }
    return stored
  }

  if (stored != null) await clearStoredWindowId()

  const url = chrome.runtime.getURL(WORKER_PAGE)
  const win = await chrome.windows.create(
    forCrawl
      ? {
          url,
          focused: false,
          type: 'normal',
          width: 1200,
          height: 900,
          // Keep it out of the way when the OS allows negative coords
          left: 80,
          top: 80,
        }
      : {
          url,
          focused: false,
          state: 'minimized',
        },
  )

  if (win?.id == null) {
    throw new Error('Could not create worker window')
  }

  if (!forCrawl) {
    try {
      await chrome.windows.update(win.id, { state: 'minimized', focused: false })
    } catch {
      /* ignore */
    }
  } else {
    try {
      await chrome.windows.update(win.id, { focused: false })
    } catch {
      /* ignore */
    }
  }

  await setStoredWindowId(win.id)
  return win.id
}

/** Open a tab in the worker window (not the user's main window). */
export async function createWorkerTab(
  url: string,
  opts: WorkerWindowOpts = {},
): Promise<chrome.tabs.Tab> {
  const windowId = await ensureWorkerWindow(opts)
  return chrome.tabs.create({ url, windowId, active: true })
}
