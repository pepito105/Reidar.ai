import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  card:     '#0d0d14',
  surface:  '#0a0a14',
  border:   '#1a1a2e',
  border2:  '#2a2a4a',
  text:     '#f0f0ff',
  textSec:  '#c0c0e0',
  muted:    '#8888aa',
  dim:      '#555577',
  accent:   '#6366f1',
  success:  '#10b981',
  warning:  '#f59e0b',
  danger:   '#ef4444',
}

const panelStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
}

const panelLabel = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '1.5px',
  color: C.accent,
  textTransform: 'uppercase',
  marginBottom: 16,
}

const sectionLabel = {
  fontSize: 11,
  color: C.dim,
  marginBottom: 8,
}

const divider = { borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 14 }

// ── Sub-components ────────────────────────────────────────────────────────────

function FeedbackBtn({ label, hoverColor, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none', border: `1px solid ${hovered ? hoverColor : C.border2}`,
        borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 500,
        padding: '2px 7px', color: hovered ? hoverColor : C.dim,
        transition: 'color 0.15s, border-color 0.15s', lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: `2px solid ${C.border2}`, borderTop: `2px solid ${C.accent}`,
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
  )
}

function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? C.accent : C.border2,
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function Sparkline({ data }) {
  if (!data || data.length < 2) {
    return <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>Not enough data yet</div>
  }
  const W = 200, H = 44, PAD = 3
  const values = data.map(d => d.avg_quality)
  const minV = Math.min(...values)
  const maxV = Math.max(...values, minV + 0.01)
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.avg_quality - minV) / (maxV - minV)) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const trending = values[values.length - 1] >= values[values.length - 2]
  const color = trending ? C.success : C.warning
  return (
    <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
        const y = H - PAD - ((d.avg_quality - minV) / (maxV - minV)) * (H - PAD * 2)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

function SectorBars({ sectors }) {
  if (!sectors || sectors.length === 0) return <div style={{ fontSize: 12, color: C.dim }}>No data</div>
  const top = sectors.slice(0, 8)
  const max = Math.max(...top.map(s => s.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {top.map(s => (
        <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 96, fontSize: 11, color: C.muted, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sector}</div>
          <div style={{ flex: 1, background: C.border, borderRadius: 3, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', background: C.accent, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, width: 24, textAlign: 'right', flexShrink: 0 }}>{s.count}</div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status, label }) {
  const colors = { self_optimizing: C.success, learning: C.warning, cold_start: C.danger }
  const c = colors[status] || C.muted
  return (
    <span style={{
      display: 'inline-block', padding: '5px 16px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: '1px',
      background: `${c}18`, color: c, border: `1px solid ${c}35`,
    }}>{label}</span>
  )
}

function mandateColor(status) {
  if (status === 'saturated') return C.success
  if (status === 'moderate') return C.accent
  return C.warning
}

function qualityBarColor(q) {
  if (q >= 0.25) return C.success
  if (q >= 0.1) return C.warning
  return C.danger
}

function fitScoreColor(s) {
  return [, '#6b7280', '#f97316', C.warning, '#3b82f6', C.accent][s] || C.muted
}

function jobBorderColor(status) {
  if (status === 'success') return C.success
  if (status === 'failure') return C.danger
  return C.warning
}

function healthColor(health) {
  if (health === 'healthy') return C.success
  if (health === 'partial') return C.warning
  if (health === 'failed') return C.danger
  return '#3a3a5a'
}

function refreshColor(iso) {
  if (!iso) return C.danger
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 24) return C.success
  if (h < 48) return C.warning
  return C.danger
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtDuration(secs) {
  if (secs == null) return '—'
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Intelligence({ API }) {
  const { getToken } = useAuth()

  // Panel data
  const [sourcing, setSourcing] = useState(null)
  const [sourcingLoading, setSourcingLoading] = useState(true)
  const [learning, setLearning] = useState(null)
  const [learningLoading, setLearningLoading] = useState(true)
  const [overnight, setOvernight] = useState(null)
  const [overnightLoading, setOvernightLoading] = useState(true)
  const [coverage, setCoverage] = useState(null)
  const [coverageLoading, setCoverageLoading] = useState(true)
  const [signals, setSignals] = useState(null)
  const [signalsLoading, setSignalsLoading] = useState(true)
  const [portfolio, setPortfolio] = useState(null)
  const [portfolioLoading, setPortfolioLoading] = useState(true)
  const [firmProfile, setFirmProfile] = useState(null)

  // Panel 1
  const [sourcingRunning, setSourcingRunning] = useState(false)

  // Panel 2
  const [teachQuery, setTeachQuery] = useState('')
  const [teachLoading, setTeachLoading] = useState(false)
  const [teachMsg, setTeachMsg] = useState(null)
  const [resetStep, setResetStep] = useState('idle') // idle | confirming | loading

  // Panel 3
  const [selectedDate, setSelectedDate] = useState(null)
  const [testEmailStatus, setTestEmailStatus] = useState(null)

  // Panel 4
  const [fitThreshold, setFitThreshold] = useState(3)
  const [fitSaving, setFitSaving] = useState(false)
  const fitTimer = useRef(null)

  // Panel 1 — query feedback
  const [queryFeedback, setQueryFeedback] = useState({}) // query → 'noted' | undefined

  // Panel 5
  const [refreshingId, setRefreshingId] = useState(null)

  // Panel 6
  const [portfolioToggling, setPortfolioToggling] = useState(null)
  const [addSector, setAddSector] = useState('')
  const [sectorSaving, setSectorSaving] = useState(false)
  const [portfolioSearch, setPortfolioSearch] = useState('')

  // ── Auth fetch helper ───────────────────────────────────────────────────────

  const authFetch = async (url, opts = {}) => {
    const token = await getToken().catch(() => null)
    const headers = { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    return fetch(url, { ...opts, headers })
  }

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchSourcing = async () => {
    setSourcingLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/sourcing`)
      if (res.ok) setSourcing(await res.json())
    } catch (_) {}
    setSourcingLoading(false)
  }

  const fetchLearning = async () => {
    setLearningLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/learning`)
      if (res.ok) setLearning(await res.json())
    } catch (_) {}
    setLearningLoading(false)
  }

  const fetchOvernight = async () => {
    setOvernightLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/overnight`)
      if (res.ok) {
        const data = await res.json()
        setOvernight(data)
      }
    } catch (_) {}
    setOvernightLoading(false)
  }

  const fetchCoverage = async () => {
    setCoverageLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/coverage`)
      if (res.ok) {
        const data = await res.json()
        setCoverage(data)
        setFitThreshold(data.fit_threshold || 3)
      }
    } catch (_) {}
    setCoverageLoading(false)
  }

  const fetchSignals = async () => {
    setSignalsLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/signals`)
      if (res.ok) setSignals(await res.json())
    } catch (_) {}
    setSignalsLoading(false)
  }

  const fetchPortfolio = async () => {
    setPortfolioLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/portfolio`)
      if (res.ok) setPortfolio(await res.json())
    } catch (_) {}
    setPortfolioLoading(false)
  }

  const fetchFirmProfile = async () => {
    try {
      const res = await authFetch(`${API}/firm-profile/`)
      if (res.ok) setFirmProfile(await res.json())
    } catch (_) {}
  }

  useEffect(() => {
    fetchSourcing()
    fetchLearning()
    fetchOvernight()
    fetchCoverage()
    fetchSignals()
    fetchPortfolio()
    fetchFirmProfile()
  }, [])

  // Default selected date once overnight data arrives
  useEffect(() => {
    if (overnight?.nights?.length > 0 && !selectedDate) {
      setSelectedDate(overnight.nights[0].date)
    }
  }, [overnight])

  // ── Panel 1 handlers ────────────────────────────────────────────────────────

  const handleRunSourcing = async () => {
    setSourcingRunning(true)
    try {
      await authFetch(`${API}/sourcing/run`, { method: 'POST' })
      const poll = setInterval(async () => {
        try {
          const res = await authFetch(`${API}/sourcing/status`)
          if (res.ok) {
            const data = await res.json()
            if (!data.is_running) {
              clearInterval(poll)
              setSourcingRunning(false)
              fetchSourcing()
            }
          }
        } catch (_) { clearInterval(poll); setSourcingRunning(false) }
      }, 3000)
    } catch (_) {
      setSourcingRunning(false)
    }
  }

  const handleQueryFeedback = async (query, signal) => {
    try {
      const res = await authFetch(`${API}/intelligence/sourcing/query-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, signal }),
      })
      if (res.ok) {
        setQueryFeedback(prev => ({ ...prev, [query]: 'noted' }))
        fetchLearning()
        setTimeout(() => setQueryFeedback(prev => { const n = { ...prev }; delete n[query]; return n }), 2000)
      }
    } catch (_) {}
  }

  // ── Panel 2 handlers ────────────────────────────────────────────────────────

  const handleTeach = async () => {
    if (!teachQuery.trim()) return
    setTeachLoading(true)
    try {
      const res = await authFetch(`${API}/intelligence/learning/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: teachQuery.trim() }),
      })
      if (res.ok) {
        setTeachMsg('✓ Query added to learning pool')
        setTeachQuery('')
        setTimeout(() => setTeachMsg(null), 3000)
        fetchLearning()
      }
    } catch (_) {}
    setTeachLoading(false)
  }

  const handleReset = async () => {
    if (resetStep === 'idle') { setResetStep('confirming'); return }
    setResetStep('loading')
    try {
      await authFetch(`${API}/intelligence/learning/reset`, { method: 'POST' })
      fetchLearning()
    } catch (_) {}
    setResetStep('idle')
  }

  // ── Panel 3 handlers ────────────────────────────────────────────────────────

  const handleTestEmail = async () => {
    setTestEmailStatus('loading')
    try {
      const res = await authFetch(`${API}/intelligence/overnight/test-email`, { method: 'POST' })
      const data = res.ok ? await res.json() : {}
      setTestEmailStatus(data.success ? 'success' : 'failed')
    } catch (_) {
      setTestEmailStatus('failed')
    }
    setTimeout(() => setTestEmailStatus(null), 4000)
  }

  // ── Panel 4 handlers ────────────────────────────────────────────────────────

  const handleFitThreshold = (val) => {
    setFitThreshold(val)
    if (fitTimer.current) clearTimeout(fitTimer.current)
    fitTimer.current = setTimeout(async () => {
      if (!firmProfile) return
      setFitSaving(true)
      try {
        await authFetch(`${API}/firm-profile/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...firmProfile, fit_threshold: val }),
        })
        setFirmProfile(p => ({ ...p, fit_threshold: val }))
      } catch (_) {}
      setFitSaving(false)
    }, 700)
  }

  const fitThresholdCount = (threshold) => {
    if (!coverage?.fit_distribution) return 0
    return [5, 4, 3, 2, 1]
      .filter(s => s >= threshold)
      .reduce((sum, s) => sum + (coverage.fit_distribution[String(s)] || 0), 0)
  }

  // ── Panel 5 handlers ────────────────────────────────────────────────────────

  const handleRefreshSignal = (companyId) => {
    console.log('[Intelligence] Signal refresh requested for company:', companyId)
    setRefreshingId(companyId)
    setTimeout(() => {
      setRefreshingId(null)
      fetchSignals()
    }, 1500)
  }

  // ── Panel 6 handlers ────────────────────────────────────────────────────────

  const handlePortfolioToggle = async (companyId, current) => {
    setPortfolioToggling(companyId)
    try {
      await authFetch(`${API}/intelligence/portfolio/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_portfolio: !current }),
      })
      fetchPortfolio()
    } catch (_) {}
    setPortfolioToggling(null)
  }

  const handleRemoveSector = async (sector) => {
    if (!firmProfile) return
    setSectorSaving(true)
    const updated = (firmProfile.excluded_sectors || []).filter(s => s !== sector)
    try {
      await authFetch(`${API}/firm-profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...firmProfile, excluded_sectors: updated }),
      })
      setFirmProfile(p => ({ ...p, excluded_sectors: updated }))
      fetchPortfolio()
    } catch (_) {}
    setSectorSaving(false)
  }

  const handleAddSector = async () => {
    if (!addSector.trim() || !firmProfile) return
    setSectorSaving(true)
    const updated = [...(firmProfile.excluded_sectors || []), addSector.trim()]
    try {
      await authFetch(`${API}/firm-profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...firmProfile, excluded_sectors: updated }),
      })
      setFirmProfile(p => ({ ...p, excluded_sectors: updated }))
      setAddSector('')
      fetchPortfolio()
    } catch (_) {}
    setSectorSaving(false)
  }

  // ── Overnight helpers ───────────────────────────────────────────────────────

  const days = last7Days()
  const nightFor = (date) => overnight?.nights?.find(n => n.date === date)
  const selectedNight = selectedDate ? nightFor(selectedDate) : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px 36px', overflowY: 'auto', background: C.bg, minHeight: '100vh' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>◈</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>Reidar Autopilot</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>What Reidar is doing for you — and what's coming next</div>
        </div>
      </div>

      {/* 6-panel grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

        {/* ── PANEL 1: SOURCING ENGINE ─────────────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Sourcing Engine</div>

          {sourcingLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : !sourcing ? (
            <div style={{ color: C.dim, fontSize: 13 }}>No sourcing data.</div>
          ) : (
            <>
              {/* Last run summary */}
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.7 }}>
                {sourcing.last_run?.ran_at ? (
                  <>
                    Last run <span style={{ color: '#a5b4fc' }}>{fmtDate(sourcing.last_run.ran_at)}</span>
                    {' — '}{sourcing.last_run.query_count} queries,{' '}
                    <span style={{ color: C.success }}>{sourcing.last_run.companies_added}</span> companies added,{' '}
                    <span style={{ color: C.accent }}>{sourcing.last_run.high_fit_count}</span> matched mandate
                  </>
                ) : 'No sourcing runs yet.'}
              </div>

              {/* Sparkline */}
              <div style={{ marginBottom: 16 }}>
                <div style={sectionLabel}>Quality trend — last {sourcing.quality_trend?.length || 0} runs</div>
                <Sparkline data={sourcing.quality_trend} />
              </div>

              {/* Last run queries */}
              {sourcing.last_run_queries?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={sectionLabel}>Last run queries</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {sourcing.last_run_queries.map((q, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {q.query}
                          </div>
                          <div
                            title={`Quality: ${(q.quality_score || 0).toFixed(2)}`}
                            style={{ background: C.border, borderRadius: 2, height: 4, overflow: 'hidden', cursor: 'default' }}
                          >
                            <div style={{
                              width: `${Math.min((q.quality_score || 0) * 100, 100)}%`,
                              height: '100%',
                              background: qualityBarColor(q.quality_score || 0),
                              transition: 'width 0.4s',
                            }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ color: C.textSec, fontWeight: 500 }}>{q.companies_added}</span>
                          <span style={{ color: C.dim, marginLeft: 3 }}>added</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {queryFeedback[q.query] === 'noted' ? (
                            <span style={{ fontSize: 11, color: C.success, fontWeight: 500 }}>✓ Noted</span>
                          ) : (
                            <>
                              <FeedbackBtn label="↑ Good" hoverColor={C.success} onClick={() => handleQueryFeedback(q.query, 'good')} />
                              <FeedbackBtn label="↓ Bad" hoverColor={C.danger} onClick={() => handleQueryFeedback(q.query, 'bad')} />
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Quality bar legend */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[
                      { label: 'High quality', color: C.success },
                      { label: 'Medium', color: C.warning },
                      { label: 'Low', color: C.danger },
                    ].map(({ label, color }) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: C.dim }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, fontStyle: 'italic', marginTop: 6, lineHeight: 1.5 }}>
                    ↑ Good / ↓ Bad teaches Reidar which query styles to use more or avoid in future sourcing runs.
                  </div>
                </div>
              )}

              {/* Mandate coverage pills */}
              {sourcing.mandate_coverage?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={sectionLabel}>Mandate coverage</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sourcing.mandate_coverage.map((m, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11,
                        background: C.surface, border: `1px solid ${mandateColor(m.status)}30`, color: C.textSec,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: mandateColor(m.status), flexShrink: 0 }} />
                        {m.bucket} <span style={{ color: C.dim }}>({m.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Run button */}
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                <button
                  onClick={handleRunSourcing}
                  disabled={sourcingRunning}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 8, border: 'none',
                    cursor: sourcingRunning ? 'not-allowed' : 'pointer',
                    background: sourcingRunning ? C.surface : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: sourcingRunning ? C.muted : '#fff',
                    fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  }}
                >
                  {sourcingRunning ? <><Spinner /> Running…</> : 'Run Sourcing Now'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── PANEL 2: LEARNING LOOP ───────────────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Learning Loop</div>

          {learningLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : !learning ? (
            <div style={{ color: C.dim, fontSize: 13 }}>No learning data.</div>
          ) : (
            <>
              {/* Status badge */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <StatusBadge
                  status={learning.loop_status}
                  label={learning.loop_status === 'self_optimizing' ? 'SELF-OPTIMIZING' : learning.loop_status === 'learning' ? 'LEARNING' : 'COLD START'}
                />
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  {learning.high_performing_count} of 10 high-quality runs needed for self-optimization
                </div>
                <div style={{ background: C.border, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((learning.high_performing_count / 10) * 100, 100)}%`,
                    height: '100%', borderRadius: 4, transition: 'width 0.4s',
                    background: learning.loop_status === 'self_optimizing' ? C.success : learning.loop_status === 'learning' ? C.warning : C.danger,
                  }} />
                </div>
                {learning.runs_until_optimizing > 0 && (
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                    {learning.runs_until_optimizing} more needed
                  </div>
                )}
              </div>

              {/* Cold start message */}
              {learning.loop_status === 'cold_start' && (
                <div style={{ fontSize: 12, color: C.muted, background: C.surface, borderRadius: 8, padding: '10px 14px', marginBottom: 14, lineHeight: 1.6, border: `1px solid ${C.border}` }}>
                  Reidar is still learning. Run sourcing a few more times to build up pattern recognition.
                </div>
              )}

              {/* High performing */}
              {learning.high_performing?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={sectionLabel}>Working well</div>
                  {learning.high_performing.slice(0, 5).map((q, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</span>
                      <span style={{ fontSize: 11, color: C.success, flexShrink: 0 }}>{(q.quality_score * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Low performing */}
              {learning.low_performing?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={sectionLabel}>Patterns Reidar is avoiding</div>
                  {learning.low_performing.slice(0, 5).map((q, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.danger, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through' }}>{q.query}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Teach + reset */}
              <div style={{ marginTop: 'auto', ...divider }}>
                <div style={sectionLabel}>Teach Reidar a query</div>
                {teachMsg && <div style={{ fontSize: 12, color: C.success, marginBottom: 8 }}>{teachMsg}</div>}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    value={teachQuery}
                    onChange={e => setTeachQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleTeach()}
                    placeholder='"AI contract review seed 2026"'
                    style={{
                      flex: 1, background: '#0f0f1a', border: `1px solid ${C.border2}`, borderRadius: 6,
                      color: C.text, fontSize: 12, padding: '7px 10px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleTeach}
                    disabled={!teachQuery.trim() || teachLoading}
                    style={{
                      padding: '7px 12px', borderRadius: 6, border: 'none', flexShrink: 0,
                      cursor: teachQuery.trim() ? 'pointer' : 'not-allowed',
                      background: teachQuery.trim() ? C.accent : C.surface,
                      color: teachQuery.trim() ? '#fff' : C.dim,
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {teachLoading ? '…' : 'Teach'}
                  </button>
                </div>
                <button
                  onClick={handleReset}
                  disabled={resetStep === 'loading'}
                  style={{
                    width: '100%', padding: '7px', borderRadius: 6, fontSize: 12,
                    border: `1px solid ${resetStep === 'confirming' ? C.danger : C.border2}`,
                    background: resetStep === 'confirming' ? '#2d0a0a' : 'transparent',
                    color: resetStep === 'confirming' ? '#f87171' : C.dim,
                    cursor: 'pointer', fontWeight: resetStep === 'confirming' ? 600 : 400, transition: 'all 0.15s',
                  }}
                >
                  {resetStep === 'idle' ? 'Reset Learning' : resetStep === 'confirming' ? '⚠ Confirm — clears all learned patterns' : 'Resetting…'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── PANEL 3: OVERNIGHT LOG ───────────────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Overnight Log</div>

          {overnightLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : (
            <>
              {/* Day pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {days.map(date => {
                  const night = nightFor(date)
                  const isSelected = date === selectedDate
                  const hc = healthColor(night?.health)
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11,
                        border: `1px solid ${isSelected ? hc : C.border2}`,
                        background: isSelected ? `${hc}18` : 'transparent',
                        color: isSelected ? hc : C.muted,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: hc, flexShrink: 0 }} />
                      {dayLabel(date)}
                    </button>
                  )
                })}
              </div>

              {/* Selected night jobs */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!selectedNight ? (
                  <div style={{ fontSize: 12, color: C.dim }}>No jobs ran this night.</div>
                ) : selectedNight.jobs.map((job, i) => (
                  <div key={i} style={{
                    borderLeft: `3px solid ${jobBorderColor(job.status)}`,
                    paddingLeft: 12, paddingTop: 8, paddingBottom: 8,
                    background: C.surface, borderRadius: '0 7px 7px 0',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSec }}>{job.display_name}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {fmtTime(job.started_at)} · {fmtDuration(job.duration_seconds)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{job.summary}</div>
                  </div>
                ))}
              </div>

              {/* Test email */}
              <div style={{ ...divider, display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleTestEmail}
                  disabled={testEmailStatus === 'loading'}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: `1px solid ${C.border2}`,
                    background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {testEmailStatus === 'loading' ? 'Sending…' : 'Send Test Email'}
                </button>
                {testEmailStatus === 'success' && <span style={{ fontSize: 12, color: C.success }}>✓ Sent</span>}
                {testEmailStatus === 'failed' && <span style={{ fontSize: 12, color: C.danger }}>✗ Failed</span>}
              </div>
            </>
          )}
        </div>

        {/* ── PANEL 7: TONIGHT'S PLAN ──────────────────────────────────────── */}
        <div style={{ ...panelStyle, gridColumn: '1 / -1' }}>
          <div style={panelLabel}>Tonight's Plan</div>
          <div style={{ display: 'flex', gap: 0 }}>

            {/* Column 1 — Sourcing */}
            <div style={{ flex: 1, paddingRight: 32 }}>
              <div style={{
                fontSize: 9, fontFamily: "'DM Mono', monospace", color: C.accent,
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14,
              }}>Sourcing · 4:00 AM</div>
              <div style={{ fontSize: 12, color: C.textSec, fontWeight: 600, marginBottom: 12 }}>4:00 AM — Sourcing run</div>

              {/* Thin mandate buckets */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 7 }}>Prioritising thin buckets</div>
                {(() => {
                  const thin = (coverage?.by_mandate_bucket || []).filter(b => b.status === 'thin')
                  if (!coverage) return <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>Loading…</div>
                  if (thin.length === 0) return <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>All buckets have moderate or better coverage</div>
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {thin.map((b, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '2px 9px', borderRadius: 20,
                          background: `${C.warning}15`, border: `1px solid ${C.warning}30`, color: C.warning,
                        }}>{b.bucket}</span>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Static run config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.muted }}>8 search queries</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, fontStyle: 'italic' }}>
                  Queries are generated based on your mandate, thin coverage areas, and what's worked in past runs.
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

            {/* Column 2 — Signals */}
            <div style={{ flex: 1, paddingLeft: 32, paddingRight: 32 }}>
              <div style={{
                fontSize: 9, fontFamily: "'DM Mono', monospace", color: C.accent,
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14,
              }}>Signals · 3:00 AM</div>
              <div style={{ fontSize: 12, color: C.textSec, fontWeight: 600, marginBottom: 12 }}>3:00 AM — Signal refresh</div>

              {!signals ? (
                <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>Loading…</div>
              ) : signals.monitored_companies?.length === 0 ? (
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                  No companies in pipeline yet — add companies to Watching or Diligence to enable signal monitoring
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                  {signals.monitored_companies.map(co => (
                    <div key={co.company_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.success, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.textSec, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.company_name}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 7px', borderRadius: 10, flexShrink: 0,
                        background: C.surface, color: C.dim, border: `1px solid ${C.border2}`,
                      }}>{co.pipeline_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

            {/* Column 3 — Alerts */}
            <div style={{ flex: 1, paddingLeft: 32 }}>
              <div style={{
                fontSize: 9, fontFamily: "'DM Mono', monospace", color: C.accent,
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 14,
              }}>Alerts · Morning</div>
              <div style={{ fontSize: 12, color: C.textSec, fontWeight: 600, marginBottom: 12 }}>Morning digest</div>

              {!firmProfile ? (
                <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>Loading…</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'notify_top_match', label: 'Top match alerts' },
                    { key: 'notify_diligence_signal', label: 'Diligence signal emails' },
                    { key: 'notify_weekly_summary', label: 'Weekly digest' },
                  ].map(({ key, label }) => {
                    const on = !!firmProfile[key]
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: 13, color: on ? C.success : C.dim, fontWeight: 700, flexShrink: 0 }}>
                          {on ? '✓' : '–'}
                        </span>
                        <span style={{ fontSize: 11, color: on ? C.textSec : C.dim }}>{label}</span>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 6, fontSize: 10, color: C.dim, fontStyle: 'italic', lineHeight: 1.5 }}>
                    Change alert settings in Firm Settings
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── PANEL 4: COVERAGE MAP ────────────────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Coverage Map</div>

          {coverageLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : !coverage ? (
            <div style={{ color: C.dim, fontSize: 13 }}>No coverage data.</div>
          ) : (
            <>
              {/* Total */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: C.text, lineHeight: 1 }}>{coverage.total_companies?.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>companies in coverage</div>
              </div>

              {/* Fit distribution */}
              <div style={{ marginBottom: 20 }}>
                <div style={sectionLabel}>Fit distribution</div>
                {[5, 4, 3, 2, 1].map(score => {
                  const count = coverage.fit_distribution?.[String(score)] || 0
                  const max = Math.max(...[5,4,3,2,1].map(s => coverage.fit_distribution?.[String(s)] || 0), 1)
                  return (
                    <div key={score} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 16, fontSize: 11, color: C.muted, textAlign: 'right', flexShrink: 0 }}>{score}</div>
                      <div style={{ flex: 1, background: C.border, borderRadius: 3, height: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: fitScoreColor(score), borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                    </div>
                  )
                })}
              </div>

              {/* Mandate buckets */}
              {coverage.by_mandate_bucket?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabel}>Mandate buckets</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {coverage.by_mandate_bucket.map((b, i) => (
                      <div key={i} style={{
                        padding: '8px 10px', background: C.surface, borderRadius: 7,
                        border: `1px solid ${mandateColor(b.status)}28`,
                      }}>
                        <div style={{ fontSize: 11, color: C.textSec, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.bucket}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>{b.count}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                            color: mandateColor(b.status), padding: '2px 6px', borderRadius: 4,
                            background: `${mandateColor(b.status)}18`,
                          }}>
                            {b.status === 'saturated' ? 'COVERED' : b.status === 'thin' ? 'HUNTING' : 'MODERATE'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector bar chart */}
              {coverage.by_sector?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionLabel}>Top sectors</div>
                  <SectorBars sectors={coverage.by_sector} />
                </div>
              )}

              {/* Fit threshold slider */}
              <div style={{ marginTop: 'auto', ...divider }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Fit threshold</div>
                  <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>
                    {fitSaving ? 'Saving…' : `${fitThresholdCount(fitThreshold)} companies at ${fitThreshold}+`}
                  </div>
                </div>
                <input
                  type="range" min={1} max={5} step={1} value={fitThreshold}
                  onChange={e => handleFitThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: C.accent, cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.border2, marginTop: 2 }}>
                  {[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── PANEL 5: SIGNAL HEALTH ───────────────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Signal Health</div>

          {signalsLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : !signals ? (
            <div style={{ color: C.dim, fontSize: 13 }}>No signal data.</div>
          ) : (
            <>
              {/* Last run */}
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.7 }}>
                {signals.last_run?.ran_at ? (
                  <>
                    Last run <span style={{ color: '#a5b4fc' }}>{fmtDate(signals.last_run.ran_at)}</span>
                    {' — '}{signals.last_run.companies_checked} checked,{' '}
                    <span style={{ color: C.success }}>{signals.last_run.signals_found}</span> signals
                  </>
                ) : 'No signal refresh runs yet.'}
              </div>

              {/* Signal type breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {Object.entries(signals.signal_type_breakdown || {}).map(([type, count]) => (
                  <span key={type} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11,
                    background: C.surface, color: C.muted, border: `1px solid ${C.border2}`,
                  }}>
                    {type} <span style={{ color: C.text, fontWeight: 600 }}>{count}</span>
                  </span>
                ))}
              </div>

              {/* Monitored companies table */}
              {signals.monitored_companies?.length === 0 ? (
                <div style={{ fontSize: 12, color: C.dim }}>
                  No companies in watching, outreach, or diligence yet.
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 80px 28px 36px', gap: '4px 8px', marginBottom: 8 }}>
                    {['Company', 'Stage', 'Refreshed', '7d', ''].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, color: C.dim, fontWeight: 600, letterSpacing: '0.5px' }}>{h}</div>
                    ))}
                  </div>
                  {signals.monitored_companies.map(co => (
                    <div key={co.company_id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 72px 80px 28px 36px',
                      gap: '4px 8px', alignItems: 'center',
                      paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`,
                    }}>
                      <div style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: refreshColor(co.last_refreshed_at), flexShrink: 0 }} />
                        {co.company_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{co.pipeline_status}</div>
                      <div style={{ fontSize: 11, color: C.dim }}>{co.last_refreshed_at ? fmtDate(co.last_refreshed_at) : '—'}</div>
                      <div style={{ fontSize: 11, color: co.recent_signal_count > 0 ? C.success : C.dim, fontWeight: co.recent_signal_count > 0 ? 600 : 400, textAlign: 'center' }}>
                        {co.recent_signal_count}
                      </div>
                      <button
                        onClick={() => handleRefreshSignal(co.company_id)}
                        disabled={refreshingId === co.company_id}
                        style={{
                          background: 'none', border: `1px solid ${C.border2}`, borderRadius: 5,
                          color: C.muted, fontSize: 12, cursor: 'pointer', padding: '3px 6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {refreshingId === co.company_id ? <Spinner /> : '↺'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── PANEL 6: PORTFOLIO & EXCLUSIONS ─────────────────────────────── */}
        <div style={panelStyle}>
          <div style={panelLabel}>Portfolio & Exclusions</div>

          {portfolioLoading ? <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div> : !portfolio ? (
            <div style={{ color: C.dim, fontSize: 13 }}>No portfolio data.</div>
          ) : (
            <>
              {/* Count */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{portfolio.portfolio_count}</span>
                <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>companies excluded from sourcing</span>
              </div>

              {/* Portfolio list */}
              {portfolio.portfolio_companies?.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <input
                    value={portfolioSearch}
                    onChange={e => setPortfolioSearch(e.target.value)}
                    placeholder="Filter companies…"
                    style={{
                      width: '100%', boxSizing: 'border-box', marginBottom: 10,
                      background: '#0f0f1a', border: `1px solid ${C.border2}`, borderRadius: 6,
                      color: C.text, fontSize: 12, padding: '6px 10px', outline: 'none',
                    }}
                  />
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {portfolio.portfolio_companies.filter(co =>
                    !portfolioSearch.trim() || co.company_name.toLowerCase().includes(portfolioSearch.trim().toLowerCase())
                  ).map(co => (
                    <div key={co.company_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <div style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.company_name}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{co.pipeline_status}</div>
                      </div>
                      <Toggle
                        on={co.is_portfolio}
                        disabled={portfolioToggling === co.company_id}
                        onChange={() => handlePortfolioToggle(co.company_id, co.is_portfolio)}
                      />
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {/* Excluded sectors */}
              <div style={{ marginTop: 'auto', ...divider }}>
                <div style={sectionLabel}>Excluded sectors</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 28 }}>
                  {(firmProfile?.excluded_sectors || portfolio.excluded_sectors || []).length > 0
                    ? (firmProfile?.excluded_sectors || portfolio.excluded_sectors || []).map(sector => (
                      <span key={sector} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11,
                        background: '#2d0a0a', border: '1px solid #7f1d1d40', color: '#fca5a5',
                      }}>
                        {sector}
                        <button
                          onClick={() => handleRemoveSector(sector)}
                          disabled={sectorSaving}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: 0, fontSize: 12, lineHeight: 1 }}
                        >✕</button>
                      </span>
                    ))
                    : <span style={{ fontSize: 12, color: C.dim, fontStyle: 'italic' }}>None configured</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={addSector}
                    onChange={e => setAddSector(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSector()}
                    placeholder="Add sector to exclude…"
                    style={{
                      flex: 1, background: '#0f0f1a', border: `1px solid ${C.border2}`, borderRadius: 6,
                      color: C.text, fontSize: 12, padding: '7px 10px', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddSector}
                    disabled={!addSector.trim() || sectorSaving}
                    style={{
                      padding: '7px 14px', borderRadius: 6, border: 'none', flexShrink: 0,
                      cursor: addSector.trim() ? 'pointer' : 'not-allowed',
                      background: addSector.trim() ? C.accent : C.surface,
                      color: addSector.trim() ? '#fff' : C.dim,
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
