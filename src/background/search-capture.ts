import type { PersonCard } from '../shared/person'
import type { PaginatorState } from '../shared/messages'
import {
  assertPeopleSearchUrl,
  readSearchPage,
  setSearchPage,
  shouldContinueCapture,
} from '../shared/search-url'
import { getSettings, updateSettings } from '../storage/settings-store'
import { getSyncState, updateSyncState } from '../storage/sync-store'
import { clearPeople, countPeople, upsertPeople } from '../storage/graph-db'
import { logError, logInfo, logSuccess, logWarn } from '../storage/log-store'
import { pauseAutomation } from '../storage/automation'
import { createWorkerTab } from './worker-window'
import { longPauseMs, randomInt, scrollDelayMs, sleep } from '../content/human-timing'

const LOAD_TIMEOUT_MS = 60_000
const SETTLE_MS = 2500
const SESSION_TAB_KEY = 'searchScrapeTabId'

let scrapeInFlight = false

export function isSearchCaptureInFlight(): boolean {
  return scrapeInFlight
}

function dbg(...args: unknown[]) {
  console.log('[search-scrape]', ...args)
}

async function getSessionTabId(): Promise<number | null> {
  const result = await chrome.storage.session.get(SESSION_TAB_KEY)
  const id = result[SESSION_TAB_KEY]
  return typeof id === 'number' ? id : null
}

async function setSessionTabId(tabId: number | null): Promise<void> {
  if (tabId == null) await chrome.storage.session.remove(SESSION_TAB_KEY)
  else await chrome.storage.session.set({ [SESSION_TAB_KEY]: tabId })
}

async function tabExists(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId)
    return true
  } catch {
    return false
  }
}

