import { useState } from 'react'
import axios from 'axios'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function HotSignals({ API, onClose }) {
  const [days, setDays] = useState(7)
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setBrief(null)
    const res = await axios.post(`${API}/signals/hot-signals`, { days })
    setBrief(res.data)
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(brief.brief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#0d0d14', border: '1px solid #2a2a4a', borderRadius: 16, width: 640, maxHeight: '85vh', overflow: 'auto', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>🔥 Hot Signals</h2>
            <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>AI-generated market brief for your thesis</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555577', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: '7px 18px', borderRadius: 7, border: '1px solid',
              borderColor: days === d ? '#6366f1' : '#2a2a4a',
              background: days === d ? '#1e1b4b' : 'transparent',
              color: days === d ? '#a5b4fc' : '#8888aa',
              fontSize: 13, fontWeight: days === d ? 600 : 400, cursor: 'pointer'
            }}>
              {d} days
            </button>
          ))}
          <button onClick={generate} disabled={loading} style={{
            marginLeft: 'auto', padding: '7px 20px', borderRadius: 7, border: 'none',
            background: loading ? '#2a2a4a' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: loading ? '#8888aa' : '#fff',
            fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
          }}>
            {loading ? 'Generating...' : 'Generate Brief'}
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6366f1' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 14, color: '#8888aa' }}>Analyzing your deal flow...</div>
          </div>
        )}

        {brief && !loading && (
          <div>
            <div style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 12 }}>
                MARKET BRIEF · {brief.days}-DAY WINDOW · {brief.companies_analyzed} COMPANIES ANALYZED
              </div>
              <div style={{ fontSize: 13, color: '#c0c0e0', lineHeight: 1.7 }}>
              <Markdown remarkPlugins={[remarkGfm]} components={{
                h1: ({children}) => <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0ff', marginBottom: 10, marginTop: 4 }}>{children}</div>,
                h2: ({children}) => <div style={{ fontSize: 13, fontWeight: 700, color: '#c0c0e0', marginBottom: 8, marginTop: 14, borderBottom: '1px solid #1e1e2e', paddingBottom: 4 }}>{children}</div>,
                h3: ({children}) => <div style={{ fontSize: 12, fontWeight: 700, color: '#a0a0cc', marginBottom: 6, marginTop: 10 }}>{children}</div>,
                p: ({children}) => <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>{children}</p>,
                strong: ({children}) => <strong style={{ color: '#e0e0ff', fontWeight: 600 }}>{children}</strong>,
                ul: ({children}) => <ul style={{ margin: '4px 0 8px', paddingLeft: 16 }}>{children}</ul>,
                li: ({children}) => <li style={{ margin: '3px 0', lineHeight: 1.6 }}>{children}</li>,
                hr: () => <hr style={{ border: 'none', borderTop: '1px solid #1e1e2e', margin: '12px 0' }} />,
                table: ({children}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 12 }}>{children}</table>,
                th: ({children}) => <th style={{ textAlign: 'left', padding: '5px 8px', color: '#6366f1', fontWeight: 600, borderBottom: '1px solid #2a2a4a', fontSize: 11 }}>{children}</th>,
                td: ({children}) => <td style={{ padding: '5px 8px', borderBottom: '1px solid #1a1a2e', verticalAlign: 'top' }}>{children}</td>,
              }}>{brief.brief}</Markdown>
            </div>
            </div>
            <button onClick={copy} style={{
              padding: '8px 20px', borderRadius: 7, border: '1px solid #2a2a4a',
              background: copied ? '#065f46' : 'transparent',
              color: copied ? '#6ee7b7' : '#8888aa',
              fontSize: 13, cursor: 'pointer'
            }}>
              {copied ? '✓ Copied to clipboard' : 'Copy brief'}
            </button>
          </div>
        )}

        {!brief && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#555577' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔥</div>
            <div style={{ fontSize: 14 }}>Select a time window and generate your brief</div>
          </div>
        )}
      </div>
    </div>
  )
}