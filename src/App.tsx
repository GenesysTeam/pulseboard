import { useState } from 'react'
import styles from './App.module.css'
import { SideNav } from './components/SideNav'
import ClientsList from './pages/ClientsList'
import ClientDetail from './pages/ClientDetail'
import Settings from './pages/Settings'
import GenuynOverlay from './components/GenuynOverlay/GenuynOverlay'

type Page = 'clients' | 'client-detail' | 'settings'

const navItems = [
  { label: 'Clients', key: 'clients' },
  { label: 'Settings', key: 'settings' },
]

const genuynSession = new URLSearchParams(window.location.search).get('genuyn_session')

export default function App() {
  const [activePage, setActivePage] = useState<Page>('clients')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleNavSelect = (key: string) => {
    if (key === 'clients' || key === 'settings') {
      setActivePage(key)
    }
  }

  const handleClientSelect = (id: number) => {
    setSelectedClientId(id)
    setActivePage('client-detail')
  }

  const activeKey = activePage === 'client-detail' ? 'clients' : activePage

  return (
    <div className={styles.app}>
      <SideNav
        items={navItems}
        activeKey={activeKey}
        onSelect={handleNavSelect}
      />
      <main className={styles.main}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-neutral-300)' }}>
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-base)',
              border: '1px solid var(--color-neutral-300)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-family)',
            }}
          />
        </div>
        {activePage === 'clients' && (
          <ClientsList onClientSelect={handleClientSelect} />
        )}
        {activePage === 'client-detail' && selectedClientId !== null && (
          <ClientDetail clientId={selectedClientId} onBack={() => setActivePage('clients')} />
        )}
        {activePage === 'settings' && <Settings />}
      </main>
      {genuynSession && <GenuynOverlay sessionId={genuynSession} />}
    </div>
  )
}
