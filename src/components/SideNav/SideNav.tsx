import styles from './SideNav.module.css'

interface NavItem {
  label: string
  key: string
}

interface SideNavProps {
  items: NavItem[]
  activeKey: string
  onSelect: (key: string) => void
}

export function SideNav({ items, activeKey, onSelect }: SideNavProps) {
  return (
    <nav className={styles.sideNav}>
      <ul className={styles.navList}>
        {items.map((item) => {
          const isActive = item.key === activeKey
          return (
            <li
              key={item.key}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => onSelect(item.key)}
            >
              {item.label}
            </li>
          )
        })}
      </ul>
      <div
        style={{
          padding: 'var(--space-2) var(--space-4)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-neutral-700)',
          cursor: 'pointer',
          marginTop: 'auto' /* Push to bottom */
        }}
        onClick={() => {}}
      >
        Logout
      </div>
    </nav>
  )
}
