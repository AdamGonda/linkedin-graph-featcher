import type { LogEntry, LogEvent, LogLevel } from '../shared/types'
import { storageGet, storageUpdate } from './storage-wrapper'

function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function appendLog(
  entry: Omit<LogEntry, 'id' | 'timestamp'>,
): Promise<LogEntry> {
  const full: LogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  }
  await storageUpdate('logs', (logs) => [full, ...logs].slice(0, 500))
  return full
}

export async function logInfo(event: LogEvent, message: string): Promise<void> {
  await appendLog({ level: 'info', event, message })
}

export async function logSuccess(event: LogEvent, message: string): Promise<void> {
  await appendLog({ level: 'success', event, message })
}

export async function logWarn(event: LogEvent, message: string): Promise<void> {
  await appendLog({ level: 'warn', event, message })
}

export async function logError(event: LogEvent, message: string): Promise<void> {
  await appendLog({ level: 'error', event, message })
}

export async function getLogs(limit = 100): Promise<LogEntry[]> {
  const logs = await storageGet('logs')
  return logs.slice(0, limit)
}

export async function pruneOldLogs(retentionDays: number): Promise<number> {
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString()
  let removed = 0
  await storageUpdate('logs', (logs) => {
    const kept = logs.filter((l) => l.timestamp > cutoff)
    removed = logs.length - kept.length
    return kept
  })
  return removed
}

export type { LogLevel }
