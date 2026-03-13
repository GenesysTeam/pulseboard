import styles from './Input.module.css'

interface InputProps {
  label: string
  placeholder?: string
  helperText?: string
  error?: string
  disabled?: boolean
  value: string
  onChange: (value: string) => void
  type?: string
}

export function Input({
  label,
  placeholder,
  helperText,
  error,
  disabled = false,
  value,
  onChange,
  type = 'text',
}: InputProps) {
  const inputClasses = [
    styles.input,
    error ? styles.error : '',
    disabled ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        className={inputClasses}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <span className={styles.errorText}>{error}</span>
      ) : helperText ? (
        <span className={styles.helperText}>{helperText}</span>
      ) : null}
    </div>
  )
}
