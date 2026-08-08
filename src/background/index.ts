import {
  DEFAULT_SEARCH_URL,
  SCHEDULER_ALARM_NAME,
  SCHEDULER_PERIOD_MINUTES,
  UI_PAGE,
} from '../shared/constants'
import { isLinkedInLoggedIn } from '../shared/li-auth'
import type { ExtensionMessage } from '../shared/messages'
import { getSettings, updateSettings } from '../storage/settings-store'
import { getSyncState, updateSyncState } from '../storage/sync-store'
import {
  pauseAutomation,
  startAutomation,
  stopAutomation,
} from '../storage/automation'
import { countPeople, listPeople } from '../storage/graph-db'
import { logError, logInfo, logSuccess } from '../storage/log-store'
import { createWorkerTab } from './worker-window'
import { runScheduler } from './scheduler'

console.log('[LinkedIn Search Scraper] Service worker started')

const SMOKE_TIMEOUT_MS = 45_000

async function openUiTab(): Promise<void> {
  const url = chrome.runtime.getURL(UI_PAGE)
  const existing = await chrome.tabs.query({ url })
  if (existing.length > 0 && existing[0].id != null) {
    await chrome.tabs.update(existing[0].id, { active: true })
    if (existing[0].windowId != null) {
      await chrome.windows.update(existing[0].windowId, { focused: true })
    }
    return
  }
  await chrome.tabs.create({ url })
}

chrome.action.onClicked.addListener(() => {
  void openUiTab()
})

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[SW] onInstalled:', details.reason)
  await setupAlarms()
  if (details.reason === 'install') {
    await openUiTab()
  }
})

chrome.runtime.onStartup.addListener(async () => {
  console.log('[SW] onStartup')
  await setupAlarms()
})

async function setupAlarms() {
  const existing = await chrome.alarms.get(SCHEDULER_ALARM_NAME)
  if (!existing) {
    chrome.alarms.create(SCHEDULER_ALARM_NAME, {
      periodInMinutes: SCHEDULER_PERIOD_MINUTES,
      delayInMinutes: 0.5,
    })
    console.log('[SW] Scheduler alarm created')
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULER_ALARM_NAME) {
    runScheduler().catch((err) => {
      console.error('[SW] Scheduler error:', err)
    })
  }
})

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  console.log('[SW] Message:', message.type)

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, data: { timestamp: Date.now() } })
      break

    case 'OPEN_UI_TAB':
      openUiTab()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'CHECK_LI_SESSION':
      isLinkedInLoggedIn()
        .then(async (loggedIn) => {
          if (!loggedIn) {
            await updateSyncState({
              lastSessionCheckAt: new Date().toISOString(),
              message: 'Not logged in to LinkedIn',
            })
          } else {
            await updateSyncState({
              lastSessionCheckAt: new Date().toISOString(),
            })
          }
          sendResponse({ success: true, data: { loggedIn } })
        })
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'GET_SETTINGS':
      getSettings()
        .then((settings) => sendResponse({ success: true, data: settings }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'SAVE_SETTINGS':
      updateSettings(message.settings)
        .then((settings) => sendResponse({ success: true, data: settings }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'GET_SYNC_STATE':
      getSyncState()
        .then((state) => sendResponse({ success: true, data: state }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'SHOULD_ABORT_CRAWL':
      Promise.all([getSyncState(), getSettings()])
        .then(([state, settings]) => {
          const abort = !state.running || settings.syncPaused
          sendResponse({ success: true, data: { abort } })
        })
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'GET_PEOPLE_COUNT':
      countPeople()
        .then((count) => sendResponse({ success: true, data: { count } }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'EXPORT_PEOPLE':
      listPeople()
        .then((people) => {
          const json = JSON.stringify(people, null, 2)
          sendResponse({
            success: true,
            data: { json, count: people.length },
          })
        })
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'START_AUTOMATION':
      startAutomation()
        .then((state) => {
          runScheduler().catch(console.error)
          sendResponse({ success: true, data: state })
        })
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'PAUSE_AUTOMATION':
      pauseAutomation()
        .then((state) => sendResponse({ success: true, data: state }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'STOP_AUTOMATION':
      stopAutomation()
        .then((state) => sendResponse({ success: true, data: state }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true

    case 'WORKER_SMOKE':
      handleWorkerSmoke(sendResponse)
      return true

    default:
      sendResponse({ success: false, error: 'Unknown message' })
  }
})

async function handleWorkerSmoke(sendResponse: (r: unknown) => void) {
  let tabId: number | undefined
  try {
    const settings = await getSettings()
    const url = settings.searchUrl || DEFAULT_SEARCH_URL
    await logInfo('worker_smoke', 'Opening search URL in worker window…')
    const tab = await createWorkerTab(url, { forCrawl: true })
    tabId = tab.id
    if (tabId == null) throw new Error('Worker tab has no id')

    await waitForTabComplete(tabId, SMOKE_TIMEOUT_MS)

    await updateSyncState({
      lastWorkerSmokeAt: new Date().toISOString(),
    })
    await logSuccess('worker_smoke', 'Worker window opened search URL')
    sendResponse({ success: true, data: { ok: true, tabId } })
  } catch (error) {
    const msg = String(error)
    console.error('[SW] WORKER_SMOKE error:', msg)
    await logError('worker_smoke', msg)
    sendResponse({ success: false, error: msg })
  } finally {
    if (tabId != null) {
      setTimeout(async () => {
        try {
          await chrome.tabs.remove(tabId!)
        } catch {
          /* tab already closed */
        }
      }, 2000)
    }
  }
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
        /* listener still active */
      })
  })
}
