import { useEffect, useRef, useState } from 'react'

interface Event {
  id: string
  command: string
  status: 'pending' | 'applied' | 'failed'
}

const GENUYN_LIVE = `https://${window.location.host}`

export default function GenuynOverlay({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<Event[]>([])
  const [status, setStatus] = useState<'listening' | 'processing'>('listening')
  const wsRef = useRef<WebSocket | null>(null)

  const fetchEvents = async () => {
    const res = await fetch(`${GENUYN_LIVE}/sessions/${sessionId}/events`)
    if (res.ok) {
      const data = await res.json()
      setEvents(data.slice(-4).reverse())
    }
  }

  useEffect(() => {
    fetchEvents()

    const connect = () => {
      const ws = new WebSocket(`wss://${window.location.host}/ws?session=${sessionId}`)
      wsRef.current = ws
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'refresh') {
          setStatus('listening')
          fetchEvents()
        }
      }
      ws.onclose = () => setTimeout(connect, 2000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [sessionId])

  const recent = events[0]

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Recent commands */}
      {events.slice(1).map((ev) => (
        <div key={ev.id} style={{
          background: 'rgba(0,0,0,0.55)',
          color: '#ccc',
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 20,
          maxWidth: 280,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {ev.command}
        </div>
      ))}

      {/* Main pill */}
      <div style={{
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        borderRadius: 24,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 300,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}>
        {/* Status dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: recent?.status === 'failed' ? '#f87171'
            : recent?.status === 'pending' ? '#facc15'
            : '#4ade80',
          flexShrink: 0,
          boxShadow: `0 0 6px ${recent?.status === 'failed' ? '#f87171' : recent?.status === 'pending' ? '#facc15' : '#4ade80'}`,
        }} />
        <span style={{ fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Genuyn</span>
        {recent && (
          <span style={{
            fontSize: 12,
            color: '#aaa',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {recent.status === 'pending' ? '…' : recent.command}
          </span>
        )}
      </div>
    </div>
  )
}
