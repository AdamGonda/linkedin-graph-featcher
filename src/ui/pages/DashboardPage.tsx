import { useEffect, useState } from 'react'
import type { SyncState } from '../../shared/types'
import type { ExportPeopleData, PeopleCountData } from '../../shared/messages'
import { sendMessage } from '../../shared/messages'
import { useSettings } from '../hooks'

interface Props {
  connected: boolean
  checking: boolean
  onRecheck: () => void
  syncState: SyncState
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function DashboardPage({
  connected,
  checking,
  onRecheck,
  syncState,
}: Props) {
  const { settings, save } = useSettings()
  const [urlDraft, setUrlDraft] = useState('')
  const [busy, setBusy] = useState<
    'start' | 'pause' | 'stop' | 'smoke' | 'download' | 'saveUrl' | null
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [smokeResult, setSmokeResult] = useState<string | null>(null)
  const [peopleCount, setPeopleCount] = useState(0)

  const { progress } = syncState
  const isActive = syncState.running && syncState.phase !== 'paused'

  useEffect(() => {
    if (settings?.searchUrl) setUrlDraft(settings.searchUrl)
  }, [settings?.searchUrl])

  useEffect(() => {
    void refreshCount()
  }, [syncState.progress.peopleStored, syncState.phase])

  async function refreshCount() {
    const res = await sendMessage<PeopleCountData>({ type: 'GET_PEOPLE_COUNT' })
    if (res.success && res.data) {
      setPeopleCount(res.data.count)
    } else {
      setPeopleCount(progress.peopleStored)
    }
  }

  async function run(kind: typeof busy, fn: () => Promise<void>) {
    setBusy(kind)
    setActionError(null)
    try {
      await fn()
    } catch (e) {
      setActionError(String(e))
    } finally {
      setBusy(null)
    }
  }

  const stored = Math.max(progress.peopleStored, peopleCount)

  return (
    <div className="page">
      <h2 className="page__title">Search scrape</h2>
      <p className="page__lead">
        Paste a LinkedIn people-search filter URL. Start opens it in the worker window,
        reads profiles from the HTML, stores them locally, then advances with{' '}
        <code>page=N</code> while the paginator still has Next.
      </p>

      <section className="card">
        <h3 className="card__title">LinkedIn session</h3>
        <p className={`status-line ${connected ? 'ok' : 'bad'}`}>
          {checking
            ? 'Checking…'
            : connected
              ? 'Logged in'
              : 'Not logged in — sign in to LinkedIn in this Chrome profile'}
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onRecheck} disabled={checking}>
            Recheck
          </button>
        </div>
        {syncState.lastSessionCheckAt && (
          <p className="muted">Last check: {new Date(syncState.lastSessionCheckAt).toLocaleString()}</p>
        )}
      </section>

      <section className="card">
        <h3 className="card__title">People search URL</h3>
        <textarea
          className="url-input"
          rows={3}
          value={urlDraft}
          disabled={isActive || !!busy}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="https://www.linkedin.com/search/results/people/…"
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            disabled={isActive || !!busy || !urlDraft.trim()}
            onClick={() =>
              void run('saveUrl', async () => {
                await save({ searchUrl: urlDraft.trim() })
              })
            }
          >
            {busy === 'saveUrl' ? 'Saving…' : 'Save URL'}
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="card__title">Automation</h3>
        <p className={`status-line ${isActive ? 'ok' : syncState.phase === 'error' ? 'bad' : ''}`}>
          Status:{' '}
          <strong>
            {syncState.phase}
            {syncState.running ? ' (running)' : ''}
          </strong>
        </p>
        {syncState.message && <p className="muted">{syncState.message}</p>}

        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!connected || !!busy || isActive}
            onClick={() =>
              void run('start', async () => {
                const url = urlDraft.trim()
                await save({ searchUrl: url })
                const res = await sendMessage({ type: 'START_AUTOMATION' })
                if (!res.success) throw new Error(res.error)
              })
            }
          >
            {busy === 'start' ? 'Starting…' : 'Start'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!syncState.running || !!busy}
            onClick={() =>
              void run('pause', async () => {
                const res = await sendMessage({ type: 'PAUSE_AUTOMATION' })
                if (!res.success) throw new Error(res.error)
              })
            }
          >
            {busy === 'pause' ? 'Pausing…' : 'Pause'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={(syncState.phase === 'idle' && !syncState.running) || !!busy}
            onClick={() =>
              void run('stop', async () => {
                const res = await sendMessage({ type: 'STOP_AUTOMATION' })
                if (!res.success) throw new Error(res.error)
              })
            }
          >
            {busy === 'stop' ? 'Stopping…' : 'Stop'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!!busy || stored === 0}
            onClick={() =>
              void run('download', async () => {
                const res = await sendMessage<ExportPeopleData>({
                  type: 'EXPORT_PEOPLE',
                })
                if (!res.success || !res.data) {
                  throw new Error(res.success === false ? res.error : 'Export failed')
                }
                if (res.data.count === 0) throw new Error('No people to export')
                const blob = new Blob([res.data.json], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                triggerDownload(url, `linkedin-search-people-${res.data.count}.json`)
                URL.revokeObjectURL(url)
              })
            }
          >
            {busy === 'download' ? 'Exporting…' : 'Download JSON'}
          </button>
        </div>
        {actionError && <p className="error-text">{actionError}</p>}
        {syncState.startedAt && (
          <p className="muted">Started: {new Date(syncState.startedAt).toLocaleString()}</p>
        )}
      </section>

      <section className="card">
        <h3 className="card__title">Progress</h3>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">People stored</div>
            <div className="stat__value">{stored}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Pages scraped</div>
            <div className="stat__value">{progress.pagesCaptured}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Current page</div>
            <div className="stat__value">{progress.currentPage ?? '—'}</div>
          </div>
        </div>
        {progress.currentLabel && (
          <p className="muted">Current: {progress.currentLabel}</p>
        )}
        {!syncState.running && stored === 0 && (
          <p className="muted">No people yet. Save a filter URL and press Start.</p>
        )}
        {stored > 0 && !syncState.running && (
          <p className="muted">Stored in IndexedDB — use Download JSON to export.</p>
        )}
      </section>

      <section className="card card--secondary">
        <h3 className="card__title">Worker window check</h3>
        <p className="muted">
          Smoke-test: open the saved search URL in the worker window (does not start a scrape).
        </p>
        <button
          type="button"
          className="btn"
          disabled={!connected || !!busy}
          onClick={() =>
            void run('smoke', async () => {
              setSmokeResult(null)
              if (urlDraft.trim()) await save({ searchUrl: urlDraft.trim() })
              const response = await sendMessage<{ ok: boolean; tabId?: number }>({
                type: 'WORKER_SMOKE',
              })
              if (response.success && response.data?.ok) {
                setSmokeResult(`OK — worker tab ${response.data.tabId ?? '?'}`)
              } else {
                throw new Error(response.success === false ? response.error : 'Smoke failed')
              }
            })
          }
        >
          {busy === 'smoke' ? 'Opening…' : 'Open search URL in worker window'}
        </button>
        {smokeResult && <p className="smoke-result">{smokeResult}</p>}
      </section>
    </div>
  )
}
