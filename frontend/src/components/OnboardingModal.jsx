import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const STAGES = ['pre-seed', 'seed', 'Series A', 'Series B']
const GEOS = ['North America', 'Europe', 'Asia', 'Latin America', 'Global']
const EXCLUDE_OPTIONS = ['crypto', 'gambling', 'defense', 'hardware', 'consumer', 'social media']
const SOURCING_MESSAGES = [
  'Searching for AI-native B2B companies...',
  'Evaluating thesis fit for each result...',
  'Adding high-conviction matches to your feed...',
  'Almost there...',
]

const inputBase = {
  width: '100%',
  background: '#13131f',
  border: '1px solid #2a2a3d',
  borderRadius: 8,
  color: '#e8e8f0',
  fontSize: 14,
  padding: 12,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}

export default function OnboardingModal({ API, onSaved, onClose }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firm_name: '',
    investment_stages: ['pre-seed', 'seed'],
    geography_focus: ['North America'],
    check_size_min: 250000,
    check_size_max: 2000000,
    investment_thesis: '',
    excluded_sectors: [],
    fit_threshold: 3
  })
  const [saving, setSaving] = useState(false)
  const [sourcing, setSourcing] = useState(false)
  const [sourcingComplete, setSourcingComplete] = useState(false)
  const [sourcingCount, setSourcingCount] = useState(0)
  const [sourcingError, setSourcingError] = useState(null)
  const [sourcingStatus, setSourcingStatus] = useState(SOURCING_MESSAGES[0])
  const [activityFeed, setActivityFeed] = useState([])
  const [totalCompanies, setTotalCompanies] = useState(0)
  const [isFirstRun, setIsFirstRun] = useState(false)
  const [fitThreshold, setFitThreshold] = useState(3)
  const [portfolioText, setPortfolioText] = useState('')
  const [portfolioFile, setPortfolioFile] = useState(null)
  const [portfolioImporting, setPortfolioImporting] = useState(false)
  const [portfolioImported, setPortfolioImported] = useState(0)
  const [portfolioError, setPortfolioError] = useState(null)
  const cancelledRef = useRef(false)
  const eventSourceRef = useRef(null)
  const activityFeedRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [])

  useEffect(() => {
    axios.get(`${API}/firm-profile/`).then(res => {
      if (res.data) {
        setFitThreshold(res.data.fit_threshold ?? 3)
        setForm({
          firm_name: res.data.firm_name || '',
          investment_stages: res.data.investment_stages || ['pre-seed', 'seed'],
          geography_focus: res.data.geography_focus || ['North America'],
          check_size_min: res.data.check_size_min ?? 250000,
          check_size_max: res.data.check_size_max ?? 2000000,
          investment_thesis: res.data.investment_thesis || '',
          excluded_sectors: res.data.excluded_sectors || [],
          fit_threshold: res.data.fit_threshold ?? 3
        })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    axios.get(`${API}/startups/count`).then(res => {
      const count = res.data?.count ?? 0
      setTotalCompanies(count)
      setIsFirstRun(count === 0)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sourcing || sourcingComplete) return
    setSourcingStatus(SOURCING_MESSAGES[0])
    const i = setInterval(() => {
      setSourcingStatus(prev => {
        const idx = SOURCING_MESSAGES.indexOf(prev)
        const next = (idx + 1) % SOURCING_MESSAGES.length
        return SOURCING_MESSAGES[next]
      })
    }, 3000)
    return () => clearInterval(i)
  }, [sourcing, sourcingComplete])

  useEffect(() => {
    activityFeedRef.current?.scrollTo({ top: activityFeedRef.current.scrollHeight, behavior: 'smooth' })
  }, [activityFeed])

  const getMessageColor = (type) => {
    if (['start', 'queries', 'scoring'].includes(type)) return '#8888aa'
    if (['searching', 'waiting'].includes(type)) return '#a78bfa'
    if (type === 'found') return '#60a5fa'
    if (type === 'added') return '#34d399'
    if (type === 'skip') return '#444466'
    if (type === 'complete') return '#34d399'
    if (type === 'error') return '#f87171'
    return '#8888aa'
  }

  const toggleArray = (field, value) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(x => x !== value) : [...f[field], value]
    }))
  }

  const handleCloseClick = () => onClose()


  const parsePortfolioText = (text) => {
    return text.trim().split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      return { name: parts[0]||'', website: parts[1]||'', description: parts[2]||'', stage: parts[3]||'' }
    }).filter(c => c.name && c.name.toLowerCase() !== 'name')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPortfolioFile(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setPortfolioText(ev.target.result)
    reader.readAsText(file)
  }

  const importPortfolio = async () => {
    if (!portfolioText.trim()) return
    setPortfolioImporting(true)
    setPortfolioError(null)
    try {
      const companies = parsePortfolioText(portfolioText)
      if (companies.length === 0) { setPortfolioError('No companies found.'); setPortfolioImporting(false); return }
      const res = await axios.post(`${API}/startups/portfolio-import`, { companies })
      setPortfolioImported(res.data?.imported ?? companies.length)
    } catch (e) { setPortfolioError('Import failed. Check your format.') }
    setPortfolioImporting(false)
  }

  const runSourcing = () => {
    setSourcing(true)
    setSourcingComplete(false)
    setSourcingError(null)
    setActivityFeed([])
    const eventSource = new EventSource(`${API}/signals/sourcing/stream`)
    eventSourceRef.current = eventSource
    eventSource.onmessage = (e) => {
      if (cancelledRef.current) return
      try {
        const event = JSON.parse(e.data)
        setActivityFeed(prev => [...prev, {
          type: event.type,
          message: event.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          data: event
        }])
        if (event.type === 'complete') {
          const added = event.data?.added ?? event.added ?? 0
          setSourcingCount(added)
          setTotalCompanies(prev => prev + added)
          setSourcingComplete(true)
          setSourcing(false)
          eventSource.close()
          eventSourceRef.current = null
        }
        if (event.type === 'error') {
          setSourcingError(event.message || 'Sourcing failed.')
          setSourcingComplete(true)
          setSourcing(false)
          eventSource.close()
          eventSourceRef.current = null
        }
      } catch (err) {
        setSourcingError('Invalid stream event.')
        setSourcingComplete(true)
        setSourcing(false)
        eventSource.close()
        eventSourceRef.current = null
      }
    }
    eventSource.onerror = () => {
      if (cancelledRef.current) return
      setSourcingError('Connection lost. Please try again.')
      setSourcingComplete(true)
      setSourcing(false)
      eventSource.close()
      eventSourceRef.current = null
    }
  }

  const saveAndRescore = async () => {
    if (!form.firm_name || !form.investment_thesis) return
    setSaving(true)
    try {
      await axios.post(`${API}/firm-profile/`, { ...form, fit_threshold: fitThreshold })
    } catch (e) {}
    setSaving(false)
    try {
      const countRes = await axios.get(`${API}/startups/count`)
      if (cancelledRef.current) return
      const count = countRes.data?.count ?? 0
      setTotalCompanies(count)
      setIsFirstRun(count === 0)
    } catch (e) {}
    runSourcing()
  }

  const canProceedStep1 = form.firm_name.trim() && form.investment_thesis.trim()

  // Sourcing overlay
  if (sourcing || sourcingComplete) {
    const sourcingOverlayTitle = isFirstRun ? 'Setting Up Your Feed' : 'Sourcing New Companies'
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflow: 'auto' }}>
        <div style={{ maxWidth: 680, width: '100%', margin: 'auto', padding: 24 }}>
          {sourcingComplete && sourcingError ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>Sourcing Incomplete</div>
              <div style={{ fontSize: 14, color: '#8888aa', marginBottom: 28 }}>{sourcingError}</div>
              <button onClick={onClose} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Open Radar →</button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 0 }}>
                <div style={{ width: 48, height: 48, background: '#8b5cf6', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, marginBottom: 12 }}>◈</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e8f0', marginBottom: 6 }}>{sourcingOverlayTitle}</div>
                <div style={{ fontSize: 14, color: '#8888aa' }}>Radar is searching the web and evaluating each company against your mandate.</div>
              </div>

              <div style={{ marginTop: 32 }}>
                <div
                  ref={activityFeedRef}
                  style={{ background: '#0d0d18', border: '1px solid #2a2a3d', borderRadius: 12, padding: 0, maxHeight: 320, overflowY: 'auto', width: '100%' }}
                >
                  {activityFeed.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: '#8888aa', fontSize: 14 }}>
                      <div style={{ width: 32, height: 32, border: '3px solid #2a2a3d', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      Connecting to Radar...
                    </div>
                  ) : (
                    activityFeed.map((item, i) => (
                      <div key={i} style={{ padding: '10px 16px', borderBottom: i < activityFeed.length - 1 ? '1px solid #1a1a2e' : 'none', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: '#444466', fontSize: 11, fontFamily: 'monospace', minWidth: 70, paddingTop: 1, flexShrink: 0 }}>{item.time}</span>
                        <span style={{ color: getMessageColor(item.type), fontSize: 13, fontWeight: item.type === 'complete' ? 700 : 400 }}>{item.message}</span>
                      </div>
                    ))
                  )}
                </div>

                {sourcingComplete && !sourcingError && (
                  <div style={{ background: '#0d2010', border: '1px solid #065f46', borderRadius: 12, padding: 24, textAlign: 'center', marginTop: 16 }}>
                    <div style={{ color: '#34d399', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>✓ Radar is Ready</div>
                    <div style={{ color: '#8888aa', fontSize: 14 }}>{sourcingCount} new companies added to your feed.</div>
                    <button onClick={() => window.location.href = "/app"} style={{ width: '100%', marginTop: 16, padding: 12, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Enter Radar →</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Main wizard
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 1000, display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Left panel */}
      <div style={{ width: '40%', background: '#0d0d18', borderRight: '1px solid #2a2a3d', display: 'flex', position: 'relative' }}>
        <div style={{ width: 4, minHeight: '100%', background: 'linear-gradient(180deg, #8b5cf6, #6366f1)', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'auto' }}>
          <div>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>◈</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Radar</h1>
            <p style={{ fontSize: 13, color: '#8888aa', margin: 0 }}>
              {step === 1 && 'Step 1 of 4 — Define your mandate'}
              {step === 2 && 'Step 2 of 4 — Set your parameters'}
              {step === 3 && 'Step 3 of 4 — Configure filters'}
            </p>
            <div style={{ borderTop: '1px solid #2a2a3d', marginTop: 20, marginBottom: 20 }} />

            <div key={step} style={{ opacity: 1, transition: 'opacity 0.3s ease' }}>
              {step === 1 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Your thesis. Your filter.</div>
                  <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Most VC tools are databases you search. Radar is different — it works for you. Every company Radar finds gets scored 1–5 against the exact thesis you're writing right now. A company that scores below your threshold never surfaces. You only see what fits.
                  </p>
                  <div style={{ borderTop: '1px solid #2a2a3d', marginTop: 20, marginBottom: 16 }} />
                  <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: '#555577', letterSpacing: '1px', marginBottom: 10 }}>WHAT MAKES A GOOD THESIS?</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#8888aa', fontSize: 12, lineHeight: 1.8 }}>
                      <li>Specific vertical — "AI-native B2B SaaS" not just "SaaS"</li>
                      <li>Customer type — "regulated industries" narrows the field</li>
                      <li>Problem space — "automating knowledge work" focuses Claude</li>
                    </ul>
                  </div>
                  <div style={{ fontSize: 11, color: '#555577', letterSpacing: '1px', marginBottom: 8 }}>EXAMPLE</div>
                  <div style={{ background: '#1a1230', border: '1px solid #4c1d95', borderRadius: 6, padding: 12 }}>
                    <p style={{ fontSize: 12, color: '#a78bfa', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                      "We invest in AI-native B2B SaaS companies automating knowledge work in regulated verticals at pre-seed and seed."
                    </p>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 10 }}>13 sources. Continuously.</div>
                  <p style={{ fontSize: 13, color: '#8888aa', margin: '0 0 16px' }}>
                    While you sleep, Radar is scanning every major startup signal source. New YC batches, ProductHunt launches, funding announcements, founder tweets — all classified by Claude against your mandate in real time.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                    {[
                      { name: 'YC Batches', dot: '#10b981' },
                      { name: 'ProductHunt', dot: '#f59e0b' },
                      { name: 'TechCrunch AI', dot: '#3b82f6' },
                      { name: 'VentureBeat', dot: '#3b82f6' },
                      { name: 'Hacker News', dot: '#f59e0b' },
                      { name: 'The Information', dot: '#8b5cf6' },
                      { name: 'StrictlyVC', dot: '#8b5cf6' },
                      { name: 'Axios Pro Rata', dot: '#3b82f6' },
                      { name: 'MIT Tech Review', dot: '#10b981' },
                      { name: 'Wired Business', dot: '#6b7280' },
                      { name: 'Forbes AI', dot: '#3b82f6' },
                      { name: 'Fortune Term Sheet', dot: '#10b981' },
                      { name: 'Bloomberg Tech', dot: '#3b82f6' },
                    ].map(({ name, dot }) => (
                      <div key={name} style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 20, padding: '6px 12px', fontSize: 11, color: '#8888aa', display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', marginRight: 6, flexShrink: 0 }} />
                        {name}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#555577', fontStyle: 'italic', marginTop: 12, marginBottom: 0 }}>New sources added regularly.</p>
                </>
              )}
              {step === 3 && (
                <>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Radar goes to work.</div>
                  <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6, margin: '0 0 20px' }}>
                    The moment you hit Launch, Radar sources your first batch of mandate-matching companies. Claude evaluates each one and writes a full investment memo — thesis fit reasoning, risk matrix, bull case, comparable companies, and a recommended next step.
                  </p>
                  <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16 }}>📊</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Fit Score + Reasoning</div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>Every company gets a 1–5 score with Claude's exact reasoning for why it fits or doesn't.</div>
                    </div>
                  </div>
                  <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16 }}>📄</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Full Investment Memo</div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>Risk matrix, bull case, comparable companies — generated before you even click.</div>
                    </div>
                  </div>
                  <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: 14, marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16 }}>💬</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>AI Analyst Chat</div>
                      <div style={{ fontSize: 12, color: '#8888aa' }}>Ask your deal database anything. "What came in this week that fits our fintech thesis?"</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #2a2a3d', paddingTop: 24 }}>
            <p style={{ fontSize: 11, color: '#444466', textAlign: 'center', margin: 0 }}>Powered by Claude (Anthropic) · 13 sources · pgvector</p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: '#0a0a0f', padding: 48, overflow: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={handleCloseClick} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: '#8888aa', fontSize: 20, cursor: 'pointer' }} aria-label="Close">✕</button>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: step >= s ? '#8b5cf6' : '#2a2a3d',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ flex: 1, maxWidth: 440 }}>
          {step === 1 && (
            <div style={{ opacity: 1, transition: 'opacity 0.2s' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', margin: '0 0 8px' }}>Let's set up your firm</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32 }}>This takes 2 minutes. Radar uses this to filter every company it finds.</p>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8 }}>Firm Name</label>
                <input
                  value={form.firm_name}
                  onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))}
                  placeholder="e.g. Failup Ventures"
                  style={inputBase}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8 }}>Investment Thesis</label>
                <textarea
                  value={form.investment_thesis}
                  onChange={e => setForm(f => ({ ...f, investment_thesis: e.target.value }))}
                  placeholder="e.g. We invest in AI-native B2B SaaS companies automating knowledge work in regulated verticals"
                  rows={4}
                  style={{ ...inputBase, resize: 'vertical', minHeight: 100 }}
                />
                <p style={{ fontSize: 12, color: '#8888aa', marginTop: 8 }}>Be specific. The more precise your thesis, the better Radar filters.</p>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 8,
                  border: 'none',
                  background: canProceedStep1 ? '#8b5cf6' : '#2a2a3d',
                  color: canProceedStep1 ? '#fff' : '#555577',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s, opacity 0.2s',
                }}
              >
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ opacity: 1, transition: 'opacity 0.2s' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', margin: '0 0 8px' }}>Your investment parameters</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32 }}>Radar uses these to filter by stage and geography.</p>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12 }}>Investment Stages</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STAGES.map(s => {
                    const active = form.investment_stages.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleArray('investment_stages', s)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: `1px solid ${active ? '#8b5cf6' : '#2a2a3d'}`,
                          background: active ? '#8b5cf6' : 'transparent',
                          color: active ? '#fff' : '#8888aa',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12 }}>Geography Focus</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GEOS.map(g => {
                    const active = form.geography_focus.includes(g)
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleArray('geography_focus', g)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: `1px solid ${active ? '#8b5cf6' : '#2a2a3d'}`,
                          background: active ? '#8b5cf6' : 'transparent',
                          color: active ? '#fff' : '#8888aa',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8 }}>Check Size</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={form.check_size_min || ''}
                    onChange={e => setForm(f => ({ ...f, check_size_min: Number(e.target.value) || 0 }))}
                    placeholder="Min ($)"
                    style={{ ...inputBase, flex: 1 }}
                  />
                  <span style={{ color: '#8888aa', fontSize: 13 }}>to</span>
                  <input
                    type="number"
                    value={form.check_size_max || ''}
                    onChange={e => setForm(f => ({ ...f, check_size_max: Number(e.target.value) || 0 }))}
                    placeholder="Max ($)"
                    style={{ ...inputBase, flex: 1 }}
                  />
                </div>
              </div>
              <button
                onClick={() => setStep(3)}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 8,
                  border: 'none',
                  background: '#8b5cf6',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                Next →
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ opacity: 1, transition: 'opacity 0.2s' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', margin: '0 0 8px' }}>Almost done</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32 }}>Tell Radar what to ignore.</p>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12 }}>Excluded Sectors</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXCLUDE_OPTIONS.map(s => {
                    const active = form.excluded_sectors.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleArray('excluded_sectors', s)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: `1px solid ${active ? '#7f1d1d' : '#2a2a3d'}`,
                          background: active ? 'rgba(127, 29, 29, 0.3)' : 'transparent',
                          color: active ? '#fca5a5' : '#8888aa',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12 }}>Minimum Fit Threshold</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={fitThreshold}
                  onChange={e => setFitThreshold(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8b5cf6', marginBottom: 8 }}
                />
                <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>
                  {fitThreshold === 1 && 'Show all (1+)'}
                  {fitThreshold === 2 && 'Weak Fit (2+)'}
                  {fitThreshold === 3 && 'Possible Fit (3+)'}
                  {fitThreshold === 4 && 'Strong Fit (4+)'}
                  {fitThreshold === 5 && 'Top Match only (5)'}
                </div>
              </div>
              <button
                onClick={() => setStep(4)}
                
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 8,
                  border: 'none',
                  background: '#8b5cf6',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Next →
              </button>
            </div>
          )}

          {step === 4 && (
            <div style={{ opacity: 1 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', margin: '0 0 8px' }}>Import your portfolio</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 24 }}>Optional — skip if starting fresh. Portfolio companies show with a Portfolio badge and no fit score.</p>
            {portfolioImported > 0 ? (
                <div style={{ background: '#0d2010', border: '1px solid #065f46', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                  <div style={{ color: '#34d399', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{portfolioImported} companies imported</div>
                  <div style={{ color: '#8888aa', fontSize: 13 }}>Your portfolio is loaded. Radar will use these as context.</div>
                </div>
              ) : (
                <>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #2a2a3d', borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#8b5cf6'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a3d'}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', marginBottom: 4 }}>{portfolioFile || 'Upload CSV'}</div>
                    <div style={{ fontSize: 12, color: '#555577' }}>Name, Website, Description, Stage</div>
                    <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: '#2a2a3d' }} />
                    <span style={{ fontSize: 12, color: '#555577' }}>or paste manually</span>
                    <div style={{ flex: 1, height: 1, background: '#2a2a3d' }} />
                  </div>
                  <textarea value={portfolioText} onChange={e => setPortfolioText(e.target.value)}
                    placeholder="Lotus Health, lotushealth.com, AI-pored primary care, seed"
                    rows={5} style={{ width: '100%', background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, color: '#e8e8f0', fontSize: 13, padding: 12, outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: 120, fontFamily: 'Inter, sans-serif' }} />
                  {portfolioError && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{portfolioError}</div>}
                  <button onClick={importPortfolio} disabled={portfolioImporting || !portfolioText.trim()}
                    style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 8, background: portfolioText.trim() ? '#1a1230' : '#13131f', border: `1px solid ${portfolioText.trim() ? '#8b5cf6' : '#2a2a3d'}`, color: portfolioText.trim() ? '#a78bfa' : '#555577', fontSize: 14, fontWeight: 600, cursor: portfolioText.trim() ? 'pointer' : 'not-allowed' }}>
                    {portfolioImporting ? 'Importing...' : 'Import Portfolio'}
                  </button>
                </>
              )}
              <button onClick={saveAndRescore} disabled={saving}
                style={{ width: '100%', marginTop: 20, padding: 16, borderRadius: 8, border: 'none', background: saving ? '#2a2a3d' : '#8b5cf6', color: saving ? '#555577' : '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Launch Radar →'}
              </button>
              <button onClick={saveAndRescore} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#555577', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                Skip and launch without portfolio
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
