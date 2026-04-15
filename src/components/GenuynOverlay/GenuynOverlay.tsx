import { useEffect, useRef, useState } from 'react'
import ContextPanel from './contextPanel/ContextPanel'

const API = `${window.location.protocol}//${window.location.host}`
const ACCENT = '#6C6FFF'
const CYAN = '#00D4FF'
const GREEN = '#00FF94'
const RED = '#FF4D6A'
const BG = 'rgba(6,6,20,0.96)'
const BORDER = 'rgba(255,255,255,0.08)'
const GLOW = '0 0 24px rgba(108,111,255,0.2), 0 4px 20px rgba(0,0,0,0.6)'

type Mode = 'preview' | 'edit'
type ModelPref = 'auto' | 'gemini' | 'sonnet'

interface QueueItem {
  id: string
  command: string
  file?: string
  step: number
  status: 'active' | 'applying' | 'done' | 'failed'
  rect?: { top: number; left: number; width: number; height: number }
}

interface Notif { id: string; text: string; ok: boolean }

interface SelEl { el: Element; file: string; editFile: string; name: string }

interface HistoryEvent {
  id: string
  command: string
  status: 'pending' | 'done' | 'applied' | 'failed'
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

/** hoverMap = design-system components only; editMap = all files including pages */
function labelComponents(hoverMap: Record<string, string>, editMap: Record<string, string>) {
  document.querySelectorAll('*').forEach((el) => {
    if ((el as HTMLElement).closest?.('[data-genuyn-overlay]')) return
    const fiberKey = Object.keys(el).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    )
    if (!fiberKey) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fiber = (el as any)[fiberKey]
    let componentName: string | null = null
    let editFile: string | null = null
    while (fiber) {
      const name: string = fiber.type?.displayName || fiber.type?.name || ''
      if (name && hoverMap[name] && !componentName) {
        componentName = name // found the design-system component
      } else if (componentName && name && editMap[name] && !hoverMap[name]) {
        // found a parent that is NOT itself a design-system component → it's the usage site
        editFile = editMap[name]
        break
      }
      fiber = fiber.return
    }
    if (componentName) {
      el.setAttribute('data-genuyn', hoverMap[componentName])
      el.setAttribute('data-genuyn-edit', editFile ?? hoverMap[componentName])
      el.setAttribute('data-genuyn-name', componentName)
    } else {
      // Label bare text elements not already inside a design-system component
      const tagName = (el as HTMLElement).tagName?.toLowerCase()
      if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) &&
          el.textContent?.trim() &&
          !el.closest('[data-genuyn]')) {
        let f = (el as any)[fiberKey]
        while (f) {
          const name: string = f.type?.displayName || f.type?.name || ''
          if (name && editMap[name] && !hoverMap[name]) {
            el.setAttribute('data-genuyn', editMap[name])
            el.setAttribute('data-genuyn-edit', editMap[name])
            el.setAttribute('data-genuyn-name', 'TextLabel')
            break
          }
          f = f.return
        }
      }
    }
  })
}

const STEPS = [
  { label: 'Reading', color: CYAN },
  { label: 'Generating', color: ACCENT },
  { label: 'Applying', color: GREEN },
]

function fmtTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function GenuynOverlay({ sessionId }: { sessionId: string }) {
  const [mode, setMode] = useState<Mode>(
    () => (sessionStorage.getItem('genuyn-mode') as Mode) || 'preview'
  )
  const [modelPref, setModelPref] = useState<ModelPref>(
    () => (localStorage.getItem('genuyn-model') as ModelPref) || 'auto'
  )
  const [fileMap, setFileMap] = useState<Record<string, string>>({})
  const [editMap, setEditMap] = useState<Record<string, string>>({})
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [hovered, setHovered] = useState<SelEl | null>(null)
  const [selected, setSelected] = useState<SelEl | null>(null)
  const [hovRect, setHovRect] = useState<DOMRect | null>(null)
  const [selRect, setSelRect] = useState<DOMRect | null>(null)
  const [skeleton,setSkeleton] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [globalInput, setGlobalInput] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [editCount, setEditCount] = useState(0)
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const dismissRef = useRef<ReturnType<typeof setTimeout>>()
  const startRef = useRef(Date.now())
  const fileMapRef = useRef(fileMap)
  fileMapRef.current = fileMap
  const editMapRef = useRef(editMap)
  editMapRef.current = editMap
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const selRectRef = useRef(selRect)
  selRectRef.current = selRect

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch(`${API}/sessions/${sessionId}/files`)
      .then(r => r.json())
      .then((files: string[]) => setFileMap(buildFileMap(files)))
      .catch(() => {})
    fetch(`${API}/sessions/${sessionId}/all-files`)
      .then(r => r.json())
      .then((files: string[]) => setEditMap(buildFileMap(files)))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    fetch(`${API}/sessions/${sessionId}/events`)
      .then(r => r.json())
      .then((events: HistoryEvent[]) => setHistory(events.filter(e => e.status === 'done' || e.status === 'applied')))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (mode === 'edit' && Object.keys(fileMap).length > 0) labelComponents(fileMap, editMap)
  }, [mode, fileMap, editMap])

  useEffect(() => { sessionStorage.setItem('genuyn-mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('genuyn-model', modelPref) }, [modelPref])

  const addNotif = (text: string, ok: boolean) => {
    const id = `n${Date.now()}`
    setNotifs(n => [...n.slice(-2), { id, text, ok }])
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 4500)
  }

  useEffect(() => {
    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${window.location.host}/ws?session=${sessionId}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'voice-command') {
          setQueue(q => [...q, { id: `v${Date.now()}`, command: msg.command, step: 0, status: 'active' }])
          return
        }
        if (msg.type === 'progress') {
          setQueue(q => q.map(c =>
            (c.status === 'active' || c.status === 'applying') && c.step < msg.step
              ? { ...c, step: msg.step }
              : c
          ))
          return
        }
        if (msg.type === 'undo-state') {
          setCanUndo(msg.canUndo)
          setCanRedo(msg.canRedo)
          return
        }
        if (msg.type !== 'refresh') return
        let doneCmd: QueueItem | undefined
        setQueue(q => {
          const first = q.find(c => c.status === 'active' || c.status === 'applying')
          if (!first) return q
          doneCmd = first
          return q.map(c => c.id === first.id ? { ...c, step: 2, status: 'applying' } : c)
        })
        setSkeleton(null)
        setTimeout(() => {
          setQueue(q => q.map(c => c.status === 'applying' ? { ...c, step: 3, status: 'done' } : c))
          setEditCount(n => n + 1)
          if (doneCmd) {
            addNotif(doneCmd.command, true)
            setHistory(h => [...h, { id: doneCmd!.id, command: doneCmd!.command, status: 'done', created_at: new Date().toISOString() }])
          }
        }, 300)
        setTimeout(() => labelComponents(fileMapRef.current, editMapRef.current), 600)
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId])

  // Hover: only show highlight, no chip
  useEffect(() => {
    if (mode !== 'edit') return
    const onMove = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('[data-genuyn-overlay]')) { clearTimeout(dismissRef.current); return }
      let el: Element | null = t
      while (el) {
        if (el.hasAttribute('data-genuyn')) {
          clearTimeout(dismissRef.current)
          setHovered({ el, file: el.getAttribute('data-genuyn')!, editFile: el.getAttribute('data-genuyn-edit') || el.getAttribute('data-genuyn')!, name: el.getAttribute('data-genuyn-name') || '' })
          setHovRect(el.getBoundingClientRect())
          return
        }
        el = el.parentElement
      }
      clearTimeout(dismissRef.current)
      dismissRef.current = setTimeout(() => { setHovered(null); setHovRect(null) }, 300)
    }
    document.addEventListener('mousemove', onMove)
    return () => { document.removeEventListener('mousemove', onMove); clearTimeout(dismissRef.current) }
  }, [mode])

  // Click: select component → show chip
  useEffect(() => {
    if (mode !== 'edit') return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('[data-genuyn-overlay]')) return
      let el: Element | null = t
      while (el) {
        if (el.hasAttribute('data-genuyn')) {
          e.preventDefault()
          e.stopPropagation()
          // For list-based components (SideNav), narrow to the specific <li> that was clicked
          // so text extraction and color edits target the right item, not the whole container
          let targetEl = el
          if (el.getAttribute('data-genuyn-name') === 'SideNav') {
            let li: Element | null = t
            while (li && li !== el) {
              if (li.tagName.toLowerCase() === 'li') { targetEl = li; break }
              li = li.parentElement
            }
          }
          setSelected({
            el: targetEl,
            file: el.getAttribute('data-genuyn')!,
            editFile: el.getAttribute('data-genuyn-edit') || el.getAttribute('data-genuyn')!,
            name: el.getAttribute('data-genuyn-name') || '',
          })
          setSelRect(targetEl.getBoundingClientRect())
          return
        }
        el = el.parentElement
      }
      setSelected(null)
          }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [canUndo, canRedo])

  const cancelItem = (id: string) => {
    setQueue(q => q.filter(c => c.id !== id))
    setSkeleton(null)
  }

  const submitCommand = async (command: string, file?: string, rect?: DOMRect, componentName?: string, elementHtml?: string) => {
    const id = `c${Date.now()}`
    const snap = rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined
    setQueue(q => [...q, { id, command, file, step: 0, status: 'active', rect: snap }])
    if (snap) setSkeleton(snap)
    setSelected(null)
    
    const failItem = (msg: string) => {
      setQueue(q => q.map(c => c.id === id ? { ...c, status: 'failed' } : c))
      setSkeleton(null)
      addNotif(msg, false)
      setTimeout(() => setQueue(q => q.filter(c => c.id !== id)), 3000)
    }
    const timeoutId = setTimeout(() => failItem('Timed out'), 120000)

    try {
      const res = await fetch(`${API}/sessions/${sessionId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, filePath: file, model: modelPref, componentName, elementHtml }),
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

  /** After a direct edit, re-find the element in the fresh DOM and sync selRect */
  function resyncSelected() {
    setTimeout(() => {
      const cur = selectedRef.current
      if (!cur) return
      labelComponents(fileMapRef.current, editMapRef.current)
      const candidates = Array.from(document.querySelectorAll<Element>(`[data-genuyn-name="${cur.name}"]`))
      if (candidates.length === 0) return
      const last = selRectRef.current
      const best = last
        ? candidates.reduce((a, b) => {
            const ra = a.getBoundingClientRect()
            const rb = b.getBoundingClientRect()
            return (Math.hypot(ra.top - last.top, ra.left - last.left) <=
                    Math.hypot(rb.top - last.top, rb.left - last.left)) ? a : b
          })
        : candidates[0]
      const newRect = best.getBoundingClientRect()
      setSelRect(newRect)
      setSelected({
        el: best,
        file: best.getAttribute('data-genuyn') || cur.file,
        editFile: best.getAttribute('data-genuyn-edit') || cur.editFile,
        name: cur.name,
      })
    }, 600)
  }

  const handlePanelLLMSubmit = (command: string, file: string, rect: DOMRect, name: string, html: string) => {
    submitCommand(command, file, rect, name, html)
  }

  const handleGlobalSend = () => {
    if (!globalInput.trim()) return
    submitCommand(globalInput.trim())
    setGlobalInput('')
  }

  const handleUndo = async () => {
    const res = await fetch(`${API}/sessions/${sessionId}/undo`, { method: 'POST' })
    if (!res.ok) addNotif('Nothing to undo', false)
  }

  const handleRedo = async () => {
    const res = await fetch(`${API}/sessions/${sessionId}/redo`, { method: 'POST' })
    if (!res.ok) addNotif('Nothing to redo', false)
  }

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
        @keyframes g-chip {
          from { transform: scale(0.96) translateY(6px); opacity: 0 }
          to   { transform: scale(1) translateY(0);      opacity: 1 }
        }
        @keyframes g-ring {
          0%   { opacity: 0.5; transform: scale(1) }
          100% { opacity: 0;   transform: scale(1.03) }
        }
        @keyframes g-blink {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.2 }
        }
        [data-genuyn-overlay] button { font-family: system-ui, sans-serif; }
        [data-genuyn-overlay] input::placeholder { color: rgba(255,255,255,0.22); }
      `}</style>

      <div data-genuyn-overlay="true" style={{ fontFamily: 'system-ui, sans-serif', pointerEvents: 'none' }}>

        {/* ── QUEUE — top right, slim pills ── */}
        {queue.length > 0 && (
          <div style={{
            position: 'fixed', top: 12, right: 12, zIndex: 10001,
            display: 'flex', flexDirection: 'column', gap: 4,
            pointerEvents: 'all', width: 272,
          }}>
            {queue.map(item => (
              <div key={item.id} style={{
                background: item.status === 'failed' ? 'rgba(255,77,106,0.07)' : BG,
                border: `1px solid ${
                  item.status === 'done'     ? `${GREEN}44`  :
                  item.status === 'failed'   ? `${RED}44`    :
                  item.status === 'applying' ? `${GREEN}33`  : BORDER
                }`,
                borderRadius: 8, padding: '7px 8px 7px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'g-slidein 180ms cubic-bezier(0.16,1,0.3,1)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}>
                {/* Step dots */}
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
                        transition: 'background 300ms ease',
                      }} />
                    ))
                  )}
                </div>
                <span style={{
                  flex: 1, fontSize: 11,
                  color: item.status === 'failed' ? `${RED}bb` : 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.command}
                </span>
                {item.status === 'active' && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {STEPS[Math.min(item.step, 2)]?.label}
                  </span>
                )}
                {item.status !== 'done' && (
                  <button
                    onClick={() => cancelItem(item.id)}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = RED }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)' }}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.2)', fontSize: 13, lineHeight: 1,
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
          transition: 'right 240ms cubic-bezier(0.16,1,0.3,1)',
        }}>
          {notifs.map(n => (
            <div
              key={n.id}
              style={{
                background: BG, backdropFilter: 'blur(24px)',
                border: `1px solid ${n.ok ? `${GREEN}44` : `${RED}44`}`,
                borderRadius: 8, padding: '8px 10px 8px 14px',
                animation: 'g-notif 200ms cubic-bezier(0.16,1,0.3,1)',
                boxShadow: `0 4px 20px rgba(0,0,0,0.45)`,
                display: 'flex', alignItems: 'center', gap: 8,
                pointerEvents: 'all',
              }}
            >
              <span style={{ fontSize: 11, color: n.ok ? GREEN : RED, fontWeight: 700, flexShrink: 0 }}>
                {n.ok ? '✓' : '✕'}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', flex: 1 }}>{n.text}</span>
              <button
                onClick={() => setNotifs(prev => prev.filter(x => x.id !== n.id))}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.25)', fontSize: 12, lineHeight: 1,
                  padding: '2px 4px', flexShrink: 0, transition: 'color 120ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)' }}
              >✕</button>
            </div>
          ))}
        </div>

        {/* ── SKELETON shimmer ── */}
        {skeleton && (
          <div style={{
            position: 'fixed',
            top: skeleton.top, left: skeleton.left,
            width: skeleton.width, height: skeleton.height,
            borderRadius: 4, zIndex: 9997, pointerEvents: 'none',
            border: `1px solid ${CYAN}2a`,
            background: 'linear-gradient(90deg, rgba(0,212,255,0.03) 25%, rgba(108,111,255,0.07) 50%, rgba(0,212,255,0.03) 75%)',
            backgroundSize: '200% 100%',
            animation: 'g-shimmer 1.8s linear infinite',
          }} />
        )}

        {/* ── HOVER highlight — thin glow border only ── */}
        {mode === 'edit' && hovered && hovRect && !selected && (
          <div style={{
            position: 'fixed',
            top: hovRect.top - 1, left: hovRect.left - 1,
            width: hovRect.width + 2, height: hovRect.height + 2,
            border: `1px solid ${ACCENT}55`,
            background: 'rgba(108,111,255,0.02)',
            borderRadius: 3, pointerEvents: 'none', zIndex: 9998,
            transition: 'all 60ms ease',
            boxShadow: `0 0 0 3px ${ACCENT}09`,
          }} />
        )}

        {/* ── SELECTED highlight — stronger glow + pulse ring ── */}
        {mode === 'edit' && selected && selRect && (
          <>
            <div style={{
              position: 'fixed',
              top: selRect.top - 2, left: selRect.left - 2,
              width: selRect.width + 4, height: selRect.height + 4,
              border: `1.5px solid ${ACCENT}cc`,
              background: 'rgba(108,111,255,0.035)',
              borderRadius: 4, pointerEvents: 'none', zIndex: 9999,
              boxShadow: `0 0 0 4px ${ACCENT}0f, 0 0 24px ${ACCENT}1a`,
            }} />
            <div style={{
              position: 'fixed',
              top: selRect.top - 2, left: selRect.left - 2,
              width: selRect.width + 4, height: selRect.height + 4,
              border: `1px solid ${ACCENT}55`,
              borderRadius: 4, pointerEvents: 'none', zIndex: 9997,
              animation: 'g-ring 1.4s ease-out infinite',
            }} />
          </>
        )}

        {/* ── CONTEXT PANEL — frosted glass direct-edit panel ── */}
        {mode === 'edit' && selected && (
          <ContextPanel
            sessionId={sessionId}
            selected={selected}
            selRect={selRect}
            canUndo={canUndo}
            onClose={() => setSelected(null)}
            onUndo={handleUndo}
            onLLMSubmit={handlePanelLLMSubmit}
            onEditDone={() => { resyncSelected() }}
            onEditError={(msg) => addNotif(msg, false)}
          />
        )}

        {/* ── PREVIEW MODE: pill + undo/redo bottom-right ── */}
        {mode === 'preview' && queue.length === 0 && (
          <div style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 9999, pointerEvents: 'all',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {(canUndo || canRedo) && (
              <div style={{
                background: BG, backdropFilter: 'blur(16px)',
                border: `1px solid ${BORDER}`, borderRadius: 999,
                padding: '3px 6px', boxShadow: GLOW,
                display: 'flex', gap: 2,
              }}>
                {[
                  { label: '↩', enabled: canUndo, action: handleUndo },
                  { label: '↪', enabled: canRedo, action: handleRedo },
                ].map(({ label, enabled, action }) => (
                  <button key={label} onClick={action} disabled={!enabled} style={{
                    background: 'transparent', border: 'none',
                    width: 26, height: 26, borderRadius: 999,
                    cursor: enabled ? 'pointer' : 'default',
                    color: enabled ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'system-ui, sans-serif', transition: 'color 120ms',
                  }}>{label}</button>
                ))}
              </div>
            )}
            <div style={{
              background: BG, backdropFilter: 'blur(16px)',
              border: `1px solid ${BORDER}`, borderRadius: 999, padding: 3,
              boxShadow: GLOW,
            }}>
              <ModePill mode={mode} onToggle={setMode} />
            </div>
          </div>
        )}

        {/* ── SESSION LOG panel ── */}
        {mode === 'edit' && showHistory && (
          <div style={{
            position: 'fixed', bottom: 48, left: 0, right: 0,
            maxHeight: 260, overflowY: 'auto',
            zIndex: 9998, pointerEvents: 'all',
            background: 'rgba(6,6,20,0.98)', backdropFilter: 'blur(28px)',
            borderTop: `1px solid ${BORDER}`,
          }}>
            <div style={{ padding: '10px 20px 6px', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Session log — {history.length} move{history.length !== 1 ? 's' : ''}
              </span>
            </div>
            {history.length === 0 ? (
              <p style={{ margin: 0, padding: '20px', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                No moves yet
              </p>
            ) : (
              [...history].reverse().map((ev, i) => (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px',
                  borderBottom: `1px solid rgba(255,255,255,0.03)`,
                }}>
                  <span style={{
                    fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 700,
                    letterSpacing: '0.06em', flexShrink: 0, minWidth: 30,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    #{String(history.length - i).padStart(2, '0')}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{ev.command}</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
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
            background: BG, backdropFilter: 'blur(28px)',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
          }}>
            {/* Game stats: time + moves */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {fmtTime(elapsed)}
                </div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Time</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, lineHeight: 1.2 }}>{editCount}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Moves</div>
              </div>
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Undo / Redo */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {[
                { label: '↩', title: 'Undo (⌘Z)', enabled: canUndo, action: handleUndo },
                { label: '↪', title: 'Redo (⌘⇧Z)', enabled: canRedo, action: handleRedo },
              ].map(({ label, title, enabled, action }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={!enabled}
                  title={title}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${enabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                    borderRadius: 6, width: 28, height: 28,
                    cursor: enabled ? 'pointer' : 'default',
                    color: enabled ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.15)',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 120ms',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >{label}</button>
              ))}
            </div>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Global input */}
            <input
              value={globalInput}
              onChange={e => setGlobalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGlobalSend()}
              placeholder="Or describe a global change across the page…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${globalInput ? `${ACCENT}44` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6, padding: '6px 12px', fontSize: 12,
                outline: 'none', color: 'rgba(255,255,255,0.85)',
                transition: 'border-color 150ms',
              }}
            />
            <button
              onClick={handleGlobalSend}
              disabled={!globalInput.trim() || queue.some(c => c.status === 'active')}
              style={{
                background: globalInput.trim() ? ACCENT : 'rgba(108,111,255,0.08)',
                color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: globalInput.trim() ? 'pointer' : 'default', flexShrink: 0,
                transition: 'background 120ms',
                boxShadow: globalInput.trim() ? `0 0 14px ${ACCENT}55` : 'none',
              }}
            >
              {queue.some(c => c.status === 'active')
                ? <span style={{ animation: 'g-blink 1s ease infinite', display: 'inline-block' }}>…</span>
                : '↑'}
            </button>

            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

            {/* Log button */}
            <button
              onClick={() => setShowHistory(v => !v)}
              style={{
                background: showHistory ? `${ACCENT}18` : 'transparent',
                border: `1px solid ${showHistory ? `${ACCENT}55` : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                color: showHistory ? ACCENT : 'rgba(255,255,255,0.3)',
                fontSize: 11, fontWeight: 600, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 4, transition: 'all 150ms',
              }}
            >
              Log{history.length > 0 && (
                <span style={{ color: GREEN, marginLeft: 3, fontSize: 10 }}>{history.length}</span>
              )}
            </button>

            <ModelPicker model={modelPref} onChange={m => { setModelPref(m) }} />

            <ModePill mode={mode} onToggle={setMode} />
          </div>
        )}
      </div>
    </>
  )
}

const MODEL_OPTIONS: { value: ModelPref; label: string }[] = [
  { value: 'auto',   label: 'Auto — fastest available' },
  { value: 'gemini', label: 'Flash — Google Gemini 2.5' },
  { value: 'sonnet', label: 'Sonnet — Anthropic Claude' },
]

function ModelPicker({ model, onChange }: { model: ModelPref; onChange: (m: ModelPref) => void }) {
  return (
    <select
      value={model}
      onChange={e => onChange(e.target.value as ModelPref)}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6, padding: '4px 8px',
        fontSize: 10, fontWeight: 600, cursor: 'pointer',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'system-ui, sans-serif',
        outline: 'none', flexShrink: 0,
      }}
    >
      {MODEL_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function ModePill({ mode, onToggle }: { mode: Mode; onToggle: (m: Mode) => void }) {
  return (
    <div style={{ display: 'flex', borderRadius: 999, background: 'rgba(255,255,255,0.04)', padding: 2, gap: 2 }}>
      {(['preview', 'edit'] as const).map(m => (
        <button key={m} onClick={() => onToggle(m)} style={{
          background: mode === m ? ACCENT : 'transparent',
          border: 'none', borderRadius: 999, padding: '4px 12px',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          color: mode === m ? '#fff' : 'rgba(255,255,255,0.35)',
          boxShadow: mode === m ? `0 0 10px ${ACCENT}66` : 'none',
          transition: 'all 120ms', textTransform: 'capitalize',
          fontFamily: 'system-ui, sans-serif', letterSpacing: '0.02em',
        }}>{m}</button>
      ))}
    </div>
  )
}
