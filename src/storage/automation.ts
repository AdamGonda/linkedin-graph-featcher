import { isLinkedInLoggedIn } from '../shared/li-auth'
import { assertPeopleSearchUrl } from '../shared/search-url'
import { updateSettings, getSettings } from './settings-store'
import { getSyncState, updateSyncState } from './sync-store'
import { logInfo, logSuccess, logWarn } from './log-store'
import type { SyncState } from '../shared/types'

export async function startAutomation(): Promise<SyncState> {
  const loggedIn = await isLinkedInLoggedIn()
  if (!loggedIn) {
    throw new Error('Not logged in to LinkedIn — sign in in this Chrome profile first')
  }

  const settings = await getSettings()
  assertPeopleSearchUrl(settings.searchUrl)

  await updateSettings({ syncPaused: false })
  const state = await updateSyncState({
    running: true,
    phase: 'search_capture',
    startedAt: new Date().toISOString(),
    stoppedAt: null,
    message: 'Scraping people-search HTML…',
    progress: {
      pagesCaptured: 0,
      peopleStored: 0,
      currentPage: null,
      currentLabel: settings.searchUrl,
    },
  })
  await logSuccess('sync_started', 'Search HTML scrape started')
  return state
}

export async function pauseAutomation(): Promise<SyncState> {
  await updateSettings({ syncPaused: true })
  const prev = await getSyncState()
  const state = await updateSyncState({
    running: false,
    phase: 'paused',
    message: prev.message
      ? `Paused — ${prev.message}`
      : 'Paused. Resume with Start when ready.',
  })
  await logWarn('sync_paused', 'Search capture paused')
  return state
}

export async function stopAutomation(): Promise<SyncState> {
  await updateSettings({ syncPaused: true })
  const state = await updateSyncState({
    running: false,
    phase: 'idle',
    stoppedAt: new Date().toISOString(),
    message: 'Stopped.',
    progress: {
      currentLabel: null,
    },
  })
  await logInfo('sync_stopped', 'Search capture stopped')
  return state
}
