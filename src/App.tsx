import { useState } from 'react'
import styles from './App.module.css'
import { SideNav } from './components/SideNav'
import ClientsList from './pages/ClientsList'
import ClientDetail from './pages/ClientDetail'
import Settings from './pages/Settings'
import GenuynOverlay from './components/GenuynOverlay/GenuynOverlay'

type Page = 'clients' | 'client-detail' | 'settings' | 'users'

const navItems = [
  { label: 'Clients', key: 'clients' },
  { label: 'Users', key: 'users' },
  { label: 'Settings', key: 'settings' },
]

const genuynSession = new URLSearchParams(window.location.search).get('genuyn_session')

export default function App() {
  const [activePage, setActivePage] = useState<Page>('clients')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

  const handleNavSelect = (key: string) => {
    if (key === 'clients' || key === 'settings' || key === 'users') {
      setActivePage(key as Page)
    }
  }

  const handleClientSelect = (id: number) => {
    setSelectedClientId(id)
    setActivePage('client-detail')
  }

  const activeKey = activePage === 'client-detail' ? 'clients' : activePage

  const renderUsers = () => (
    <div style={{ padding: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-4)' }}>Users</h1>
      <p style={{ color: 'var(--color-neutral-500)', marginBottom: 'var(--space-4)' }}>Manage users, edit permissions, and search users</p>
    </div>
  )

  return (
    <div className={styles.app}>
      <SideNav
        items={navItems}
        activeKey={activeKey}
        onSelect={handleNavSelect}
      />
      <main className={styles.main}>
        {activePage === 'clients' && (
          <ClientsList onClientSelect={handleClientSelect} />
        )}
        {activePage === 'client-detail' && selectedClientId !== null && (
          <ClientDetail clientId={selectedClientId} onBack={() => setActivePage('clients')} />
        )}
        {activePage === 'settings' && <Settings />}
        {activePage === 'users' && renderUsers()}
      </main>
      {genuynSession && <GenuynOverlay sessionId={genuynSession} />}
    </div>
  )
}
