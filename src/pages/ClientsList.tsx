import { useState } from 'react'
import { Table } from '../components/Table'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { EmptyState } from '../components/EmptyState'
import styles from './ClientsList.module.css'

interface Client {
  id: number
  name: string
  email: string
  status: 'active' | 'pending' | 'inactive' | 'overdue'
  lastContact: string
}

const mockClients: Client[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@acmecorp.com', status: 'inactive', lastContact: '2024-01-10' },
  { id: 2, name: 'Bob Smith', email: 'bob@techstart.io', status: 'pending', lastContact: '2024-01-08' },
  { id: 3, name: 'Carol White', email: 'carol@gmail.com', status: 'pending', lastContact: '2023-12-20' },
  { id: 4, name: 'David Brown', email: 'david@freelance.com', status: 'overdue', lastContact: '2023-11-15' },
  { id: 5, name: 'Emma Davis', email: 'emma@startup.xyz', status: 'overdue', lastContact: 'kasndkansd' },
  { id: 6, name: 'Frank Miller', email: 'frank@agency.net', status: 'pending', lastContact: '2024-01-05' },
]

interface ClientsListProps {
  onClientSelect: (id: number) => void
}

export default function ClientsList({ onClientSelect }: ClientsListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => (
        <Badge variant={value as 'active' | 'pending' | 'inactive' | 'overdue'} />
      ),
    },
    { key: 'lastContact', label: 'Last Contact' },
  ]

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Last Contact']
    const rows = mockClients.map(c => [c.name, c.email, c.status, c.lastContact])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clients.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Clients</h1>
        <div className={styles.headerActions}>
          <Button variant="ghost" size="md" onClick={() => setShowEmpty(!showEmpty)} style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-neutral-700)' }}>
            Toggle Empty
          </Button>
          <Button variant="secondary" size="md" onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
            Add Client
          </Button>
        </div>
      </div>

      {showEmpty ? (
        <EmptyState
          heading="No clients yet"
          description="Add your first client to get started."
          action={{ label: 'Add Client', onClick: () => setIsModalOpen(true) }}
        />
      ) : (
        <Table
          columns={columns}
          data={mockClients as unknown as Record<string, unknown>[]}
          onRowClick={(row) => onClientSelect(row.id as number)}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Client"
        primaryAction={{
          label: 'Add Client',
          onClick: () => {
            setNewName('')
            setNewEmail('')
            setIsModalOpen(false)
          },
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setIsModalOpen(false),
        }}
      >
        <Input label="Name" placeholder="Client name" value={newName} onChange={setNewName} />
        <Input label="Email" placeholder="client@example.com" value={newEmail} onChange={setNewEmail} />
      </Modal>
    </div>
  )
}
