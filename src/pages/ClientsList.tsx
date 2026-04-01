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
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = mockClients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Clients</h1>
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ maxWidth: '300px' }}
        />
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
