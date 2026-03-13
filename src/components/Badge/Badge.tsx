import styles from './Badge.module.css'

interface BadgeProps {
  variant: 'active' | 'pending' | 'inactive' | 'overdue'
}

const labels: Record<BadgeProps['variant'], string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  overdue: 'Overdue',
}

export function Badge({ variant }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {labels[variant]}
    </span>
  )
}
