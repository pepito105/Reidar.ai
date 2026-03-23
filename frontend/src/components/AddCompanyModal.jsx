import { useState, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const MIN_STAGE_MS = 1500

function stageToProgress(msg, current) {
  if (!msg) return current
  const m = msg.toLowerCase()
  let p = current
  if (m.includes('search quer') || m.includes('generating'))      p = Math.max(p, 10)
  else if (m.includes('searching') || m.includes('🔍'))           p = Math.max(p, 25)
  else if (m.includes('reading') || m.includes('📄') || m.includes('scraping')) p = Math.max(p, 50)
  else if (m.includes('found') && m.includes('source'))           p = Math.max(p, 65)
  else if (m.includes('structur') || m.includes('investment brief') || m.includes('📰')) p = Math.max(p, 80)
  return p
}

export default function AddCompanyModal({ API, onClose, onAdded }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState('form') // 'form' | 'classifying' | 'researching' | 'done'
  const [form, setForm] = useState({
    name: '',
    website: '',
    description: '',
    meeting_notes: '',
    funding_stage: '',
    source: 'manual',
  })
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Researching state
  const [stageLog, setStageLog] = useState([])   // newest first, max 3
  const [progress, setProgress] = useState(5)

  // Refs for throttled drain
  const esRef = useRef(null)
  const messageQueueRef = useRef([])
  const drainingRef = useRef(false)
  const progressRef = useRef(5)
  const drainTimerRef = useRef(null)

  function drainQueue() {
    if (messageQueueRef.current.length === 0) {
      drainingRef.current = false
      return
    }
    const msg = messageQueueRef.current.shift()
    const nextProgress = stageToProgress(msg, progressRef.current)
    progressRef.current = nextProgress
    setStageLog(prev => [msg, ...prev].slice(0, 3))
    setProgress(nextProgress)
    drainTimerRef.current = setTimeout(drainQueue, MIN_STAGE_MS)
  }

  function pushStage(msg) {
    messageQueueRef.current.push(msg)
    if (!drainingRef.current) {
      drainingRef.current = true
      drainQueue()
    }
  }

  const handleClose = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    if (drainTimerRef.current) { clearTimeout(drainTimerRef.current); drainTimerRef.current = null }
    onClose()
  }

  // Quick Add — calls /add, waits for classify_startup(), shows done state
  const handleQuickAdd = async () => {
    if (!form.name.trim()) return
    setStep('classifying')
    setError(null)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.post(`${API}/startups/add`, form, { headers })
      setResult(res.data)
      setStep('done')
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Try again.')
      setStep('form')
    }
  }

  // Analyze & Add — calls /add-and-analyze (returns 202 immediately), then streams research live
  const handleAnalyzeAdd = async () => {
    if (!form.name.trim()) return
    // Reset researching state
    messageQueueRef.current = []
    drainingRef.current = false
    progressRef.current = 5
    setStageLog(['Deploying research agents...'])
    setProgress(5)
    setStep('researching')
    setError(null)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.post(`${API}/startups/add-and-analyze`, form, { headers })
      const { startup_id } = res.data

      const streamUrl = `${API}/startups/${startup_id}/analyze/stream${token ? `?token=${token}` : ''}`
      const es = new EventSource(streamUrl)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'stage') {
            pushStage(data.message)
          } else if (data.type === 'complete') {
            es.close(); esRef.current = null
            if (drainTimerRef.current) { clearTimeout(drainTimerRef.current); drainTimerRef.current = null }
            setProgress(100)
            queryClient.invalidateQueries({ queryKey: ['startups'] })
            onAdded(null)
            onClose()
          } else if (data.type === 'error') {
            es.close(); esRef.current = null
            if (drainTimerRef.current) { clearTimeout(drainTimerRef.current); drainTimerRef.current = null }
            queryClient.invalidateQueries({ queryKey: ['startups'] })
            onAdded(null)
            onClose()
          }
        } catch {}
      }
      es.onerror = () => {
        es.close(); esRef.current = null
        if (drainTimerRef.current) { clearTimeout(drainTimerRef.current); drainTimerRef.current = null }
        queryClient.invalidateQueries({ queryKey: ['startups'] })
        onAdded(null)
        onClose()
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong. Try again.')
      setStep('form')
    }
  }

  const handleViewCompany = () => {
    onAdded(result)
    handleClose()
  }

  const FIT_COLORS = {
    5: '#10b981', 4: '#6366f1', 3: '#f59e0b', 2: '#6b7280', 1: '#ef4444'
  }
  const FIT_LABELS = {
    5: 'Top Match', 4: 'Strong Fit', 3: 'Possible Fit', 2: 'Weak Fit', 1: 'No Fit'
  }

  const headerTitle = {
    classifying: 'Analyzing with AI...',
    researching: 'Running deep research...',
    done: 'Company Added',
  }[step] ?? 'Add a Company to Reidar'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#0d0d14', border: '1px solid #2a2a4a', borderRadius: 14,
        width: 540, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
      }}>

        {/* Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid #1e1e2e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 3 }}>ADD COMPANY</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0ff' }}>{headerTitle}</div>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', color: '#555577',
            fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1
          }}>×</button>
        </div>

        {/* Classifying state (Quick Add waiting) */}
        {step === 'classifying' && (
          <div style={{ padding: '60px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
            <div style={{ fontSize: 14, color: '#f0f0ff', fontWeight: 600, marginBottom: 8 }}>
              Reidar is analyzing {form.name}
            </div>
            <div style={{ fontSize: 13, color: '#555577', lineHeight: 1.6 }}>
              Scoring against your mandate, generating thesis fit reasoning, and writing an investment summary...
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                }} />
              ))}
            </div>
            <style>{`
              @keyframes pulse {
                0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}

        {/* Researching state (Analyze & Add live stream) */}
        {step === 'researching' && (
          <div style={{ padding: '48px 28px 52px' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>◈</div>
            <div style={{ fontSize: 14, color: '#f0f0ff', fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
              Running deep research on {form.name}...
            </div>

            {/* Stage log — newest on top, up to 3 lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {stageLog.map((msg, i) => {
                const colors = ['#f0f0ff', '#555577', '#333355']
                const weights = [600, 400, 400]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 0
                      ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                      : <div style={{ width: 8, flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: 13, color: colors[i] ?? '#333355', fontWeight: weights[i] ?? 400, lineHeight: 1.4 }}>
                      {msg}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div style={{ background: '#1e1e2e', borderRadius: 2, height: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: '#8b5cf6', borderRadius: 2,
                width: `${progress}%`,
                transition: 'width 0.6s ease'
              }} />
            </div>

            <style>{`
              @keyframes pulse {
                0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                40% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}

        {/* Done state (Quick Add result) */}
        {step === 'done' && result && (
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '16px', background: '#0a0a14', borderRadius: 10, border: '1px solid #1e1e2e' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f0ff', marginBottom: 4 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.5 }}>{result.one_liner}</div>
              </div>
              <div style={{
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: `${FIT_COLORS[result.fit_score]}22`,
                color: FIT_COLORS[result.fit_score],
                border: `1px solid ${FIT_COLORS[result.fit_score]}44`,
                whiteSpace: 'nowrap'
              }}>
                {result.fit_score}/5 — {FIT_LABELS[result.fit_score]}
              </div>
            </div>

            {result.fit_reasoning && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 8 }}>THESIS FIT</div>
                <div style={{ fontSize: 13, color: '#a0a0cc', lineHeight: 1.7, padding: '12px 14px', background: '#0a0a14', borderRadius: 8, border: '1px solid #1e1e2e' }}>
                  {result.fit_reasoning}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {result.sector && (
                <span style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>
                  {result.sector}
                </span>
              )}
              {result.funding_stage && (
                <span style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>
                  {result.funding_stage}
                </span>
              )}
              {(result.thesis_tags || []).slice(0, 3).map(tag => (
                <span key={tag} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, background: '#0d1a2e', color: '#6366f1', border: '1px solid #1e3a5f' }}>
                  {tag}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleViewCompany} style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>
                View Full Memo →
              </button>
              <button onClick={() => { onAdded(null); handleClose() }} style={{
                padding: '10px 16px', borderRadius: 8,
                border: '1px solid #2a2a4a', background: 'transparent',
                color: '#8888aa', fontSize: 13, cursor: 'pointer'
              }}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* Form state */}
        {step === 'form' && (
          <div style={{ padding: '24px 28px 28px' }}>
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#2d0a0a', border: '1px solid #7f1d1d', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Company Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Acme AI"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input
                    value={form.website}
                    onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    placeholder="e.g. acme.ai"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>What do they do?</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the company in a few sentences — product, market, business model..."
                  style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Meeting / Context Notes</label>
                <textarea
                  value={form.meeting_notes}
                  onChange={e => setForm(f => ({ ...f, meeting_notes: e.target.value }))}
                  placeholder="How did you find them? Any context from a conversation, demo, or intro..."
                  style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Stage</label>
                <select
                  value={form.funding_stage}
                  onChange={e => setForm(f => ({ ...f, funding_stage: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Unknown</option>
                  <option value="pre-seed">Pre-seed</option>
                  <option value="seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                {/* Primary: Analyze & Add */}
                <button
                  onClick={handleAnalyzeAdd}
                  disabled={!form.name.trim()}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                    background: form.name.trim() ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1a1a2e',
                    color: form.name.trim() ? '#fff' : '#3a3a5a',
                    fontSize: 13, fontWeight: 600,
                    cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s'
                  }}
                >
                  ◈ Analyze & Add
                </button>
                {/* Divider label */}
                <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 8, fontSize: 11, color: '#555577', fontFamily: 'DM Mono, monospace' }}>or</div>
                {/* Secondary row: Quick Add + Cancel, equal width */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleQuickAdd}
                    disabled={!form.name.trim()}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 8,
                      border: '1px solid #2a2a4a', background: 'transparent',
                      color: form.name.trim() ? '#8888aa' : '#3a3a5a',
                      fontSize: 12, fontWeight: 500,
                      cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Quick Add
                  </button>
                  <button onClick={handleClose} style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    border: '1px solid #2a2a4a', background: 'transparent',
                    color: '#555577', fontSize: 12, cursor: 'pointer'
                  }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: '#6b7280', letterSpacing: '0.4px', marginBottom: 6
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #2a2a4a', background: '#0a0a14',
  color: '#f0f0ff', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit'
}
