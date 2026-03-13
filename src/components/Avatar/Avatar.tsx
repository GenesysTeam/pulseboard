import styles from './Avatar.module.css'

interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md'
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ''
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  return (
    <div className={`${styles.avatar} ${styles[size]}`} title={name}>
      {src ? (
        <img src={src} alt={name} className={styles.image} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}
