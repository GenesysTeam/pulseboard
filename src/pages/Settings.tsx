import { useState } from 'react'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'
import styles from './Settings.module.css'

export default function Settings() {
  const [fullName, setFullName] = useState('Alex Consultant')
  const [email, setEmail] = useState('alex@consultant.com')
  const [company, setCompany] = useState('Alex & Co')

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      <Card>
        <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
          <Input label="Full Name" value={fullName} onChange={setFullName} />
          <Input label="Email" type="email" value={email} onChange={setEmail} />
          <Input label="Company Name" value={company} onChange={setCompany} />
          <div className={styles.saveRow}>
            <Button variant="primary" size="md" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <div className={styles.dangerZone}>
        <hr className={styles.rule} />
        <div className={styles.dangerSection}>
          <div>
            <p className={styles.dangerTitle}>Delete Account</p>
            <p className={styles.dangerDesc}>
              This action is permanent and cannot be undone.
            </p>
          </div>
          <span className={styles.dangerAction}>
            <Button variant="ghost" size="md" onClick={() => {}}>
              Delete Account
            </Button>
          </span>
        </div>
      </div>
    </div>
  )
}
