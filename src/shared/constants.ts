// =============================================
// Constants — LinkedIn Search Scraper
// =============================================

export const EXTENSION_VERSION = '0.1.0'

export const MIN_DELAY_SECONDS = 4
export const MAX_DELAY_SECONDS = 6
export const FAST_TEST_DELAY_SECONDS = 15

export const SCHEDULER_ALARM_NAME = 'linkedin-graph-scheduler'
export const SCHEDULER_PERIOD_MINUTES = 1

export const UI_PAGE = 'src/ui/index.html'
export const WORKER_PAGE = 'src/background/worker.html'

export const DEFAULT_SEARCH_URL =
  'https://www.linkedin.com/search/results/people/?origin=FACETED_SEARCH&network=%5B%22F%22%2C%22S%22%5D&page=1'

export const DEFAULT_LOG_RETENTION_DAYS = 30

export const DEFAULT_SETTINGS = {
  minDelaySeconds: MIN_DELAY_SECONDS,
  maxDelaySeconds: MAX_DELAY_SECONDS,
  syncPaused: true,
  fastTestMode: false,
  logRetentionDays: DEFAULT_LOG_RETENTION_DAYS,
  searchUrl: DEFAULT_SEARCH_URL,
} as const

export const DEFAULT_SYNC_PROGRESS = {
  pagesCaptured: 0,
  peopleStored: 0,
  currentPage: null as number | null,
  currentLabel: null as string | null,
}

export const DEFAULT_SYNC_STATE = {
  phase: 'idle' as const,
  running: false,
  startedAt: null as string | null,
  stoppedAt: null as string | null,
  lastSessionCheckAt: null as string | null,
  lastWorkerSmokeAt: null as string | null,
  message: null as string | null,
  progress: { ...DEFAULT_SYNC_PROGRESS },
}
