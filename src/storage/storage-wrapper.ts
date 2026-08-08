// =============================================
// chrome.storage.local wrapper
// =============================================

import type { StorageSchema } from '../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_SYNC_STATE } from '../shared/constants'

const DEFAULT_STORAGE: StorageSchema = {
  settings: { ...DEFAULT_SETTINGS },
  syncState: { ...DEFAULT_SYNC_STATE },
  logs: [],
}

export async function storageGet<K extends keyof StorageSchema>(
  key: K,
): Promise<StorageSchema[K]> {
  const result = await chrome.storage.local.get(key)
  if (result[key] === undefined) {
    return DEFAULT_STORAGE[key]
  }
  return result[key] as StorageSchema[K]
}

export async function storageSet<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K],
): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function storageUpdate<K extends keyof StorageSchema>(
  key: K,
  updater: (current: StorageSchema[K]) => StorageSchema[K],
): Promise<StorageSchema[K]> {
  const current = await storageGet(key)
  const updated = updater(current)
  await storageSet(key, updated)
  return updated
}

export async function storageGetUsage(): Promise<{
  usedBytes: number
  quotaBytes: number
}> {
  const used = await chrome.storage.local.getBytesInUse()
  return {
    usedBytes: used,
    quotaBytes: chrome.storage.local.QUOTA_BYTES,
  }
}
