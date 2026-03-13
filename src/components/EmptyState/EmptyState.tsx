import styles from './EmptyState.module.css'
import { Button } from '../Button'

interface EmptyStateProps {
  heading: string
  description: string
  action?: { label: string; onClick: () => void }
  illustration?: React.ReactNode
}

const DefaultIllustration = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="12" y="12" width="56" height="56" rx="8" />
    <line x1="24" y1="32" x2="56" y2="32" />
    <line x1="24" y1="44" x2="44" y2="44" />
  </svg>
)

export function EmptyState({ heading, description, action, illustration }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.illustration}>
        {illustration ?? <DefaultIllustration />}
      </div>
      <h3 className={styles.heading}>{heading}</h3>
      <p className={styles.description}>{description}</p>
      {action && (
        <div className={styles.action}>
          <Button variant="primary" size="md" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
