import { useEffect, useRef, useState } from 'react'

const API = `https://${window.location.host}`
const ACCENT = '#6C6FFF'
const CYAN = '#00D4FF'
const GREEN = '#00FF94'
const BG = 'rgba(3,3,18,0.93)'
const BORDER = 'rgba(108,111,255,0.22)'
const GLOW = '0 0 32px rgba(108,111,255,0.18), 0 4px 24px rgba(0,0,0,0.5)'

type Mode = 'preview' | 'edit'

interface QueueItem {
  id: string
  command: string
  file?: string
  step: number // 0=reading 1=writing 2=applying 3=done
  status: 'active' | 'applying' | 'done' | 'failed'
  rect?: { top: number; left: number; width: number; height: number }
}

interface Notif {
  id: string
  text: string
  ok: boolean
}

interface HovEl {
  el: Element
  file: string
}

function buildFileMap(files: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of files) {
    const name = f.split('/').pop()?.replace(/\.(tsx|jsx|ts|js)$/, '')
    if (name) map[name] = f
  }
  return map
}

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

const STEPS = [
  { label: 'Reading', color: CYAN },
  { label: 'Writing', color: ACCENT },
  { label: 'Applying', color: GREEN },
]

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function GenuynOverlay({ sessionId }: { sessionId: string }) {
  const [mode, setMode] = useState<Mode>(
    () => (sessionStorage.getItem('genuyn-mode') as Mode) || 'preview'
  )
  const [fileMap, setFileMap] = useState<Record<string, string>>({})
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [hovered, setHovered] = useState<HovEl | null>(null)
  const [locked, setLocked] = useState<HovEl | null>(null)
  const [hovRect, setHovRect] = useState<DOMRect | null>(null)
  const [skeleton, setSkeleton] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [chipInput, setChipInput] = useState('')
  const [globalInput, setGlobalInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [editCount, setEditCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout>>()
  const startRef = useRef(Date.now())
  const fileMapRef = useRef(fileMap)
  fileMapRef.current = fileMap

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch(`${API}/sessions/${sessionId}/files`)
      .then((r) => r.json())
      .then((files: string[]) => setFileMap(buildFileMap(files)))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (mode === 'edit' && Object.keys(fileMap).length > 0) labelComponents(fileMap)
  }, [mode, fileMap])

  useEffect(() => { sessionStorage.setItem('genuyn-mode', mode) }, [mode])

  const addNotif = (text: string, ok: boolean) => {
    const id = `n${Date.now()}`
    setNotifs((n) => [...n.slice(-2), { id, text, ok }])
    setTimeout(() => setNotifs((n) => n.filter((x) => x.id !== id)), 4500)
  }

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`wss://${window.location.host}/ws?session=${sessionId}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type !== 'refresh') return

        let doneCmd: QueueItem | undefined
        setQueue((q) => {
          const first = q.find((c) => c.status === 'active' || c.status === 'applying')
          if (!first) return q
          doneCmd = first
          return q.map((c) => (c.id === first.id ? { ...c, step: 2, status: 'applying' } : c))
        })
        setSkeleton(null)
        setTimeout(() => labelComponents(fileMapRef.current), 600)
        setTimeout(() => {
          setQueue((q) => q.map((c) => (c.status === 'applying' ? { ...c, step: 3, status: 'done' } : c)))
          setEditCount((n) => n + 1)
          if (doneCmd) addNotif(doneCmd.command, true)
        }, 600)
        setTimeout(() => setQueue((q) => q.filter((c) => c.status !== 'done')), 3800)
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId])

  useEffect(() => {
    if (mode !== 'edit' || locked) return
    const onMove = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('[data-genuyn-overlay]')) { clearTimeout(dismissRef.current); return }
      let el: Element | null = t
      while (el) {
        if (el.hasAttribute('data-genuyn')) {
          clearTimeout(dismissRef.current)
          setHovered({ el, file: el.getAttribute('data-genuyn')! })
          setHovRect(el.getBoundingClientRect())
          return
        }
        el = el.parentElement
      }
      clearTimeout(dismissRef.current)
      dismissRef.current = setTimeout(() => { setHovered(null); setHovRect(null) }, 600)
    }
    document.addEventListener('mousemove', onMove)
    return () => { document.removeEventListener('mousemove', onMove); clearTimeout(dismissRef.current) }
  }, [mode, locked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLocked(null); setChipInput('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const submitCommand = async (command: string, file?: string, rect?: DOMRect) => {
    const id = `c${Date.now()}`
    const snap = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined
    setQueue((q) => [...q, { id, command, file, step: 0, status: 'active', rect: snap }])
    if (snap) setSkeleton(snap)
    setLocked(null); setHovered(null); setHovRect(null)
    setTimeout(() => setQueue((q) => q.map((c) => c.id === id && c.step === 0 ? { ...c, step: 1 } : c)), 1400)
    await fetch(`${API}/sessions/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, filePath: file }),
    })
  }

  const handleChipSend = () => {
    const target = locked || hovered
    if (!chipInput.trim() || !target) return
    submitCommand(chipInput.trim(), target.file, target.el.getBoundingClientRect())
    setChipInput('')
  }

  const handleGlobalSend = () => {
    if (!globalInput.trim()) return
    submitCommand(globalInput.trim())
    setGlobalInput('')
  }

  const activeEl = locked || hovered

  return (
    <>
      <style>{`
        @keyframes g-shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes g-pulse {
          0%,100% { opacity:1 } 50% { opacity:0.4 }
        }
        @keyframes g-slidein {
          from { transform:translateY(-8px); opacity:0 }
          to { transform:translateY(0); opacity:1 }
        }
        @keyframes g-notif {
          from { transform:translateX(20px); opacity:0 }
          to { transform:translateX(0); opacity:1 }
        }
        @keyframes g-dot {
          0%,100% { box-shadow:0 0 4px currentColor }
          50% { box-shadow:0 0 12px currentColor }
        }
      `}</style>

      <div data-genuyn-overlay="true" style={{ fontFamily: 'system-ui,sans-serif', pointerEvents: 'none' }}>

        {/* ── COMMAND QUEUE STRIP (top center) ── */}
        {queue.length > 0 && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10001, display: 'flex', gap: 8, pointerEvents: 'none',
          }}>
            {queue.map((item) => (
              <div key={item.id} style={{
                background: BG, border: `1px solid ${item.status === 'done' ? `${GREEN}55` : item.status === 'failed' ? '#FF4D6A55' : BORDER}`,
                borderRadius: 12, padding: '8px 14px', minWidth: 180, maxWidth: 240,
                boxShadow: item.status === 'active' || item.status === 'applying'
                  ? `0 0 24px rgba(108,111,255,0.2), 0 0 0 1px ${BORDER}`
                  : '0 4px 16px rgba(0,0,0,0.4)',
                animation: 'g-slidein 200ms ease-out',
              }}>
                {/* Command text */}
                <p style={{
                  margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: 500,
                }}>
                  {item.command}
                </p>
                {/* Step dots + label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.status === 'done' ? (
                    <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>✓ Applied</span>
                  ) : (
                    <>
                      {STEPS.map((s, i) => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: item.step > i ? s.color : item.step === i ? s.color : 'rgba(255,255,255,0.12)',
                          color: s.color,
                          boxShadow: item.step === i ? `0 0 8px ${s.color}` : 'none',
                          animation: item.step === i ? 'g-dot 1.2s ease infinite' : 'none',
                          transition: 'all 300ms ease',
                          flexShrink: 0,
                        }} />
                      ))}
                      <span style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.4)',
                        marginLeft: 2, letterSpacing: '0.03em',
                      }}>
                        {STEPS[Math.min(item.step, 2)]?.label}…
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS (top right) ── */}
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10002, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
          {notifs.map((n) => (
            <div key={n.id} style={{
              background: BG, border: `1px solid ${n.ok ? `${GREEN}44` : '#FF4D6A44'}`,
              borderRadius: 10, padding: '10px 14px',
              boxShadow: `0 0 20px rgba(0,0,0,0.5), 0 0 0 1px ${n.ok ? `${GREEN}22` : '#FF4D6A22'}`,
              animation: 'g-notif 200ms ease-out',
              maxWidth: 280,
            }}>
              <span style={{ fontSize: 12, color: n.ok ? GREEN : '#FF4D6A', fontWeight: 600 }}>
                {n.ok ? '✓' : '✕'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                {n.text}
              </span>
            </div>
          ))}
        </div>

        {/* ── SKELETON on component being edited ── */}
        {skeleton && (
          <div style={{
            position: 'fixed',
            top: skeleton.top, left: skeleton.left,
            width: skeleton.width, height: skeleton.height,
            borderRadius: 6, zIndex: 9997, pointerEvents: 'none',
            border: `1px solid ${CYAN}44`,
            background: 'linear-gradient(90deg, rgba(0,212,255,0.04) 25%, rgba(108,111,255,0.1) 50%, rgba(0,212,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'g-shimmer 1.6s linear infinite',
            boxShadow: `0 0 24px rgba(0,212,255,0.08)`,
          }} />
        )}

        {/* ── COMPONENT HIGHLIGHT ── */}
        {mode === 'edit' && activeEl && hovRect && (
          <div style={{
            position: 'fixed',
            top: hovRect.top - 1.5, left: hovRect.left - 1.5,
            width: hovRect.width + 3, height: hovRect.height + 3,
            border: `1.5px solid ${ACCENT}`,
            background: 'rgba(108,111,255,0.04)',
            borderRadius: 4, pointerEvents: 'none', zIndex: 9998,
            boxShadow: `0 0 12px rgba(108,111,255,0.12)`,
            transition: 'all 80ms ease',
          }} />
        )}

        {/* ── HOVER CHIP ── */}
        {mode === 'edit' && (locked || hovered) && hovRect && (
          <div style={{
            position: 'fixed',
            top: Math.max(8, hovRect.top + 6),
            left: Math.min(window.innerWidth - 256, Math.max(8, hovRect.right - 246)),
            zIndex: 10000,
            display: 'flex', alignItems: 'center', gap: 6,
            background: BG, backdropFilter: 'blur(16px)',
            border: `1px solid ${ACCENT}55`,
            borderRadius: 10, padding: '6px 6px 6px 12px',
            boxShadow: `0 0 20px rgba(108,111,255,0.15), 0 4px 16px rgba(0,0,0,0.4)`,
            width: 240, pointerEvents: 'all',
          }}>
            <input
              value={chipInput}
              onChange={(e) => setChipInput(e.target.value)}
              onFocus={() => { if (hovered && !locked) setLocked(hovered) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleChipSend(); if (e.key === 'Escape') { setLocked(null); setChipInput('') } }}
              placeholder="Edit this component…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 12, color: 'rgba(255,255,255,0.85)',
                '::placeholder': { color: 'rgba(255,255,255,0.3)' },
              }}
            />
            <button
              onClick={handleChipSend}
              disabled={!chipInput.trim()}
              style={{
                background: chipInput.trim() ? ACCENT : 'rgba(108,111,255,0.2)',
                color: '#fff', border: 'none', borderRadius: 6,
                width: 26, height: 26, cursor: chipInput.trim() ? 'pointer' : 'default',
                fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 150ms ease',
                boxShadow: chipInput.trim() ? `0 0 12px ${ACCENT}88` : 'none',
              }}
            >↑</button>
          </div>
        )}

        {/* ── PREVIEW MODE: toggle pill ── */}
        {mode === 'preview' && queue.length === 0 && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, pointerEvents: 'all',
            background: BG, backdropFilter: 'blur(16px)',
            border: `1px solid ${BORDER}`,
            borderRadius: 999, padding: 3,
            boxShadow: GLOW,
          }}>
            <ModePill mode={mode} onToggle={setMode} />
          </div>
        )}

        {/* ── EDIT MODE: bottom HUD ── */}
        {mode === 'edit' && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
            height: 52, pointerEvents: 'all',
            background: BG, backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 14,
            boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
          }}>
            {/* Left: stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600, letterSpacing: '0.02em' }}>
                {fmtTime(elapsed)}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>
                {editCount} edit{editCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

            {/* Center: input */}
            <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={globalInput}
                onChange={(e) => setGlobalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSend()}
                placeholder="Describe a change across the page…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${globalInput ? `${ACCENT}55` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8, padding: '7px 14px', fontSize: 13,
                  outline: 'none', color: 'rgba(255,255,255,0.9)',
                  transition: 'border-color 150ms ease',
                  boxShadow: globalInput ? `0 0 0 3px ${ACCENT}18` : 'none',
                }}
              />
              <button
                onClick={handleGlobalSend}
                disabled={!globalInput.trim() || queue.some(c => c.status === 'active')}
                style={{
                  background: globalInput.trim() ? ACCENT : 'rgba(108,111,255,0.15)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '7px 16px', fontSize: 13, fontWeight: 600,
                  cursor: globalInput.trim() ? 'pointer' : 'default',
                  flexShrink: 0, transition: 'all 150ms ease',
                  boxShadow: globalInput.trim() ? `0 0 16px ${ACCENT}66` : 'none',
                }}
              >
                {queue.some(c => c.status === 'active') ? <span style={{ animation: 'g-pulse 1s ease infinite', display: 'inline-block' }}>…</span> : '↑'}
              </button>
            </div>

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

            {/* Right: mode toggle */}
            <ModePill mode={mode} onToggle={setMode} />
          </div>
        )}
      </div>
    </>
  )
}

function ModePill({ mode, onToggle }: { mode: Mode; onToggle: (m: Mode) => void }) {
  return (
    <div style={{ display: 'flex', borderRadius: 999, background: 'rgba(255,255,255,0.05)', padding: 3, gap: 2, pointerEvents: 'all' }}>
      {(['preview', 'edit'] as const).map((m) => (
        <button key={m} onClick={() => onToggle(m)} style={{
          background: mode === m ? ACCENT : 'transparent',
          border: 'none', borderRadius: 999,
          padding: '4px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
          color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
          boxShadow: mode === m ? `0 0 12px ${ACCENT}88` : 'none',
          transition: 'all 150ms ease',
          textTransform: 'capitalize',
          fontFamily: 'system-ui,sans-serif',
          letterSpacing: '0.02em',
        }}>{m}</button>
      ))}
    </div>
  )
}
