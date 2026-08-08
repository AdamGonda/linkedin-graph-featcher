import { useState } from 'react'
import { useLiConnection, useSettings, useSyncState } from './hooks'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import { EXTENSION_VERSION } from '../shared/constants'

export type Page = 'dashboard' | 'settings'

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Control' },
  { id: 'settings', label: 'Settings' },
]

const LOGO_URL = chrome.runtime.getURL('public/icons/icon48.png')

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const { connected, checking, recheck } = useLiConnection()
  const { settings } = useSettings()
  const { syncState } = useSyncState()

  const running = syncState.running

  return (
    <div className="app-shell">
      <header className="app-header">
        <img className="app-header__logo" src={LOGO_URL} width={28} height={28} alt="" />
        <h1 className="app-header__title">LinkedIn Search Scraper</h1>
        {running && <span className="app-header__pill">Running</span>}
      </header>

      <aside className="app-sidebar">
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav__item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        {currentPage === 'dashboard' ? (
          <DashboardPage
            connected={connected}
            checking={checking}
            onRecheck={recheck}
            syncState={syncState}
          />
        ) : (
          <SettingsPage />
        )}
      </main>

      <footer className="app-statusbar">
        <div className={`statusbar__dot ${connected ? 'connected' : ''}`} />
        <span>
          {checking
            ? 'Checking LinkedIn…'
            : connected
              ? 'LinkedIn connected'
              : 'LinkedIn not connected'}
        </span>
        {!connected && !checking && (
          <span className="statusbar__warn">Log in to LinkedIn in this Chrome profile</span>
        )}
        {running && <span className="statusbar__badge statusbar__badge--run">Automation on</span>}
        {settings?.syncPaused && !running && (
          <span className="statusbar__badge">Sync paused</span>
        )}
        {settings?.fastTestMode && <span className="statusbar__badge">Fast test</span>}
        <span className="statusbar__version">v{EXTENSION_VERSION}</span>
      </footer>
    </div>
  )
}
