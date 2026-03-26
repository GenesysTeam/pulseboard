import { useCallback, useEffect, useRef, useState } from 'react'

const GENUYN_API = `https://${window.location.host}`
const ACCENT = '#6C6FFF'
const ACCENT_BG = 'rgba(108,111,255,0.06)'
const GLASS = 'rgba(255,255,255,0.72)'
const GLASS_BORDER = 'rgba(255,255,255,0.5)'

type Mode = 'preview' | 'edit'

interface SessionEvent {
  id: string
  command: string
  status: 'pending' | 'applied' | 'failed'
}

interface HoveredEl {
  el: Element
  file: string
  rect: DOMRect
}

// Build { ComponentName: 'src/path/File.tsx' } from file list
function buildFileMap(files: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of files) {
    const name = f.split('/').pop()?.replace(/\.(tsx|jsx|ts|js)$/, '')
    if (name) map[name] = f
  }
  return map
}

// Walk React fiber tree to find component name → add data-genuyn attribute
function labelComponents(fileMap: Record<string, string>) {
  document.querySelectorAll('*').forEach((el) => {
    if ((el as HTMLElement).closest?.('[data-genuyn-overlay]')) return
    const fiberKey = Object.keys(el).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    )
    if (!fiberKey) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber = (el as any)[fiberKey]
    while (fiber) {
      const name: string = fiber.type?.displayName || fiber.type?.name || ''
      if (name && fileMap[name]) {
        el.setAttribute('data-genuyn', fileMap[name])
        break
      }
      fiber = fiber.return
    }
  })
}

function pill(active: boolean) {
  return {
    background: active ? '#fff' : 'transparent',
    border: 'none',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    color: active ? '#000' : 'rgba(0,0,0,0.45)',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 100ms ease',
    fontFamily: 'system-ui,sans-serif',
    textTransform: 'capitalize' as const,
  }
}

