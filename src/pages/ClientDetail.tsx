import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import styles from './ClientDetail.module.css'

interface ClientDetailProps {
  clientId: number
  onBack: () => void
}

const clientData = {
  1: {
    name: 'Alice Johnson',
    status: 'active' as const,
    email: 'alice@acmecorp.com',
    phone: '+1 (555) 234-5678',
    company: 'ACME Corp',
    projects: [
      { name: 'Website Redesign', date: '2023-09' },
      { name: 'Brand Identity', date: '2023-06' },
      { name: 'Annual Report', date: '2023-03' },
    ],
    notes: 'Alice is a key account. She prefers bi-weekly check-ins and is interested in expanding the engagement to include social media strategy in Q2. Very responsive over email.',
  },
}

const defaultClient = {
  name: 'Client',
  status: 'active' as const,
  email: 'client@example.com',
  phone: '+1 (555) 000-0000',
  company: 'Example Co',
  projects: [{ name: 'Project Alpha', date: '2024-01' }],
  notes: 'No notes available.',
}

export default function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const client = (clientData as Record<number, typeof defaultClient>)[clientId] ?? defaultClient

  return (
    <div className={styles.page}>
      <Button variant="ghost" size="sm" onClick={onBack}>← Back to Clients</Button>

      <div className={styles.clientHeader}>
        <Avatar name={client.name} size="md" />
        <h1 className={styles.clientName}>{client.name}</h1>
        <Badge variant={client.status} />
      </div>

      <div className={styles.grid}>
        <Card>
          <h2 className={styles.cardTitle}>Contact Info</h2>
          <dl className={styles.infoList}>
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>Email</dt>
              <dd className={styles.infoValue}>{client.email}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>Phone</dt>
              <dd className={styles.infoValue}>{client.phone}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>Company</dt>
              <dd className={styles.infoValue}>{client.company}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className={styles.cardTitle}>Project History</h2>
          <ul className={styles.projectList}>
            {client.projects.map((p) => (
              <li key={p.name} className={styles.projectItem}>
                <span className={styles.projectName}>{p.name}</span>
                <span className={styles.projectDate}>{p.date}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className={styles.fullWidth}>
          <Card>
            <h2 className={styles.cardTitle}>Notes</h2>
            <p className={styles.notes}>{client.notes}</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
