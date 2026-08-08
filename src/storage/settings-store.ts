import type { AppSettings } from '../shared/types'
import { storageGet, storageUpdate } from './storage-wrapper'
import { DEFAULT_SETTINGS } from '../shared/constants'

export async function getSettings(): Promise<AppSettings> {
  const stored = await storageGet('settings')
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  // One-shot: migrate older delay defaults → 4–6s
  if (
    (merged.minDelaySeconds === 120 && merged.maxDelaySeconds === 300) ||
    (merged.minDelaySeconds === 10 && merged.maxDelaySeconds === 10)
  ) {
    return updateSettings({ minDelaySeconds: 4, maxDelaySeconds: 6 })
  }
  return merged
}

export async function updateSettings(
  updates: Partial<AppSettings>,
): Promise<AppSettings> {
  return storageUpdate('settings', (current) => ({
    ...DEFAULT_SETTINGS,
    ...current,
    ...updates,
  }))
}
