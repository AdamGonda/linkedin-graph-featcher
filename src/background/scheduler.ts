import { getSettings } from '../storage/settings-store'
import { getSyncState, updateSyncState } from '../storage/sync-store'
import { logWarn } from '../storage/log-store'
import { isLinkedInLoggedIn } from '../shared/li-auth'
import { pauseAutomation } from '../storage/automation'
import {
  isSearchCaptureInFlight,
  runSearchCapture,
} from './search-capture'

let isRunning = false

/** Session health + kick search HTML scrape when armed. */
export async function runScheduler(): Promise<void> {
  if (isRunning) {
    console.log('[scheduler] SKIP: already running')
    return
  }
  isRunning = true
  try {
    const settings = await getSettings()
    if (settings.syncPaused) {
      console.log('[scheduler] SKIP: syncPaused')
      return
    }

    const loggedIn = await isLinkedInLoggedIn()
    if (!loggedIn) {
      await logWarn('session_check', 'Scheduler: LinkedIn not logged in — pausing')
      await pauseAutomation()
      await updateSyncState({
        phase: 'error',
        message: 'Paused: LinkedIn session missing. Log in and Start again.',
      })
      return
    }

    const state = await getSyncState()
    console.log('[scheduler] tick', {
      running: state.running,
      phase: state.phase,
      inFlight: isSearchCaptureInFlight(),
    })
    if (!state.running) return

    if (state.phase === 'search_capture' && !isSearchCaptureInFlight()) {
      console.log('[scheduler] kicking runSearchCapture')
      await runSearchCapture()
    } else {
      console.log('[scheduler] not kicking', {
        phase: state.phase,
        inFlight: isSearchCaptureInFlight(),
      })
    }
  } finally {
    isRunning = false
  }
}
