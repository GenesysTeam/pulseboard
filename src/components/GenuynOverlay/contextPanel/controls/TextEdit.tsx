import { useEffect, useRef } from 'react'

interface TextEditProps {
  label: string
  value: string
  onChange: (val: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function TextEdit({ label, value, onChange, disabled, placeholder }: TextEditProps) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.style.width = `${Math.max(80, value.length * 7.5 + 16)}px`
  }, [value])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, minWidth: 52 }}>
        {label}
      </span>
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? 'Edit text…'}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        style={{
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 5,
          padding: '3px 7px',
          fontSize: 11,
          color: 'rgba(0,0,0,0.75)',
          background: 'rgba(0,0,0,0.03)',
          outline: 'none',
          fontFamily: 'system-ui, sans-serif',
          minWidth: 80,
          maxWidth: 160,
          cursor: disabled ? 'default' : 'text',
          transition: 'border-color 100ms',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.3)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)' }}
      />
    </div>
  )
}
