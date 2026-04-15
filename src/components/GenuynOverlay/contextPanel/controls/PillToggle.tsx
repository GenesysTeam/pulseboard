interface PillToggleProps {
  label: string
  options: string[]
  value: string | null
  onChange: (val: string) => void
  disabled?: boolean
}

export default function PillToggle({ label, options, value, onChange, disabled }: PillToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, minWidth: 52 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => !disabled && onChange(opt)}
            style={{
              padding: '3px 9px',
              borderRadius: 5,
              border: `1px solid ${value === opt ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)'}`,
              background: value === opt ? 'rgba(0,0,0,0.07)' : 'transparent',
              fontSize: 11,
              fontWeight: value === opt ? 600 : 400,
              color: value === opt ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.45)',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 100ms',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
