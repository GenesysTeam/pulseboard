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
  { id: 1, name: 'Alice Johnson', email: 'alice@acmecorp.com', status: 'active', lastContact: '2024-01-10' },
  { id: 2, name: 'Bob Smith', email: 'bob@techstart.io', status: 'pending', lastContact: '2024-01-08' },
  { id: 3, name: 'Carol White', email: 'carol@designstudio.co', status: 'inactive', lastContact: '2023-12-20' },
  { id: 4, name: 'David Brown', email: 'david@freelance.com', status: 'overdue', lastContact: '2023-11-15' },
  { id: 5, name: 'Emma Davis', email: 'emma@startup.xyz', status: 'active', lastContact: '2024-01-12' },
  { id: 6, name: 'Frank Miller', email: 'frank@agency.net', status: 'pending', lastContact: '2024-01-05' },
  { id: 7, name: 'Grace Wilson', email: 'grace@consulting.co', status: 'active', lastContact: '2024-01-15' },
  { id: 8, name: 'Henry Moore', email: 'henry@innovate.net', status: 'overdue', lastContact: '2023-12-01' },
  { id: 9, name: 'Ivy Taylor', email: 'ivy@creative.org', status: 'pending', lastContact: '2024-01-07' },
  { id: 10, name: 'Jack White', email: 'jack@solutions.io', status: 'inactive', lastContact: '2023-11-25' },
  { id: 11, name: 'Karen Hall', email: 'karen@globalcorp.com', status: 'active', lastContact: '2024-01-11' },
]

interface ClientsListProps {
  onClientSelect: (id: number) => void
}

export default function ClientsList({ onClientSelect }: ClientsListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailFilter, setEmailFilter] = useState('')

  const filteredClients = mockClients.filter(c =>
    c.email.toLowerCase().includes(emailFilter.toLowerCase())
  )

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'email',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span>Email</span>
          <button
            onClick={() => setEmailFilter('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.5 2.5C6.5 2.22386 6.72386 2 7 2H9C9.27614 2 9.5 2.22386 9.5 2.5V3H13C13.2761 3 13.5 3.22386 13.5 3.5C13.5 3.77614 13.2761 4 13 4H12.4L11.9 12.5C11.8 14 10.6 15 9.2 15H6.8C5.4 15 4.2 14 4.1 12.5L3.6 4H3C2.72386 4 2.5 3.77614 2.5 3.5C2.5 3.22386 2.72386 3 3 3H6.5V2.5ZM6 6C5.72386 6 5.5 6.22386 5.5 6.5V12C5.5 12.2761 5.72386 12.5 6 12.5C6.27614 12.5 6.5 12.2761 6.5 12V6.5C6.5 6.22386 6.27614 6 6 6ZM10 6C9.72386 6 9.5 6.22386 9.5 6.5V12C9.5 12.2761 9.72386 12.5 10 12.5C10.2761 12.5 10.5 12.2761 10.5 12V6.5C10.5 6.22386 10.2761 6 10 6Z" fill="var(--color-neutral-500)"/>
            </svg>
          </button>
        </div>
      ) as unknown as string,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => (
        <Badge variant={value as 'active' | 'pending' | 'inactive' | 'overdue'} />
      ),
    },
    { key: 'lastContact', label: 'Last Contact' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Clients</h1>

        <div className={styles.headerActions}>
          <Button variant="ghost" size="sm" onClick={() => setShowEmpty(!showEmpty)}>
            Toggle Empty
          </Button>
          <Button variant="secondary" size="md" onClick={() => {}}>
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
          data={filteredClients as unknown as Record<string, unknown>[]}
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
