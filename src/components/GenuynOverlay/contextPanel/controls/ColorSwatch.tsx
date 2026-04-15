export const COLOR_TOKENS = [
  { label: 'Primary',    cssVar: '--color-primary',       hex: '#1B65A6' },
  { label: 'Primary Lt', cssVar: '--color-primary-light',  hex: '#E8F1FA' },
  { label: 'Secondary',  cssVar: '--color-secondary',      hex: '#F28C38' },
  { label: 'Error',      cssVar: '--color-error',          hex: '#C93B3B' },
  { label: 'Success',    cssVar: '--color-success',        hex: '#2D8659' },
  { label: 'Neutral',    cssVar: '--color-neutral-700',    hex: '#374151' },
  { label: 'Light',      cssVar: '--color-neutral-100',    hex: '#F3F4F6' },
  { label: 'White',      cssVar: '--color-white',          hex: '#FFFFFF' },
]

interface ColorSwatchProps {
  label: string
  activeVar: string | null
  onChange: (cssVar: string) => void
  disabled?: boolean
}

export default function ColorSwatch({ label, activeVar, onChange, disabled }: ColorSwatchProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0, minWidth: 52 }}>
        {label}
      </span>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {COLOR_TOKENS.map(t => (
          <button
            key={t.cssVar}
            title={t.label}
            onClick={() => !disabled && onChange(t.cssVar)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: t.hex,
              border: activeVar === t.cssVar
                ? '2px solid rgba(0,0,0,0.5)'
                : t.hex === '#FFFFFF' ? '1px solid rgba(0,0,0,0.12)' : '1.5px solid transparent',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'transform 100ms, border 100ms',
              transform: activeVar === t.cssVar ? 'scale(1.15)' : 'scale(1)',
              flexShrink: 0,
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
