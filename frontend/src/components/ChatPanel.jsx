import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const QUICK_ACTIONS = [
  'What needs my attention today?',
  'Review my pipeline',
  'What patterns do you see?',
  'Who should I follow up with?',
]

export default function ChatPanel({ API, onClose }) {
  const { getToken } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "I'm Radar Associate — I know your pipeline, past decisions, and firm thesis. Ask me what needs your attention, who to follow up with, or for a quick pipeline review." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [memoryCount, setMemoryCount] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    let cancelled = false
    const fn = async () => {
      const token = await getToken().catch(() => null)
      if (!token) return
      try {
        const res = await fetch(`${API}/associate/memories`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (Array.isArray(data) && !cancelled) setMemoryCount(data.length)
      } catch (_) {}
    }
    fn()
    return () => { cancelled = true }
  }, [API, getToken])

  const send = async (optionalPreFill) => {
    const text = (optionalPreFill != null ? optionalPreFill : input).trim()
    if (!text || loading) return
    if (optionalPreFill == null) setInput('')

    const userMsg = { role: 'user', content: text }
    const historyForApi = messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' }))
    setMessages(m => [...m, userMsg, { role: 'assistant', content: '' }])
    setLoading(true)

    const token = await getToken().catch(() => null)
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    try {
      const res = await fetch(`${API}/associate/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: [...historyForApi, { role: 'user', content: text }] }),
      })
      if (!res.ok || !res.body) {
        setMessages(m => {
          const next = [...m]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: 'Sorry, something went wrong.' }
          return next
        })
        setLoading(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const chunk of lines) {
          const line = chunk.trim().replace(/^data:\s*/, '')
          if (!line) continue
          try {
            const payload = JSON.parse(line)
            if (payload.type === 'text' && payload.content != null) {
              setMessages(m => {
                const next = [...m]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: (last.content || '') + payload.content }
                return next
              })
            } else if (payload.type === 'done') {
              break
            } else if (payload.type === 'error') {
              setMessages(m => {
                const next = [...m]
                const last = next[next.length - 1]
                if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: (last.content || '') + `\n\nError: ${payload.content || 'Unknown error'}` }
                return next
              })
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      setMessages(m => {
        const next = [...m]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: 'Failed to connect. Please try again.' }
        return next
      })
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, width: 420,
      background: '#1a1a2e', borderLeft: '1px solid #2a2a4a',
      display: 'flex', flexDirection: 'column', zIndex: 900,
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        padding: '20px 24px', borderBottom: '1px solid #2a2a4a',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>✕</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0ff' }}>Radar Associate</div>
          <div style={{ fontSize: 11, color: '#6c63ff', marginTop: 2 }}>
            {memoryCount != null ? `${memoryCount} memory${memoryCount !== 1 ? 'ies' : ''}` : 'Loading…'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '88%', padding: '12px 14px', borderRadius: 10,
              background: m.role === 'user' ? 'rgba(108, 99, 255, 0.12)' : '#0f0f1a',
              border: `1px solid ${m.role === 'user' ? 'rgba(108, 99, 255, 0.25)' : '#2a2a4a'}`,
              color: '#c0c0e0', fontSize: 13, lineHeight: 1.6,
            }}>
              <Markdown remarkPlugins={[remarkGfm]} components={{
                h1: ({ children }) => <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff', marginBottom: 8, marginTop: 4 }}>{children}</div>,
                h2: ({ children }) => <div style={{ fontSize: 13, fontWeight: 700, color: '#6c63ff', marginBottom: 6, marginTop: 10, borderBottom: '1px solid #2a2a4a', paddingBottom: 3 }}>{children}</div>,
                h3: ({ children }) => <div style={{ fontSize: 12, fontWeight: 700, color: '#a0a0cc', marginBottom: 4, marginTop: 8 }}>{children}</div>,
                p: ({ children }) => <p style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: '#6c63ff', fontWeight: 600 }}>{children}</strong>,
                ul: ({ children }) => <ul style={{ margin: '4px 0 6px', paddingLeft: 16 }}>{children}</ul>,
                li: ({ children }) => <li style={{ margin: '2px 0', lineHeight: 1.5 }}>{children}</li>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '8px 0' }} />,
                table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontSize: 12 }}>{children}</table>,
                th: ({ children }) => <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6c63ff', fontWeight: 600, borderBottom: '1px solid #2a2a4a', fontSize: 11 }}>{children}</th>,
                td: ({ children }) => <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a1a2e', verticalAlign: 'top' }}>{children}</td>,
              }}>{m.content || ''}</Markdown>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', opacity: 0.4, animation: 'pulse 1s ease-in-out infinite' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', opacity: 0.7, animation: 'pulse 1s ease-in-out 0.2s infinite' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6c63ff', animation: 'pulse 1s ease-in-out 0.4s infinite' }} />
            <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #2a2a4a' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {QUICK_ACTIONS.map((label, idx) => (
            <button
              key={idx}
              onClick={() => send(label)}
              disabled={loading}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(108, 99, 255, 0.3)',
                background: 'rgba(108, 99, 255, 0.08)', color: '#6c63ff', fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your pipeline or next steps…"
            style={{
              flex: 1, background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 8,
              color: '#c0c0e0', fontSize: 13, padding: '10px 14px', outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading}
            style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: loading ? '#2a2a4a' : '#6c63ff', color: loading ? '#6b7280' : '#0e0e1a',
              fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            →
          </button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }' }} />
    </div>
  )
}
