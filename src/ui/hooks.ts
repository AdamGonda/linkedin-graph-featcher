import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, SyncState } from '../shared/types'
import { DEFAULT_SETTINGS, DEFAULT_SYNC_STATE } from '../shared/constants'
import { sendMessage } from '../shared/messages'
import { getSettings, updateSettings } from '../storage/settings-store'
import { getSyncState } from '../storage/sync-store'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSettings(await getSettings())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>) {
      if (!changes.settings) return
      const next = changes.settings.newValue as AppSettings | undefined
      setSettings(next ? { ...DEFAULT_SETTINGS, ...next } : null)
      if (!next) void load()
    }
    chrome.storage.local.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.local.onChanged.removeListener(onStorageChanged)
  }, [load])

  const save = useCallback(async (updates: Partial<AppSettings>) => {
    const next = await updateSettings(updates)
    setSettings(next)
    return next
  }, [])

  return { settings, loading, refresh: load, save }
}

export function useLiConnection() {
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      const response = await sendMessage<{ loggedIn: boolean }>({
        type: 'CHECK_LI_SESSION',
      })
      if (response.success && response.data) {
        setConnected(response.data.loggedIn)
      } else {
        setConnected(false)
      }
    } catch {
      setConnected(false)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void check()
    const interval = setInterval(() => void check(), 60_000)
    return () => clearInterval(interval)
  }, [check])

  return { connected, checking, recheck: check }
}

export function useSyncState() {
  const [syncState, setSyncState] = useState<SyncState>({ ...DEFAULT_SYNC_STATE })

  const load = useCallback(async () => {
    setSyncState(await getSyncState())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>) {
      if (!changes.syncState) return
      const next = changes.syncState.newValue as SyncState | undefined
      if (!next) {
        setSyncState({ ...DEFAULT_SYNC_STATE })
        return
      }
      setSyncState({
        ...DEFAULT_SYNC_STATE,
        ...next,
        progress: { ...DEFAULT_SYNC_STATE.progress, ...next.progress },
      })
    }
    chrome.storage.local.onChanged.addListener(onStorageChanged)
    return () => chrome.storage.local.onChanged.removeListener(onStorageChanged)
  }, [])

  return { syncState, refresh: load }
}
