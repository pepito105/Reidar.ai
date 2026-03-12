import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ChatPanel({ API, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm your AI analyst. I know your full deal database and firm mandate. Ask me anything — about specific companies, sectors, or what's worth your attention this week." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setLoading(true)
    const res = await axios.post(`${API}/chat/`, { message: userMsg })
    setMessages(m => [...m, { role: 'assistant', text: res.data.response }])
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#0d0d14', borderLeft: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', zIndex: 900 }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#f0f0ff' }}>AI Analyst</div>
          <div style={{ fontSize: 11, color: '#6366f1' }}>Knows your full database & mandate</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555577', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 10,
              background: m.role === 'user' ? '#1e1b4b' : '#0f0f1a',
              border: `1px solid ${m.role === 'user' ? '#3730a3' : '#1e1e2e'}`,
              color: '#c0c0e0', fontSize: 13, lineHeight: 1.6
            }}>
              <Markdown remarkPlugins={[remarkGfm]} components={{
                h1: ({children}) => <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff', marginBottom: 8, marginTop: 4 }}>{children}</div>,
                h2: ({children}) => <div style={{ fontSize: 13, fontWeight: 700, color: '#c0c0e0', marginBottom: 6, marginTop: 10, borderBottom: '1px solid #1e1e2e', paddingBottom: 3 }}>{children}</div>,
                h3: ({children}) => <div style={{ fontSize: 12, fontWeight: 700, color: '#a0a0cc', marginBottom: 4, marginTop: 8 }}>{children}</div>,
                p: ({children}) => <p style={{ margin: '0 0 6px', lineHeight: 1.6 }}>{children}</p>,
                strong: ({children}) => <strong style={{ color: '#e0e0ff', fontWeight: 600 }}>{children}</strong>,
                ul: ({children}) => <ul style={{ margin: '4px 0 6px', paddingLeft: 16 }}>{children}</ul>,
                li: ({children}) => <li style={{ margin: '2px 0', lineHeight: 1.5 }}>{children}</li>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid #1e1e2e', margin: '8px 0' }} />,
                table: ({children}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontSize: 12 }}>{children}</table>,
                th: ({children}) => <th style={{ textAlign: 'left', padding: '4px 8px', color: '#6366f1', fontWeight: 600, borderBottom: '1px solid #2a2a4a', fontSize: 11 }}>{children}</th>,
                td: ({children}) => <td style={{ padding: '4px 8px', borderBottom: '1px solid #1a1a2e', verticalAlign: 'top' }}>{children}</td>,
              }}>{m.text}</Markdown>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '10px 14px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', opacity: 0.4 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', opacity: 0.7 }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e1e2e', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your deal flow..."
          style={{
            flex: 1, background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 8,
            color: '#c0c0e0', fontSize: 13, padding: '10px 14px', outline: 'none',
            fontFamily: 'Inter, sans-serif'
          }}
        />
        <button onClick={send} disabled={loading} style={{
          padding: '10px 16px', borderRadius: 8, border: 'none',
          background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>→</button>
      </div>
    </div>
  )
}