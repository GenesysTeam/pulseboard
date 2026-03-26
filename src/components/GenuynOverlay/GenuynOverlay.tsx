import { useEffect, useRef, useState } from 'react'

const API = `https://${window.location.host}`
const ACCENT = '#6C6FFF'
const CYAN = '#00D4FF'
const GREEN = '#00FF94'
const RED = '#FF4D6A'
const BG = 'rgba(8,8,26,0.94)'
const BORDER = 'rgba(255,255,255,0.08)'
const GLOW = '0 0 24px rgba(108,111,255,0.16), 0 4px 20px rgba(0,0,0,0.5)'

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
  name: string
}

interface HistoryEvent {
  id: string
  command: string
  status: 'pending' | 'done' | 'failed'
  created_at: string
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
        el.setAttribute('data-genuyn-name', name)
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [skeleton, setSkeleton] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [chipInput, setChipInput] = useState('')
  const [globalInput, setGlobalInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [editCount, setEditCount] = useState(0)
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [showHistory, setShowHistory] = useState(false)
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
    fetch(`${API}/sessions/${sessionId}/events`)
      .then((r) => r.json())
      .then((events: HistoryEvent[]) => setHistory(events.filter((e) => e.status === 'done')))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (mode === 'edit' && Object.keys(fileMap).length > 0) labelComponents(fileMap)
  }, [mode, fileMap])

  useEffect(() => { sessionStorage.setItem('genuyn-mode', mode) }, [mode])

  // Always track mouse position in edit mode (separate from hover detection)
  useEffect(() => {
    if (mode !== 'edit') return
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [mode])

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
          if (doneCmd) {
            addNotif(doneCmd.command, true)
            setHistory((h) => [...h, { id: doneCmd!.id, command: doneCmd!.command, status: 'done', created_at: new Date().toISOString() }])
          }
        }, 600)
        setTimeout(() => setQueue((q) => q.filter((c) => c.status !== 'done')), 3800)
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId])

  // Hover detection (only when not locked)
  useEffect(() => {
    if (mode !== 'edit' || locked) return
    const onMove = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('[data-genuyn-overlay]')) { clearTimeout(dismissRef.current); return }
      let el: Element | null = t
      while (el) {
        if (el.hasAttribute('data-genuyn')) {
          clearTimeout(dismissRef.current)
          setHovered({
            el,
            file: el.getAttribute('data-genuyn')!,
            name: el.getAttribute('data-genuyn-name') || el.getAttribute('data-genuyn')!.split('/').pop()!.replace(/\.(tsx|jsx)$/, ''),
          })
          setHovRect(el.getBoundingClientRect())
          return
        }
        el = el.parentElement
      }
      clearTimeout(dismissRef.current)
      dismissRef.current = setTimeout(() => { setHovered(null); setHovRect(null) }, 500)
    }
    document.addEventListener('mousemove', onMove)
    return () => { document.removeEventListener('mousemove', onMove); clearTimeout(dismissRef.current) }
  }, [mode, locked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLocked(null); setChipInput('') } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const cancelItem = (id: string) => {
    setQueue((q) => q.filter((c) => c.id !== id))
    setSkeleton(null)
  }

  const submitCommand = async (command: string, file?: string, rect?: DOMRect) => {
    const id = `c${Date.now()}`
    const snap = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined
    setQueue((q) => [...q, { id, command, file, step: 0, status: 'active', rect: snap }])
    if (snap) setSkeleton(snap)
    setLocked(null); setHovered(null); setHovRect(null)

    const stepTimer = setTimeout(
      () => setQueue((q) => q.map((c) => c.id === id && c.step === 0 ? { ...c, step: 1 } : c)),
      1400
    )

    const failItem = (msg: string) => {
      clearTimeout(stepTimer)
      setQueue((q) => q.map((c) => c.id === id ? { ...c, status: 'failed' } : c))
      setSkeleton(null)
      addNotif(msg, false)
      setTimeout(() => setQueue((q) => q.filter((c) => c.id !== id)), 3000)
    }

    const timeoutId = setTimeout(() => failItem('Timed out'), 30000)

    try {
      const res = await fetch(`${API}/sessions/${sessionId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, filePath: file }),
      })
      clearTimeout(timeoutId)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        failItem((body as { error?: string }).error || 'Command failed')
      }
    } catch {
      clearTimeout(timeoutId)
      failItem('Network error')
    }
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

  // Chip floats near cursor, stays inside viewport
  const chipW = 240
  const chipX = Math.min(window.innerWidth - chipW - 12, Math.max(12, mousePos.x + 14))
  const chipY = Math.min(window.innerHeight - 80, Math.max(12, mousePos.y - 52))

  return (
    <>
      <style>{`
        @keyframes g-shimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes g-slidein {
          from { transform: translateY(-6px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes g-notif {
          from { transform: translateX(10px); opacity: 0 }
          to   { transform: translateX(0);    opacity: 1 }
        }
        @keyframes g-blink {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.25 }
        }
        [data-genuyn-overlay] button { font-family: system-ui, sans-serif; }
        [data-genuyn-overlay] input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      <div data-genuyn-overlay="true" style={{ fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' }}>

        {/* ── COMMAND QUEUE — top right, slim pills ── */}
        {queue.length > 0 && (
          <div style={{
            position: 'fixed', top: 12, right: 12,
            zIndex: 10001, display: 'flex', flexDirection: 'column', gap: 4,
            pointerEvents: 'all', width: 272,
          }}>
            {queue.map((item) => (
              <div key={item.id} style={{
                background: item.status === 'failed' ? 'rgba(255,77,106,0.1)' : BG,
                border: `1px solid ${
                  item.status === 'done'    ? `${GREEN}44` :
                  item.status === 'failed'  ? `${RED}44`   :
                  item.status === 'applying' ? `${GREEN}33` :
                  BORDER
                }`,
                borderRadius: 8,
                padding: '7px 8px 7px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'g-slidein 160ms ease-out',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
              }}>
                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                  {item.status === 'done' ? (
                    <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓</span>
                  ) : item.status === 'failed' ? (
                    <span style={{ fontSize: 11, color: RED }}>✕</span>
                  ) : (
                    STEPS.map((s, i) => (
                      <div key={i} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: item.step > i ? s.color : item.step === i ? s.color : 'rgba(255,255,255,0.1)',
                        animation: item.step === i ? 'g-blink 0.9s ease infinite' : 'none',
                        transition: 'background 300ms',
                      }} />
                    ))
                  )}
                </div>

                {/* Command text */}
                <span style={{
                  flex: 1, fontSize: 11,
                  color: item.status === 'failed' ? `${RED}bb` : 'rgba(255,255,255,0.72)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.command}
                </span>

                {/* Step label */}
                {item.status === 'active' && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', flexShrink: 0, letterSpacing: '0.05em' }}>
                    {STEPS[Math.min(item.step, 2)]?.label}
                  </span>
                )}

                {/* Cancel */}
                {item.status !== 'done' && (
                  <button
                    onClick={() => cancelItem(item.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = RED; e.currentTarget.style.opacity = '1' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)'; e.currentTarget.style.opacity = '1' }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.22)', fontSize: 13, lineHeight: 1,
                      padding: '2px 4px', flexShrink: 0, transition: 'color 120ms',
                    }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        <div style={{
          position: 'fixed', top: 12,
          right: queue.length > 0 ? 296 : 12,
          zIndex: 10002, display: 'flex', flexDirection: 'column', gap: 5,
          pointerEvents: 'none', maxWidth: 260,
          transition: 'right 200ms ease',
        }}>
          {notifs.map((n) => (
            <div key={n.id} style={{
              background: BG, backdropFilter: 'blur(20px)',
              border: `1px solid ${n.ok ? `${GREEN}44` : `${RED}44`}`,
              borderRadius: 7, padding: '7px 12px',
              animation: 'g-notif 160ms ease-out',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 11, color: n.ok ? GREEN : RED, fontWeight: 700, flexShrink: 0 }}>
                {n.ok ? '✓' : '✕'}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>{n.text}</span>
            </div>
          ))}
        </div>

        {/* ── SKELETON shimmer over component being edited ── */}
        {skeleton && (
          <div style={{
            position: 'fixed',
            top: skeleton.top, left: skeleton.left,
            width: skeleton.width, height: skeleton.height,
            borderRadius: 4, zIndex: 9997, pointerEvents: 'none',
            border: `1px solid ${CYAN}33`,
            background: 'linear-gradient(90deg, rgba(0,212,255,0.04) 25%, rgba(108,111,255,0.09) 50%, rgba(0,212,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'g-shimmer 1.6s linear infinite',
          }} />
        )}

        {/* ── COMPONENT HIGHLIGHT ── */}
        {mode === 'edit' && activeEl && hovRect && (
          <div style={{
            position: 'fixed',
            top: hovRect.top - 1, left: hovRect.left - 1,
            width: hovRect.width + 2, height: hovRect.height + 2,
            border: `1px solid ${ACCENT}77`,
            background: 'rgba(108,111,255,0.03)',
            borderRadius: 3, pointerEvents: 'none', zIndex: 9998,
            transition: 'all 60ms ease',
            boxShadow: `0 0 0 3px ${ACCENT}11`,
          }} />
        )}

        {/* ── HOVER CHIP — floats near cursor ── */}
        {mode === 'edit' && (locked || hovered) && (
          <div style={{
            position: 'fixed',
            top: chipY, left: chipX,
            width: chipW,
            zIndex: 10000, pointerEvents: 'all',
            background: BG, backdropFilter: 'blur(24px)',
            border: `1px solid ${locked ? `${ACCENT}66` : BORDER}`,
            borderRadius: 9,
            boxShadow: locked ? `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${ACCENT}22` : '0 4px 16px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Component label strip */}
            <div style={{
              padding: '5px 10px',
              borderBottom: `1px solid rgba(255,255,255,0.05)`,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px ${ACCENT}`, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {activeEl?.name}
              </span>
            </div>
            {/* Input row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 4px 5px 10px' }}>
              <input
                value={chipInput}
                onChange={(e) => setChipInput(e.target.value)}
                onFocus={() => { if (hovered && !locked) setLocked(hovered) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleChipSend()
                  if (e.key === 'Escape') { setLocked(null); setChipInput('') }
                }}
                placeholder="Describe a change…"
                autoFocus={!!locked}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 12, color: 'rgba(255,255,255,0.85)',
                }}
              />
              <button
                onClick={handleChipSend}
                disabled={!chipInput.trim()}
                style={{
                  background: chipInput.trim() ? ACCENT : 'rgba(108,111,255,0.12)',
                  color: '#fff', border: 'none', borderRadius: 5,
                  width: 26, height: 26, cursor: chipInput.trim() ? 'pointer' : 'default',
                  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 120ms',
                  boxShadow: chipInput.trim() ? `0 0 10px ${ACCENT}77` : 'none',
                }}
              >↑</button>
            </div>
          </div>
        )}

        {/* ── PREVIEW MODE: mode pill bottom-right ── */}
        {mode === 'preview' && queue.length === 0 && (
          <div style={{
            position: 'fixed', bottom: 16, right: 16,
            zIndex: 9999, pointerEvents: 'all',
            background: BG, backdropFilter: 'blur(16px)',
            border: `1px solid ${BORDER}`,
            borderRadius: 999, padding: 3,
            boxShadow: GLOW,
          }}>
            <ModePill mode={mode} onToggle={setMode} />
          </div>
        )}

        {/* ── HISTORY PANEL ── */}
        {mode === 'edit' && showHistory && (
          <div style={{
            position: 'fixed', bottom: 48, left: 0, right: 0,
            maxHeight: 240, overflowY: 'auto',
            zIndex: 9998, pointerEvents: 'all',
            background: 'rgba(8,8,26,0.97)', backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${BORDER}`,
          }}>
            {history.length === 0 ? (
              <p style={{ margin: 0, padding: '20px', fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                No edits yet this session
              </p>
            ) : (
              [...history].reverse().map((ev, i) => (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 20px',
                  borderBottom: i < history.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>{ev.command}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── EDIT MODE: bottom HUD ── */}
        {mode === 'edit' && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
            height: 48, pointerEvents: 'all',
            background: BG, backdropFilter: 'blur(24px)',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
          }}>
            {/* Timer + edit count */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {fmtTime(elapsed)}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                {editCount} edit{editCount !== 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Global input */}
            <input
              value={globalInput}
              onChange={(e) => setGlobalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGlobalSend()}
              placeholder="Describe a change across the page…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${globalInput ? `${ACCENT}44` : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 6, padding: '6px 12px', fontSize: 12,
                outline: 'none', color: 'rgba(255,255,255,0.85)',
                transition: 'border-color 150ms',
              }}
            />
            <button
              onClick={handleGlobalSend}
              disabled={!globalInput.trim() || queue.some((c) => c.status === 'active')}
              style={{
                background: globalInput.trim() ? ACCENT : 'rgba(108,111,255,0.1)',
                color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: globalInput.trim() ? 'pointer' : 'default',
                flexShrink: 0, transition: 'background 120ms',
                boxShadow: globalInput.trim() ? `0 0 14px ${ACCENT}55` : 'none',
              }}
            >
              {queue.some((c) => c.status === 'active')
                ? <span style={{ animation: 'g-blink 1s ease infinite', display: 'inline-block' }}>…</span>
                : '↑'}
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* History toggle */}
            <button
              onClick={() => setShowHistory((v) => !v)}
              style={{
                background: showHistory ? `${ACCENT}1a` : 'transparent',
                border: `1px solid ${showHistory ? `${ACCENT}55` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '4px 10px',
                cursor: 'pointer',
                color: showHistory ? ACCENT : 'rgba(255,255,255,0.32)',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'all 150ms',
              }}
            >
              ≡{history.length > 0 && (
                <span style={{ color: GREEN, marginLeft: 2, fontSize: 10 }}>{history.length}</span>
              )}
            </button>

            {/* Mode toggle */}
            <ModePill mode={mode} onToggle={setMode} />
          </div>
        )}
      </div>
    </>
  )
}

function ModePill({ mode, onToggle }: { mode: Mode; onToggle: (m: Mode) => void }) {
  return (
    <div style={{ display: 'flex', borderRadius: 999, background: 'rgba(255,255,255,0.04)', padding: 2, gap: 2 }}>
      {(['preview', 'edit'] as const).map((m) => (
        <button key={m} onClick={() => onToggle(m)} style={{
          background: mode === m ? ACCENT : 'transparent',
          border: 'none', borderRadius: 999,
          padding: '4px 12px', fontSize: 11, fontWeight: 600,
          cursor: 'pointer',
          color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
          boxShadow: mode === m ? `0 0 10px ${ACCENT}66` : 'none',
          transition: 'all 120ms',
          textTransform: 'capitalize',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.02em',
        }}>{m}</button>
      ))}
    </div>
  )
}
