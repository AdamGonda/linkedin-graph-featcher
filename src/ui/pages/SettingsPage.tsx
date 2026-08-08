import { useSettings } from '../hooks'

export default function SettingsPage() {
  const { settings, loading, save } = useSettings()

  if (loading || !settings) {
    return (
      <div className="page">
        <h2 className="page__title">Settings</h2>
        <p className="muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="page__title">Settings</h2>
      <p className="page__lead">
        Conservative defaults for LinkedIn crawling. Sync stays paused until you Start.
      </p>

      <section className="card">
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Min/max delay below are waits between people-search <strong>pages</strong>{' '}
          (after each HTML extract). Fast test mode shortens them.
        </p>
        <label className="field">
          <span>Min hop delay (seconds)</span>
          <input
            type="number"
            min={1}
            value={settings.minDelaySeconds}
            onChange={(e) =>
              void save({ minDelaySeconds: Number(e.target.value) || settings.minDelaySeconds })
            }
          />
        </label>
        <label className="field">
          <span>Max hop delay (seconds)</span>
          <input
            type="number"
            min={1}
            value={settings.maxDelaySeconds}
            onChange={(e) =>
              void save({ maxDelaySeconds: Number(e.target.value) || settings.maxDelaySeconds })
            }
          />
        </label>
        <label className="field field--row">
          <input
            type="checkbox"
            checked={settings.syncPaused}
            onChange={(e) => void save({ syncPaused: e.target.checked })}
          />
          <span>Pause sync</span>
        </label>
        <label className="field field--row">
          <input
            type="checkbox"
            checked={settings.fastTestMode}
            onChange={(e) => void save({ fastTestMode: e.target.checked })}
          />
          <span>Fast test mode (shorter scroll + hop delays)</span>
        </label>
      </section>
    </div>
  )
}
