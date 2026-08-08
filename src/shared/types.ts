// =============================================
// Shared types — LinkedIn Search Scraper
// =============================================

export interface AppSettings {
  /** Min delay between crawl actions (seconds). */
  minDelaySeconds: number
  /** Max delay between crawl actions (seconds). */
  maxDelaySeconds: number
  /** When true, scheduler/crawl stays paused. */
  syncPaused: boolean
  /** Faster delays for local testing. */
  fastTestMode: boolean
  logRetentionDays: number
  /** LinkedIn people-search filter URL to scrape. */
  searchUrl: string
}

export type SyncPhase =
  | 'idle'
  | 'search_capture'
  | 'paused'
  | 'error'

export interface SyncProgress {
  /** Search result pages scraped. */
  pagesCaptured: number
  /** Unique people stored in IndexedDB. */
  peopleStored: number
  /** Page currently being scraped (1-based). */
  currentPage: number | null
  /** Short label (e.g. page N). */
  currentLabel: string | null
}

export interface SyncState {
  phase: SyncPhase
  /** True while automation is armed / running (not paused, not idle). */
  running: boolean
  startedAt: string | null
  stoppedAt: string | null
  lastSessionCheckAt: string | null
  lastWorkerSmokeAt: string | null
  message: string | null
  progress: SyncProgress
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export type LogEvent =
  | 'session_check'
  | 'worker_smoke'
  | 'scheduler_tick'
  | 'sync_started'
  | 'sync_paused'
  | 'sync_stopped'
  | 'sync_resumed'
  | 'search_capture_progress'
  | 'error'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  event: LogEvent
  message: string
}

export interface StorageSchema {
  settings: AppSettings
  syncState: SyncState
  logs: LogEntry[]
}
