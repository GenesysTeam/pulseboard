import { useEffect, useRef, useState } from 'react'

interface Event {
  id: string
  command: string
  status: 'pending' | 'applied' | 'failed'
  created_at: string
}

const GENUYN_API = `https://${window.location.host}`

function statusColor(status: string) {
  if (status === 'failed') return '#f87171'
  if (status === 'pending') return '#facc15'
  return '#4ade80'
}

function statusLabel(status: string) {
  if (status === 'failed') return 'Failed'
  if (status === 'pending') return 'Applying…'
  return 'Applied'
}

export default function GenuynOverlay({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [latestStatus, setLatestStatus] = useState<string>('listening')
  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchEvents = async () => {
    const res = await fetch(`${GENUYN_API}/sessions/${sessionId}/events`)
    if (res.ok) {
      const data: Event[] = await res.json()
      setEvents(data.reverse())
      if (data.length > 0) setLatestStatus(data[data.length - 1].status)
    }
  }

  useEffect(() => {
    fetchEvents()
    const connect = () => {
      const ws = new WebSocket(`wss://${window.location.host}/ws?session=${sessionId}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'refresh') fetchEvents()
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, open])

  const handleSend = async () => {
    const cmd = input.trim()
    if (!cmd || sending) return
    setSending(true)
    setInput('')
    await fetch(`${GENUYN_API}/sessions/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd }),
    })
    setSending(false)
    fetchEvents()
  }

  const dotColor = latestStatus === 'failed' ? '#f87171'
    : latestStatus === 'pending' ? '#facc15'
    : '#4ade80'

  return (
    <>
      {/* Collapsed pill */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', color: '#fff',
            border: 'none', borderRadius: 24, padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: 600,
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`, flexShrink: 0,
          }} />
          Genuyn
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9999,
          width: 320, background: '#111', color: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 16px 14px', borderBottom: '1px solid #222',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: dotColor,
                boxShadow: `0 0 6px ${dotColor}`,
              }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Genuyn</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', color: '#666',
                cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >
              ✕
            </button>
          </div>

          {/* Command history */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.length === 0 && (
              <p style={{ color: '#555', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                No commands yet. Start talking or type below.
              </p>
            )}
            {events.map((ev) => (
              <div key={ev.id} style={{
                background: '#1a1a1a', borderRadius: 10, padding: '10px 12px',
                borderLeft: `3px solid ${statusColor(ev.status)}`,
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#e5e5e5', lineHeight: 1.4 }}>{ev.command}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: statusColor(ev.status) }}>
                  {statusLabel(ev.status)}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: '1px solid #222', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a command…"
              style={{
                flex: 1, background: '#1a1a1a', border: '1px solid #333',
                borderRadius: 8, padding: '8px 12px', color: '#fff',
                fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                background: '#fff', color: '#000', border: 'none',
                borderRadius: 8, padding: '8px 14px', fontWeight: 600,
                fontSize: 13, cursor: 'pointer', opacity: (sending || !input.trim()) ? 0.4 : 1,
              }}
            >
              {sending ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