/** Scrape people-search HTML page-by-page into IndexedDB. */
export async function runSearchCapture(): Promise<void> {
  dbg('runSearchCapture() called', { scrapeInFlight })
  if (scrapeInFlight) {
    await logWarn('search_capture_progress', 'SKIP: scrape already in flight')
    return
  }

  const existingId = await getSessionTabId()
  if (existingId != null && (await tabExists(existingId))) {
    dbg('closing stale scrape tab', existingId)
    try {
      await chrome.tabs.remove(existingId)
    } catch {
      /* gone */
    }
    await setSessionTabId(null)
  }

  const settings = await getSettings()
  let searchUrl: string
  try {
    assertPeopleSearchUrl(settings.searchUrl)
    searchUrl = settings.searchUrl
  } catch (e) {
    await updateSyncState({
      phase: 'error',
      running: false,
      message: String(e),
    })
    await updateSettings({ syncPaused: true })
    await logError('error', String(e))
    return
  }

  scrapeInFlight = true
  let tabId: number | undefined
  let pagesDone = 0
  let peopleTotal = 0

  try {
    await clearPeople()

    let page = readSearchPage(searchUrl)
    searchUrl = setSearchPage(searchUrl, page)

    await updateSyncState({
      phase: 'search_capture',
      message: `Opening search page ${page}…`,
      progress: {
        pagesCaptured: 0,
        peopleStored: 0,
        currentPage: page,
        currentLabel: searchUrl,
      },
    })
    await logInfo('scheduler_tick', `Starting HTML scrape page=${page}`)

    const tab = await createWorkerTab(searchUrl, { forCrawl: true })
    tabId = tab.id
    if (tabId == null) throw new Error('Worker tab has no id')
    await setSessionTabId(tabId)

    await waitForTabComplete(tabId, LOAD_TIMEOUT_MS)
    await sleep(SETTLE_MS)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (await shouldAbort()) {
        await logWarn('sync_paused', `Scrape aborted after ${pagesDone} pages / ${peopleTotal} people`)
        await updateSyncState({
          message: `Paused/stopped after ${pagesDone} page(s), ${peopleTotal} people`,
          progress: {
            pagesCaptured: pagesDone,
            peopleStored: peopleTotal,
            currentPage: page,
            currentLabel: searchUrl,
          },
        })
        return
      }

      await updateSyncState({
        message: `Page ${page}: loading results…`,
        progress: {
          pagesCaptured: pagesDone,
          peopleStored: peopleTotal,
          currentPage: page,
          currentLabel: `page ${page}`,
        },
      })

      await sendToTab(tabId, { type: 'PREPARE_SEARCH_PAGE' })
      const { people } = await sendToTab<{ people: PersonCard[] }>(tabId, {
        type: 'EXTRACT_SEARCH_RESULTS',
      })
      const batch = people ?? []
      dbg('extracted', { page, count: batch.length })

      const stored = await upsertPeople(batch, 2)
      peopleTotal = await countPeople()
      pagesDone++

      await updateSyncState({
        progress: {
          pagesCaptured: pagesDone,
          peopleStored: peopleTotal,
          currentPage: page,
          currentLabel: `page ${page}`,
        },
        message: `Page ${page}: +${stored} profiles (${peopleTotal} total)`,
      })
      await logInfo(
        'search_capture_progress',
        `Page ${page}: extracted ${batch.length}, upserted ${stored}, total ${peopleTotal}`,
      )

      const paginator = await sendToTab<PaginatorState>(tabId, {
        type: 'READ_SEARCH_PAGINATOR',
      })
      dbg('paginator', paginator)
      if (!shouldContinueCapture(paginator.hasNext)) {
        await logInfo('search_capture_progress', 'hasNext=false → stop')
        break
      }

      page += 1
      searchUrl = setSearchPage(searchUrl, page)
      await updateSettings({ searchUrl })

      const delay = settings.fastTestMode
        ? scrollDelayMs(true)
        : randomInt(
            settings.minDelaySeconds * 1000,
            settings.maxDelaySeconds * 1000,
          )
      const pause =
        pagesDone % 5 === 0 ? longPauseMs(settings.fastTestMode) : delay
      const pauseSec = Math.round(pause / 1000)
      await updateSyncState({
        message: `Waiting ${pauseSec}s before page ${page}…`,
        progress: {
          pagesCaptured: pagesDone,
          peopleStored: peopleTotal,
          currentPage: page,
          currentLabel: `page ${page}`,
        },
      })
      await sleep(pause)

      if (await shouldAbort()) {
        await logWarn('sync_paused', `Scrape aborted before page ${page}`)
        return
      }

      await updateSyncState({ message: `Navigating to page ${page}…` })
      await chrome.tabs.update(tabId, { url: searchUrl })
      await waitForTabComplete(tabId, LOAD_TIMEOUT_MS)
      await sleep(SETTLE_MS)
    }

    await updateSyncState({
      running: false,
      phase: 'idle',
      message: `Done — ${peopleTotal} people from ${pagesDone} page(s). Download JSON when ready.`,
      progress: {
        pagesCaptured: pagesDone,
        peopleStored: peopleTotal,
        currentPage: page,
        currentLabel: null,
      },
    })
    await updateSettings({ syncPaused: true })
    await logSuccess(
      'scheduler_tick',
      `Search scrape finished (${peopleTotal} people, ${pagesDone} pages)`,
    )
  } catch (error) {
    const msg = String(error)
    console.error('[search-scrape] FATAL', error)
    await logError('error', msg)
    if (/auth wall|not logged in/i.test(msg)) {
      await pauseAutomation()
      await updateSyncState({
        phase: 'error',
        message: `Paused: ${msg}`,
        progress: { pagesCaptured: pagesDone, peopleStored: peopleTotal },
      })
    } else {
      await updateSyncState({
        phase: 'error',
        running: false,
        message: msg,
        progress: { pagesCaptured: pagesDone, peopleStored: peopleTotal },
      })
      await updateSettings({ syncPaused: true })
    }
  } finally {
    scrapeInFlight = false
    await setSessionTabId(null)
    if (tabId != null) {
      try {
        await chrome.tabs.remove(tabId)
      } catch {
        /* already closed */
      }
    }
  }
}

async function shouldAbort(): Promise<boolean> {
  const [state, settings] = await Promise.all([getSyncState(), getSettings()])
  return !state.running || settings.syncPaused
}

async function sendToTab<T = void>(
  tabId: number,
  message: Record<string, unknown>,
  attempts = 40,
  delayMs = 500,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const response = (await chrome.tabs.sendMessage(tabId, message)) as {
        success: boolean
        data?: T
        error?: string
      }
      if (response?.success) return response.data as T
      if (response && response.success === false) {
        throw new Error(response.error ?? 'Content script error')
      }
      lastErr = new Error('Empty content response')
    } catch (err) {
      lastErr = err
      if (i === attempts - 1) break
      await sleep(delayMs)
    }
  }
  throw new Error(
    `Content script not ready for ${String(message.type)}: ${String(lastErr)}`,
  )
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      fn()
    }

    const timer = setTimeout(() => {
      finish(() => reject(new Error('Tab loading timeout')))
    }, timeoutMs)

    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') {
        finish(() => resolve())
      }
    }

    chrome.tabs.onUpdated.addListener(listener)

    chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === 'complete') finish(() => resolve())
      })
      .catch(() => {
        /* listener */
      })
  })
}
