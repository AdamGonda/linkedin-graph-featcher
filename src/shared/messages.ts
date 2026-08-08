import type { AppSettings, SyncState } from './types'
import type { PersonCard } from './person'

export type PaginatorState = {
  currentPage: number
  hasNext: boolean
}

export type MessageType =
  | 'PING'
  | 'CHECK_LI_SESSION'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'GET_SYNC_STATE'
  | 'START_AUTOMATION'
  | 'PAUSE_AUTOMATION'
  | 'STOP_AUTOMATION'
  | 'WORKER_SMOKE'
  | 'OPEN_UI_TAB'
  | 'SHOULD_ABORT_CRAWL'
  | 'PREPARE_SEARCH_PAGE'
  | 'EXTRACT_SEARCH_RESULTS'
  | 'READ_SEARCH_PAGINATOR'
  | 'EXPORT_PEOPLE'
  | 'GET_PEOPLE_COUNT'

export interface BaseMessage {
  type: MessageType
}

export interface PingMessage extends BaseMessage {
  type: 'PING'
}

export interface CheckLiSessionMessage extends BaseMessage {
  type: 'CHECK_LI_SESSION'
}

export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS'
}

export interface SaveSettingsMessage extends BaseMessage {
  type: 'SAVE_SETTINGS'
  settings: Partial<AppSettings>
}

export interface GetSyncStateMessage extends BaseMessage {
  type: 'GET_SYNC_STATE'
}

export interface StartAutomationMessage extends BaseMessage {
  type: 'START_AUTOMATION'
}

export interface PauseAutomationMessage extends BaseMessage {
  type: 'PAUSE_AUTOMATION'
}

export interface StopAutomationMessage extends BaseMessage {
  type: 'STOP_AUTOMATION'
}

export interface WorkerSmokeMessage extends BaseMessage {
  type: 'WORKER_SMOKE'
}

export interface OpenUiTabMessage extends BaseMessage {
  type: 'OPEN_UI_TAB'
}

export interface ShouldAbortCrawlMessage extends BaseMessage {
  type: 'SHOULD_ABORT_CRAWL'
}

export interface PrepareSearchPageMessage extends BaseMessage {
  type: 'PREPARE_SEARCH_PAGE'
}

export interface ExtractSearchResultsMessage extends BaseMessage {
  type: 'EXTRACT_SEARCH_RESULTS'
}

export interface ReadSearchPaginatorMessage extends BaseMessage {
  type: 'READ_SEARCH_PAGINATOR'
}

export interface ExportPeopleMessage extends BaseMessage {
  type: 'EXPORT_PEOPLE'
}

export interface GetPeopleCountMessage extends BaseMessage {
  type: 'GET_PEOPLE_COUNT'
}

export type ExtensionMessage =
  | PingMessage
  | CheckLiSessionMessage
  | GetSettingsMessage
  | SaveSettingsMessage
  | GetSyncStateMessage
  | StartAutomationMessage
  | PauseAutomationMessage
  | StopAutomationMessage
  | WorkerSmokeMessage
  | OpenUiTabMessage
  | ShouldAbortCrawlMessage
  | PrepareSearchPageMessage
  | ExtractSearchResultsMessage
  | ReadSearchPaginatorMessage
  | ExportPeopleMessage
  | GetPeopleCountMessage

export interface SuccessResponse<T = void> {
  success: true
  data?: T
}

export interface ErrorResponse {
  success: false
  error: string
}

export type MessageResponse<T = void> = SuccessResponse<T> | ErrorResponse

export async function sendMessage<T = void>(
  message: ExtensionMessage,
): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage(message)
    return response as MessageResponse<T>
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export type SessionCheckData = { loggedIn: boolean }
export type WorkerSmokeData = { ok: boolean; tabId?: number }
export type SyncStateData = SyncState
export type ExtractSearchResultsData = { people: PersonCard[] }
export type ExportPeopleData = { json: string; count: number }
export type PeopleCountData = { count: number }
