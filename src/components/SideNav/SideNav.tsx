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
  const filteredItems = items.filter((item) => item.key !== 'users')

  return (
    <nav className={styles.sideNav}>
      <ul className={styles.navList}>
        {filteredItems.map((item) => {
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
    </nav>
  )
}
