import { useState } from 'react'
import styles from './App.module.css'
import { SideNav } from './components/SideNav'
import ClientsList from './pages/ClientsList'
import ClientDetail from './pages/ClientDetail'
import Settings from './pages/Settings'

type Page = 'clients' | 'client-detail' | 'settings'

const navItems = [
  { label: 'Clients', key: 'clients' },
  { label: 'Settings', key: 'settings' },
]

export default function App() {
  const [activePage, setActivePage] = useState<Page>('clients')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)

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
        {activePage === 'clients' && (
          <ClientsList onClientSelect={handleClientSelect} />
        )}
        {activePage === 'client-detail' && selectedClientId !== null && (
          <ClientDetail clientId={selectedClientId} onBack={() => setActivePage('clients')} />
        )}
        {activePage === 'settings' && <Settings />}
      </main>
    </div>
  )
}