export default function GenuynOverlay({ sessionId }: { sessionId: string }) {
  const [mode, setMode] = useState<Mode>(
    () => (sessionStorage.getItem('genuyn-mode') as Mode) || 'preview'
  )
  const [fileMap, setFileMap] = useState<Record<string, string>>({})
  const [hovered, setHovered] = useState<HoveredEl | null>(null)
  const [locked, setLocked] = useState<HoveredEl | null>(null)
  const [chipInput, setChipInput] = useState('')
  const [globalInput, setGlobalInput] = useState('')
  const [processing, setProcessing] = useState<{ type: 'component' | 'global'; rect?: DOMRect } | null>(null)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout>>()

  // Persist mode
  useEffect(() => { sessionStorage.setItem('genuyn-mode', mode) }, [mode])

  // Fetch file list
  useEffect(() => {
    fetch(`${GENUYN_API}/sessions/${sessionId}/files`)
      .then((r) => r.json())
      .then((files: string[]) => setFileMap(buildFileMap(files)))
      .catch(() => {})
  }, [sessionId])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    const res = await fetch(`${GENUYN_API}/sessions/${sessionId}/events`)
    if (res.ok) setEvents((await res.json()).reverse())
  }, [sessionId])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Label DOM when entering edit mode or fileMap updates
  useEffect(() => {
    if (mode === 'edit' && Object.keys(fileMap).length > 0) labelComponents(fileMap)
  }, [mode, fileMap])

  // WS
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`wss://${window.location.host}/ws?session=${sessionId}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'refresh') {
          setProcessing(null)
          fetchEvents()
          setTimeout(() => labelComponents(fileMap), 600)
          window.location.reload()
        }
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId, fileMap, fetchEvents])

  // Mouse tracking for component hover
  useEffect(() => {
    if (mode !== 'edit' || locked) return

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element

      // Cursor over overlay — keep chip alive, don't dismiss
      if (target.closest('[data-genuyn-overlay]')) {
        clearTimeout(dismissRef.current)
        return
      }

      // Walk up to find nearest labeled component
      let el: Element | null = target
      while (el) {
        if (el.hasAttribute('data-genuyn')) {
          clearTimeout(dismissRef.current)
          const file = el.getAttribute('data-genuyn')!
          const rect = el.getBoundingClientRect()
          setHovered({ el, file, rect })
          return
        }
        el = el.parentElement
      }

      // Nothing found — dismiss after short delay
      clearTimeout(dismissRef.current)
      dismissRef.current = setTimeout(() => setHovered(null), 600)
    }

    document.addEventListener('mousemove', onMove)
    return () => {
      document.removeEventListener('mousemove', onMove)
      clearTimeout(dismissRef.current)
    }
  }, [mode, locked])

  // Escape to dismiss chip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLocked(null); setChipInput('') }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const sendCommand = async (command: string, filePath?: string, rect?: DOMRect) => {
    setProcessing({ type: filePath ? 'component' : 'global', rect })
    setHovered(null)
    setLocked(null)
    await fetch(`${GENUYN_API}/sessions/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, filePath }),
    })
  }

  const handleChipSend = () => {
    const target = locked || hovered
    if (!chipInput.trim() || !target) return
    const rect = target.el.getBoundingClientRect()
    sendCommand(chipInput.trim(), target.file, rect)
    setChipInput('')
  }

  const handleGlobalSend = () => {
    if (!globalInput.trim() || processing) return
    sendCommand(globalInput.trim())
    setGlobalInput('')
  }

  // Active highlight target
  const activeEl = locked || hovered
  const activeRect = activeEl?.el.getBoundingClientRect()

  const ModePill = () => (
    <div style={{ display: 'flex', borderRadius: 999, background: 'rgba(0,0,0,0.07)', padding: 3, gap: 2 }}>
      {(['preview', 'edit'] as const).map((m) => (
        <button key={m} onClick={() => setMode(m)} style={pill(mode === m)}>{m}</button>
      ))}
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes genuyn-shimmer {
          0%,100% { opacity:0.25 }
          50% { opacity:0.55 }
        }
        @keyframes genuyn-pulse {
          0%,100% { box-shadow:0 0 0 0 rgba(108,111,255,0.4) }
          50% { box-shadow:0 0 0 6px rgba(108,111,255,0) }
        }
      `}</style>

      <div data-genuyn-overlay="true" style={{ fontFamily: 'system-ui,sans-serif' }}>

        {/* PREVIEW MODE — toggle pill only */}
        {mode === 'preview' && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999,
            background: GLASS, backdropFilter: 'blur(12px)',
            border: `1px solid ${GLASS_BORDER}`,
            borderRadius: 999, padding: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}>
            <ModePill />
          </div>
        )}

        {/* EDIT MODE — frosted toolbar */}
        {mode === 'edit' && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
            height: 48,
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            boxShadow: processing?.type === 'global'
              ? `inset 0 2px 0 ${ACCENT}`
              : '0 -1px 0 rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(0,0,0,0.35)', letterSpacing: '-0.01em', flexShrink: 0 }}>
              Genuyn
            </span>

            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={globalInput}
                onChange={(e) => setGlobalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSend()}
                placeholder="Describe a change across the page…"
                style={{
                  flex: 1, background: 'rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 13, outline: 'none', color: '#000',
                }}
              />
              <button
                onClick={handleGlobalSend}
                disabled={!globalInput.trim() || !!processing}
                style={{
                  background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: (!globalInput.trim() || !!processing) ? 0.35 : 1,
                }}
              >
                {processing?.type === 'global' ? '…' : '↑'}
              </button>
            </div>

            <ModePill />
          </div>
        )}

        {/* COMPONENT HIGHLIGHT */}
        {mode === 'edit' && activeEl && activeRect && (
          <div style={{
            position: 'fixed',
            top: activeRect.top - 1.5,
            left: activeRect.left - 1.5,
            width: activeRect.width + 3,
            height: activeRect.height + 3,
            border: `1.5px solid ${ACCENT}`,
            background: processing?.type === 'component'
              ? 'rgba(108,111,255,0.12)'
              : ACCENT_BG,
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 9998,
            transition: 'top 80ms ease, left 80ms ease, width 80ms ease, height 80ms ease',
            animation: processing?.type === 'component'
              ? 'genuyn-shimmer 1.4s ease-in-out infinite'
              : 'none',
          }} />
        )}

        {/* HOVER CHIP */}
        {mode === 'edit' && (locked || hovered) && (() => {
          const target = locked || hovered!
          const r = target.el.getBoundingClientRect()
          const chipW = 240
          const top = Math.max(8, r.top + 6)
          const left = Math.min(window.innerWidth - chipW - 8, Math.max(8, r.right - chipW - 6))

          return (
            <div style={{
              position: 'fixed', top, left, zIndex: 10000,
              display: 'flex', alignItems: 'center', gap: 6,
              background: GLASS, backdropFilter: 'blur(12px)',
              border: `1px solid ${ACCENT}44`,
              borderRadius: 10, padding: '5px 6px 5px 10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              width: chipW,
              animation: 'none',
            }}>
              <input
                value={chipInput}
                onChange={(e) => setChipInput(e.target.value)}
                onFocus={() => { if (hovered && !locked) setLocked(hovered) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleChipSend()
                  if (e.key === 'Escape') { setLocked(null); setChipInput('') }
                }}
                placeholder="Edit this component…"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', fontSize: 12, color: '#000',
                }}
              />
              <button
                onClick={handleChipSend}
                disabled={!chipInput.trim() || !!processing}
                style={{
                  background: ACCENT, color: '#fff', border: 'none',
                  borderRadius: 6, width: 24, height: 24,
                  cursor: 'pointer', fontSize: 13, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!chipInput.trim() || !!processing) ? 0.35 : 1,
                  animation: processing?.type === 'component' ? 'genuyn-pulse 1.4s ease infinite' : 'none',
                }}
              >
                ↑
              </button>
            </div>
          )
        })()}

        {/* PROCESSING shimmer — full element overlay */}
        {mode === 'edit' && processing?.type === 'component' && processing.rect && (
          <div style={{
            position: 'fixed',
            top: processing.rect.top,
            left: processing.rect.left,
            width: processing.rect.width,
            height: processing.rect.height,
            background: 'rgba(108,111,255,0.08)',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 9997,
            animation: 'genuyn-shimmer 1.4s ease-in-out infinite',
          }} />
        )}
      </div>
    </>
  )
}
