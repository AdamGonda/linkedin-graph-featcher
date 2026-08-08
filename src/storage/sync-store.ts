import type { SyncProgress, SyncState } from '../shared/types'
import { storageGet, storageUpdate } from './storage-wrapper'
import { DEFAULT_SYNC_PROGRESS, DEFAULT_SYNC_STATE } from '../shared/constants'

export async function getSyncState(): Promise<SyncState> {
  const stored = await storageGet('syncState')
  return {
    ...DEFAULT_SYNC_STATE,
    ...stored,
    progress: { ...DEFAULT_SYNC_PROGRESS, ...stored.progress },
  }
}

export async function updateSyncState(
  updates: Partial<Omit<SyncState, 'progress'>> & {
    progress?: Partial<SyncProgress>
  },
): Promise<SyncState> {
  return storageUpdate('syncState', (current) => {
    const merged: SyncState = {
      ...DEFAULT_SYNC_STATE,
      ...current,
      ...updates,
      progress: {
        ...DEFAULT_SYNC_PROGRESS,
        ...current.progress,
        ...updates.progress,
      },
    }
    return merged
  })
}
