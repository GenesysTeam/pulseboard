import { useState } from 'react'
import styles from './App.module.css'
import { SideNav } from './components/SideNav'
import ClientsList from './pages/ClientsList'
import ClientDetail from './pages/ClientDetail'
import Settings from './pages/Settings'
import GenuynOverlay from './components/GenuynOverlay/GenuynOverlay'
import { Button } from './components/Button/Button'
import { Badge } from './components/Badge/Badge'

type Page = 'clients' | 'client-detail' | 'settings' | 'users'

type Permission = 'Admin' | 'Editor' | 'Viewer'
type UserStatus = 'active' | 'inactive' | 'pending'

interface User {
  id: number
  name: string
  email: string
  role: Permission
  status: UserStatus
  department: string
}

const INITIAL_USERS: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active', department: 'Engineering' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'active', department: 'Marketing' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Viewer', status: 'inactive', department: 'Sales' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor', status: 'active', department: 'Engineering' },
  { id: 5, name: 'Eva Martinez', email: 'eva@example.com', role: 'Viewer', status: 'pending', department: 'HR' },
  { id: 6, name: 'Frank Lee', email: 'frank@example.com', role: 'Admin', status: 'active', department: 'Engineering' },
  { id: 7, name: 'Grace Kim', email: 'grace@example.com', role: 'Editor', status: 'active', department: 'Design' },
  { id: 8, name: 'Henry Wilson', email: 'henry@example.com', role: 'Viewer', status: 'inactive', department: 'Finance' },
  { id: 9, name: 'Isla Davis', email: 'isla@example.com', role: 'Editor', status: 'active', department: 'Marketing' },
  { id: 10, name: 'Jack Thompson', email: 'jack@example.com', role: 'Viewer', status: 'pending', department: 'Sales' },
  { id: 11, name: 'Karen Moore', email: 'karen@example.com', role: 'Admin', status: 'active', department: 'HR' },
  { id: 12, name: 'Liam Taylor', email: 'liam@example.com', role: 'Viewer', status: 'active', department: 'Engineering' },
  { id: 13, name: 'Mia Anderson', email: 'mia@example.com', role: 'Editor', status: 'inactive', department: 'Design' },
  { id: 14, name: 'Noah Jackson', email: 'noah@example.com', role: 'Viewer', status: 'active', department: 'Finance' },
  { id: 15, name: 'Olivia Harris', email: 'olivia@example.com', role: 'Editor', status: 'active', department: 'Marketing' },
  { id: 16, name: 'Paul Clark', email: 'paul@example.com', role: 'Viewer', status: 'pending', department: 'Sales' },
  { id: 17, name: 'Quinn Lewis', email: 'quinn@example.com', role: 'Admin', status: 'active', department: 'Engineering' },
  { id: 18, name: 'Rachel Walker', email: 'rachel@example.com', role: 'Editor', status: 'active', department: 'HR' },
  { id: 19, name: 'Sam Hall', email: 'sam@example.com', role: 'Viewer', status: 'inactive', department: 'Finance' },
  { id: 20, name: 'Tina Young', email: 'tina@example.com', role: 'Editor', status: 'active', department: 'Design' },
]

const navItems = [
  { label: 'Clients', key: 'clients' },
  { label: 'Users', key: 'users' },
  { label: 'Settings', key: 'settings' },
]

const genuynSession = new URLSearchParams(window.location.search).get('genuyn_session')

const emptyUser: Omit<User, 'id'> = { name: '', email: '', role: 'Viewer', status: 'active', department: '' }

export default function App() {
  const [activePage, setActivePage] = useState<Page>('clients')
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [users, setUsers] = useState<User[]>(INITIAL_USERS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<Omit<User, 'id'>>(emptyUser)
  const [search, setSearch] = useState('')

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

  const openCreate = () => {
    setEditingUser(null)
    setFormData(emptyUser)
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setFormData({ name: user.name, email: user.email, role: user.role, status: user.status, department: user.department })
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) return
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u))
    } else {
      const newId = Math.max(...users.map(u => u.id)) + 1
      setUsers(prev => [...prev, { id: newId, ...formData }])
    }
    setModalOpen(false)
  }

  const handleDelete = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  )

  const renderUsers = () => (
    <div style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>Users</h1>
          <p style={{ color: 'var(--color-neutral-500)', margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-sm)' }}>Manage users, edit permissions and info</p>
        </div>
        <Button variant="primary" size="md" onClick={openCreate}>+ Add User</Button>
      </div>

      <input
        placeholder="Search by name, email or department…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-neutral-300)',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-family)',
          marginBottom: 'var(--space-4)',
          outline: 'none',
        }}
      />

      <div style={{ border: '1px solid var(--color-neutral-300)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-white)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-family)', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--color-neutral-50)', borderBottom: '1px solid var(--color-neutral-300)' }}>
              {['Name', 'Email', 'Department', 'Role', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-700)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, i) => (
              <tr key={user.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-neutral-100)' : 'none' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-900)' }}>{user.name}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-neutral-500)' }}>{user.email}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-neutral-700)' }}>{user.department}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--weight-semibold)',
                    background: user.role === 'Admin' ? 'var(--color-primary-light)' : user.role === 'Editor' ? 'var(--color-secondary-light, #FEF3E8)' : 'var(--color-neutral-100)',
                    color: user.role === 'Admin' ? 'var(--color-primary)' : user.role === 'Editor' ? 'var(--color-secondary)' : 'var(--color-neutral-500)',
                  }}>{user.role}</span>
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                  <Badge variant={user.status === 'active' ? 'active' : user.status === 'pending' ? 'pending' : 'inactive'} />
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)}>Remove</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', padding: 'var(--space-5)', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: 'var(--font-family)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', margin: '0 0 var(--space-4) 0' }}>{editingUser ? 'Edit User' : 'Add User'}</h2>
            {([['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Department', 'department', 'text']] as [string, keyof Omit<User,'id'>, string][]).map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>{label}</label>
                <input
                  type={type}
                  value={formData[key] as string}
                  onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-neutral-300)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family)', outline: 'none' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>Role / Permission</label>
              <select
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as Permission }))}
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-neutral-300)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family)', outline: 'none', background: 'var(--color-white)' }}
              >
                <option value="Admin">Admin</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-neutral-700)', marginBottom: 'var(--space-1)' }}>Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as UserStatus }))}
                style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-neutral-300)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-family)', outline: 'none', background: 'var(--color-white)' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="ghost" size="md" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="md" onClick={handleSave}>{editingUser ? 'Save Changes' : 'Create User'}</Button>
            </div>
          </div>
        </div>
      )}
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
