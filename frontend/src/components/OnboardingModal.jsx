import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'

const STAGES = ['pre-seed', 'seed', 'Series A', 'Series B']
const GEOS = ['North America', 'Europe', 'Asia', 'Latin America', 'Global']
const EXCLUDE_OPTIONS = ['crypto', 'gambling', 'defense', 'hardware', 'consumer', 'social media']

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

const STEPS = [
  { n: 1, label: 'Define your mandate' },
  { n: 2, label: 'Set parameters' },
  { n: 3, label: 'Configure filters' },
  { n: 4, label: 'Import portfolio' },
  { n: 5, label: 'Notifications' },
]

const LEFT_PANELS = {
  1: {
    headline: 'Your thesis.\nYour filter.',
    body: [
      {
        icon: '🎯',
        title: 'Mandate-first, not database-first',
        desc: 'Most tools are databases you search. Radar works for you — every company it finds is scored against your exact thesis before it ever surfaces.',
      },
      {
        icon: '🤖',
        title: 'AI reasoning, not AI search',
        desc: 'Claude reads each company like an analyst would — evaluating business model, team, traction, and fit. Not keyword matching.',
      },
      {
        icon: '📄',
        title: 'Investment memos, automatically',
        desc: 'Every company gets a full memo: thesis fit reasoning, risk matrix, bull case, comparables, and a recommended next step.',
      },
    ],
    tip: '"We invest at pre-seed and seed in technical founders building AI-native B2B SaaS that automates knowledge work in regulated verticals."',
  },
  2: {
    headline: '13 sources.\nScanned nightly.',
    body: [
      {
        icon: '📡',
        title: 'Always-on sourcing',
        desc: 'While you sleep, Radar scans YC batches, ProductHunt launches, funding announcements, and 10+ news feeds — all filtered through your mandate.',
      },
      {
        icon: '⚡',
        title: 'First-mover advantage',
        desc: 'See pre-seed and seed companies before they hit your competitors\' radar. Early signals mean better entry terms.',
      },
      {
        icon: '🌍',
        title: 'Geography-aware',
        desc: 'Set your focus regions. Radar weights companies in your target markets higher and filters out noise from geographies you don\'t cover.',
      },
    ],
    sources: ['YC Batches','ProductHunt','TechCrunch AI','VentureBeat','Hacker News','The Information','StrictlyVC','Axios Pro Rata','MIT Tech Review','Wired Business','Forbes AI','Fortune Term Sheet','Bloomberg Tech'],
  },
  3: {
    headline: 'Precision over\nvolume.',
    body: [
      {
        icon: '🚫',
        title: 'Hard excludes',
        desc: 'Tell Radar what to never surface. Crypto, hardware, defense — whatever falls outside your mandate gets filtered before it reaches you.',
      },
      {
        icon: '📊',
        title: 'Fit threshold control',
        desc: 'Set your minimum score. A 4+ threshold means only Strong Fits and Top Matches appear in your feed. You control the signal-to-noise ratio.',
      },
      {
        icon: '🧠',
        title: 'Claude scores every company',
        desc: 'Every startup gets a 1–5 fit score with written reasoning. Not an algorithm — actual AI judgment based on your specific thesis.',
      },
    ],
  },
  4: {
    headline: 'Your portfolio\nis context.',
    body: [
      {
        icon: '🗂️',
        title: 'Seed Radar with what you know',
        desc: 'Importing your portfolio gives the AI analyst instant context. It knows what you\'ve backed, what you like, and what to find more of.',
      },
      {
        icon: '🔍',
        title: '"Find me more like these"',
        desc: 'Ask the AI analyst to source companies similar to any portfolio company. Your existing bets become a sourcing signal.',
      },
      {
        icon: '🏷️',
        title: 'Portfolio badge, no fit score',
        desc: 'You already decided these fit. Portfolio companies show with a distinct badge and skip scoring — they\'re reference points, not candidates.',
      },
    ],
    format: 'CSV format: Name, Website, Description, Stage — or one company per line.',
  },
  5: {
    headline: 'Radar works\nwhile you sleep.',
    body: [
      {
        icon: '🌅',
        title: 'Daily top matches digest',
        desc: 'Get an email every morning with the highest-conviction companies from the latest scrape — only companies that clear your fit threshold.',
      },
      {
        icon: '🔬',
        title: 'Diligence signals',
        desc: 'When a company in your pipeline gets a major signal — new funding, key hire, press mention — Radar flags it so you never miss a reason to move.',
      },
      {
        icon: '📬',
        title: 'Weekly market brief',
        desc: 'A Friday summary of what moved in your thesis areas, standout companies, whitespace opportunities, and one highest-conviction pick.',
      },
    ],
  },
}

export default function OnboardingModal({ API, onSaved, onClose }) {
  const { getToken } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firm_name: '',
    investment_stages: ['pre-seed', 'seed'],
    geography_focus: ['North America'],
    check_size_min: 250000,
    check_size_max: 2000000,
    investment_thesis: '',
    excluded_sectors: [],
    fit_threshold: 3,
    notify_top_match: true,
    notify_diligence_signal: true,
    notify_weekly_summary: true,
    notify_min_fit_score: 4,
    notification_emails: '',
  })
  const [saving, setSaving] = useState(false)
  const [sourcing, setSourcing] = useState(false)
  const [sourcingComplete, setSourcingComplete] = useState(false)
  const [sourcingCount, setSourcingCount] = useState(0)
  const [sourcingError, setSourcingError] = useState(null)
  const [activityFeed, setActivityFeed] = useState([])
  const [isFirstRun, setIsFirstRun] = useState(false)
  const [fitThreshold, setFitThreshold] = useState(3)

  const [portfolioText, setPortfolioText] = useState('')
  const [portfolioFile, setPortfolioFile] = useState(null)
  const [portfolioImporting, setPortfolioImporting] = useState(false)
  const [portfolioImported, setPortfolioImported] = useState(0)
  const [portfolioImportedNames, setPortfolioImportedNames] = useState([])
  const [importSuccess, setImportSuccess] = useState(false)
  const [portfolioError, setPortfolioError] = useState(null)

  const cancelledRef = useRef(false)
  const eventSourceRef = useRef(null)
  const activityFeedRef = useRef(null)
  const fileInputRef = useRef(null)
  const fileContentRef = useRef('')

  useEffect(() => {
    cancelledRef.current = false
    return () => { cancelledRef.current = true; eventSourceRef.current?.close() }
  }, [])

  useEffect(() => {
    const fn = async () => {
      try {
        const res = await axios.get(`${API}/firm-profile/`)
        if (res.data) {
          setFitThreshold(res.data.fit_threshold ?? 3)
          setForm(f => ({
            ...f,
            firm_name: res.data.firm_name || '',
            investment_stages: res.data.investment_stages || ['pre-seed', 'seed'],
            geography_focus: res.data.geography_focus || ['North America'],
            check_size_min: res.data.check_size_min ?? 250000,
            check_size_max: res.data.check_size_max ?? 2000000,
            investment_thesis: res.data.investment_thesis || '',
            excluded_sectors: res.data.excluded_sectors || [],
            fit_threshold: res.data.fit_threshold ?? 3,
            notify_top_match: res.data.notify_top_match ?? true,
            notify_diligence_signal: res.data.notify_diligence_signal ?? true,
            notify_weekly_summary: res.data.notify_weekly_summary ?? true,
            notify_min_fit_score: res.data.notify_min_fit_score ?? 4,
            notification_emails: res.data.notification_emails || '',
          }))
        }
      } catch (_) {}
    }
    fn()
  }, [API])

  useEffect(() => {
    const fn = async () => {
      try {
        const res = await axios.get(`${API}/startups/count`)
        setIsFirstRun((res.data?.count ?? 0) === 0)
      } catch (_) {}
    }
    fn()
  }, [API])

  useEffect(() => {
    activityFeedRef.current?.scrollTo({ top: activityFeedRef.current.scrollHeight, behavior: 'smooth' })
  }, [activityFeed])

  const toggleArray = (field, value) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(x => x !== value) : [...f[field], value]
    }))
  }

  const parseCSVLine = (line) => {
    const fields = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (inQuotes) {
        if (c === '"') {
          if (line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += c
        }
      } else {
        if (c === '"') {
          inQuotes = true
        } else if (c === ',') {
          fields.push(current.trim())
          current = ''
        } else {
          current += c
        }
      }
    }
    fields.push(current.trim())
    return fields
  }

  const parsePortfolioText = (text) => {
    return text.trim().split('\n').filter(l => l.trim()).map(line => {
      const parts = parseCSVLine(line).map(p => p.replace(/^"|"$/g, '').trim())
      return { name: parts[0] || '', website: parts[1] || '', description: parts[2] || '', stage: parts[3] || '' }
    }).filter(c => c.name && c.name.toLowerCase() !== 'name')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPortfolioFile(file.name)
    fileContentRef.current = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result ?? reader.result ?? ''
      fileContentRef.current = typeof text === 'string' ? text : ''
      setPortfolioText(fileContentRef.current)
    }
    reader.onerror = () => {
      setPortfolioError('Could not read file.')
      fileContentRef.current = ''
    }
    reader.readAsText(file, 'UTF-8')
  }

  const importPortfolio = async () => {
    console.log('portfolioImporting state:', portfolioImporting)
    const textToImport = (portfolioText.trim() || fileContentRef.current || '').trim()
    console.log('portfolioText:', portfolioText)
    if (!textToImport) return
    setPortfolioImporting(true)
    setPortfolioError(null)
    try {
      const companies = parsePortfolioText(textToImport)
      console.log('companies parsed:', companies.length, companies)
      if (companies.length === 0) { setPortfolioError('No companies found. Check your format.'); setPortfolioImporting(false); return }
      console.log('about to call API')
      console.log('Full URL:', `${API}/startups/portfolio-import`)
      const res = await fetch(`${API}/startups/portfolio-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies })
      })
      console.log('fetch response status:', res.status)
      const data = await res.json().catch(() => ({}))
      console.log('response data:', data)
      if (!res.ok) throw new Error(data?.detail || 'Import failed')
      console.log('setting imported to:', data?.imported)
      setPortfolioImported(data?.imported ?? companies.length)
      setPortfolioImportedNames(companies.map(c => c.name).filter(Boolean))
      setImportSuccess(true)
    } catch (e) {
      console.error('Import error:', e)
      setPortfolioError('Import failed. Check your format and try again.')
    }
    setPortfolioImporting(false)
  }

  const getMessageColor = (type) => {
    if (['start','queries','scoring'].includes(type)) return '#8888aa'
    if (['searching','waiting'].includes(type)) return '#a78bfa'
    if (type === 'found') return '#60a5fa'
    if (type === 'added') return '#34d399'
    if (type === 'skip') return '#444466'
    if (type === 'complete') return '#34d399'
    if (type === 'error') return '#f87171'
    return '#8888aa'
  }

  const runSourcing = async () => {
    setSourcing(true)
    setSourcingComplete(false)
    setSourcingError(null)
    setActivityFeed([])
    const token = await getToken().catch(() => null)
    const url = token ? `${API}/signals/sourcing/stream?token=${token}` : `${API}/signals/sourcing/stream`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource
    eventSource.onmessage = (e) => {
      if (cancelledRef.current) return
      try {
        const event = JSON.parse(e.data)
        setActivityFeed(prev => [...prev, {
          type: event.type,
          message: event.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }])
        if (event.type === 'complete') {
          setSourcingCount(event.data?.added ?? event.added ?? 0)
          setSourcingComplete(true)
          setSourcing(false)
          eventSource.close()
        }
        if (event.type === 'error') {
          setSourcingError(event.message || 'Sourcing failed.')
          setSourcingComplete(true)
          setSourcing(false)
          eventSource.close()
        }
      } catch {
        setSourcingError('Stream error.')
        setSourcingComplete(true)
        setSourcing(false)
        eventSource.close()
      }
    }
    eventSource.onerror = () => {
      if (cancelledRef.current) return
      setSourcingError('Connection lost. Please try again.')
      setSourcingComplete(true)
      setSourcing(false)
      eventSource.close()
    }
  }

  const saveAndLaunch = async () => {
    if (!form.firm_name || !form.investment_thesis) return
    setSaving(true)
    try {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      console.log('token:', token)
      console.log('headers:', headers)
      await axios.post(`${API}/firm-profile/`, { ...form, fit_threshold: fitThreshold }, { headers })
    } catch (e) {
      console.error('firm profile save failed:', e.response?.status, e.response?.data)
    }
    setSaving(false)
    runSourcing()
  }

  const canProceedStep1 = form.firm_name.trim() && form.investment_thesis.trim()
  const panel = LEFT_PANELS[step]

  // ── Sourcing overlay
  if (sourcing || sourcingComplete) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflow: 'auto' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(280%)}}`}</style>
        <div style={{ maxWidth: 680, width: '100%', margin: 'auto', padding: 24 }}>
          {sourcingComplete && sourcingError ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>Sourcing Incomplete</div>
              <div style={{ fontSize: 14, color: '#8888aa', marginBottom: 28 }}>{sourcingError}</div>
              <button onClick={() => window.location.href = '/app'} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Open Radar →</button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, marginBottom: 16 }}>◈</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f0', marginBottom: 6 }}>{isFirstRun ? 'Setting Up Your Feed' : 'Sourcing New Companies'}</div>
                <div style={{ fontSize: 14, color: '#8888aa' }}>Radar is searching the web and evaluating each company against your mandate.</div>
              </div>
              <div style={{ height: 3, background: '#1a1a2e', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
                {!sourcingComplete
                  ? <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg,#8b5cf6,#6366f1)', borderRadius: 999, animation: 'slide 1.8s ease-in-out infinite' }} />
                  : <div style={{ height: '100%', width: '100%', background: '#34d399', borderRadius: 999 }} />
                }
              </div>
              <div ref={activityFeedRef} style={{ background: '#0d0d18', border: '1px solid #2a2a3d', borderRadius: 12, maxHeight: 300, overflowY: 'auto' }}>
                {activityFeed.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: '#8888aa', fontSize: 14 }}>
                    <div style={{ width: 32, height: 32, border: '3px solid #2a2a3d', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                    Connecting to Radar...
                  </div>
                ) : activityFeed.map((item, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: i < activityFeed.length - 1 ? '1px solid #1a1a2e' : 'none', display: 'flex', gap: 10 }}>
                    <span style={{ color: '#444466', fontSize: 11, fontFamily: 'monospace', minWidth: 70, flexShrink: 0 }}>{item.time}</span>
                    <span style={{ color: getMessageColor(item.type), fontSize: 13, fontWeight: item.type === 'complete' ? 700 : 400 }}>{item.message}</span>
                  </div>
                ))}
              </div>
              {sourcingComplete && !sourcingError && (
                <div style={{ background: '#0d2010', border: '1px solid #065f46', borderRadius: 12, padding: 24, textAlign: 'center', marginTop: 16 }}>
                  <div style={{ color: '#34d399', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>✓ Radar is Ready</div>
                  <div style={{ color: '#8888aa', fontSize: 14, marginBottom: 16 }}>{sourcingCount} new companies added to your feed.</div>
                  <button onClick={() => window.location.href = '/app'} style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Enter Radar →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Main wizard
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 1000, display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* LEFT PANEL */}
      <div style={{ width: '42%', background: '#0d0d18', borderRight: '1px solid #2a2a3d', display: 'flex', flexShrink: 0 }}>
        <div style={{ width: 4, minHeight: '100%', background: 'linear-gradient(180deg, #8b5cf6, #6366f1)', flexShrink: 0 }} />
        <div style={{ flex: 1, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'auto' }}>
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>◈</div>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Radar</span>
            </div>

            <div style={{ fontSize: 11, color: '#555577', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>Step {step} of {STEPS.length}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 24, whiteSpace: 'pre-line' }}>{panel.headline}</div>

            {/* Feature cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {panel.body.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 10, padding: '13px 15px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Step-specific extras */}
            {step === 1 && (
              <div style={{ background: '#1a1230', border: '1px solid #4c1d95', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#555577', letterSpacing: '1px', marginBottom: 6 }}>EXAMPLE THESIS</div>
                <p style={{ fontSize: 12, color: '#a78bfa', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>{panel.tip}</p>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {LEFT_PANELS[2].sources.map(name => (
                  <div key={name} style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 20, padding: '5px 10px', fontSize: 11, color: '#8888aa', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />{name}
                  </div>
                ))}
              </div>
            )}

            {step === 4 && (
              <div style={{ background: '#1a1230', border: '1px solid #4c1d95', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#555577', letterSpacing: '1px', marginBottom: 4 }}>FORMAT</div>
                <p style={{ fontSize: 12, color: '#a78bfa', margin: 0, lineHeight: 1.6 }}>{panel.format}</p>
              </div>
            )}

            {step === 5 && (
              <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#555577', letterSpacing: '1px', marginBottom: 10 }}>EXAMPLE SCHEDULE</div>
                {[
                  { time: '7:00 AM', label: 'Daily top matches email' },
                  { time: '9:00 AM', label: 'Diligence signal alerts' },
                  { time: 'Friday', label: 'Weekly market brief' },
                ].map(({ time, label }) => (
                  <div key={time} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#8b5cf6', fontFamily: 'monospace', minWidth: 56 }}>{time}</span>
                    <span style={{ fontSize: 12, color: '#8888aa' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #2a2a3d', paddingTop: 16 }}>
            <p style={{ fontSize: 11, color: '#444466', textAlign: 'center', margin: 0 }}>Powered by Claude (Anthropic) · 13 sources · pgvector</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, background: '#0a0a0f', padding: '40px 48px', overflow: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <button onClick={() => window.location.href = '/'} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: '#555577', fontSize: 20, cursor: 'pointer' }}>✕</button>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, alignItems: 'center' }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ width: s.n === step ? 24 : 8, height: 8, borderRadius: 999, background: step >= s.n ? '#8b5cf6' : '#2a2a3d', transition: 'all 0.3s' }} />
          ))}
          <span style={{ fontSize: 12, color: '#555577', marginLeft: 8 }}>{STEPS[step-1].label}</span>
        </div>

        <div style={{ flex: 1, maxWidth: 460 }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', margin: '0 0 6px' }}>Let's set up your firm</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32, lineHeight: 1.6 }}>Radar uses your thesis to score every company it finds. The more specific, the better the signal.</p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8, letterSpacing: '0.5px' }}>FIRM NAME</label>
                <input value={form.firm_name} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} placeholder="e.g. Failup Ventures" style={inputBase} />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8, letterSpacing: '0.5px' }}>INVESTMENT THESIS</label>
                <textarea value={form.investment_thesis} onChange={e => setForm(f => ({ ...f, investment_thesis: e.target.value }))}
                  placeholder="e.g. We invest at pre-seed and seed in technical founders building AI-native B2B SaaS that automates knowledge work in regulated industries."
                  rows={5} style={{ ...inputBase, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }} />
                <p style={{ fontSize: 12, color: '#555577', marginTop: 6 }}>Include: stage, geography, vertical, customer type, and problem space.</p>
              </div>

              <button onClick={() => setStep(2)} disabled={!canProceedStep1}
                style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: canProceedStep1 ? '#8b5cf6' : '#2a2a3d', color: canProceedStep1 ? '#fff' : '#555577', fontSize: 15, fontWeight: 600, cursor: canProceedStep1 ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                Next →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', margin: '0 0 6px' }}>Your investment parameters</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32, lineHeight: 1.6 }}>These help Radar prioritize the right companies in the right markets at the right stage.</p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12, letterSpacing: '0.5px' }}>INVESTMENT STAGES</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STAGES.map(s => {
                    const active = form.investment_stages.includes(s)
                    return <button key={s} type="button" onClick={() => toggleArray('investment_stages', s)}
                      style={{ padding: '8px 18px', borderRadius: 20, border: `1px solid ${active ? '#8b5cf6' : '#2a2a3d'}`, background: active ? '#8b5cf6' : 'transparent', color: active ? '#fff' : '#8888aa', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>{s}</button>
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12, letterSpacing: '0.5px' }}>GEOGRAPHY FOCUS</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GEOS.map(g => {
                    const active = form.geography_focus.includes(g)
                    return <button key={g} type="button" onClick={() => toggleArray('geography_focus', g)}
                      style={{ padding: '8px 18px', borderRadius: 20, border: `1px solid ${active ? '#8b5cf6' : '#2a2a3d'}`, background: active ? '#8b5cf6' : 'transparent', color: active ? '#fff' : '#8888aa', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>{g}</button>
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8, letterSpacing: '0.5px' }}>CHECK SIZE</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input type="number" value={form.check_size_min || ''} onChange={e => setForm(f => ({ ...f, check_size_min: Number(e.target.value) || 0 }))} placeholder="Min ($)" style={{ ...inputBase, flex: 1 }} />
                  <span style={{ color: '#555577', fontSize: 13 }}>to</span>
                  <input type="number" value={form.check_size_max || ''} onChange={e => setForm(f => ({ ...f, check_size_max: Number(e.target.value) || 0 }))} placeholder="Max ($)" style={{ ...inputBase, flex: 1 }} />
                </div>
              </div>

              <button onClick={() => setStep(3)} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', margin: '0 0 6px' }}>Configure your filters</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 32, lineHeight: 1.6 }}>Control exactly what appears in your feed. Radar enforces these on every company before it surfaces.</p>

              <div style={{ marginBottom: 28 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12, letterSpacing: '0.5px' }}>EXCLUDED SECTORS</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXCLUDE_OPTIONS.map(s => {
                    const active = form.excluded_sectors.includes(s)
                    return <button key={s} type="button" onClick={() => toggleArray('excluded_sectors', s)}
                      style={{ padding: '8px 18px', borderRadius: 20, border: `1px solid ${active ? '#7f1d1d' : '#2a2a3d'}`, background: active ? 'rgba(127,29,29,0.3)' : 'transparent', color: active ? '#fca5a5' : '#8888aa', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>{s}</button>
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 16, letterSpacing: '0.5px' }}>MINIMUM FIT THRESHOLD</label>
                <input type="range" min={1} max={5} value={fitThreshold} onChange={e => setFitThreshold(Number(e.target.value))} style={{ width: '100%', accentColor: '#8b5cf6', marginBottom: 8 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ fontSize: 11, color: fitThreshold === n ? '#a78bfa' : '#444466' }}>{n}</span>
                  ))}
                </div>
                <div style={{ background: '#13131f', border: '1px solid #2a2a3d', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 600, marginBottom: 2 }}>
                    {fitThreshold === 1 && 'Show everything (1+)'}
                    {fitThreshold === 2 && 'Weak Fit and above (2+)'}
                    {fitThreshold === 3 && 'Possible Fit and above (3+)'}
                    {fitThreshold === 4 && 'Strong Fit and above (4+)'}
                    {fitThreshold === 5 && 'Top Matches only (5)'}
                  </div>
                  <div style={{ fontSize: 12, color: '#555577' }}>
                    {fitThreshold === 1 && 'Every company Radar finds will appear in your feed.'}
                    {fitThreshold === 2 && 'Reduces noise — only companies with some thesis alignment.'}
                    {fitThreshold === 3 && 'Recommended. Good balance of volume and quality.'}
                    {fitThreshold === 4 && 'High conviction only. Expect fewer but stronger matches.'}
                    {fitThreshold === 5 && 'Ultra-precise. Only companies that nail your mandate exactly.'}
                  </div>
                </div>
              </div>

              <button onClick={() => setStep(4)} style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', margin: '0 0 6px' }}>Import your portfolio</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 24, lineHeight: 1.6 }}>Optional but powerful. Your portfolio gives the AI analyst context on what you've backed and what to find more of.</p>

              {importSuccess ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ background: '#0d2010', border: '1px solid #065f46', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
                    <div style={{ color: '#34d399', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{portfolioImported > 0 ? `${portfolioImported} companies imported` : 'Already in your database'}</div>
                    <div style={{ color: '#8888aa', fontSize: 13, marginBottom: 12 }}>Your portfolio is loaded. Radar will use these as sourcing context.</div>
                    {portfolioImportedNames.length > 0 && (
                      <div style={{ textAlign: 'left', maxHeight: 104, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>
                        {portfolioImportedNames.map((name, i) => (
                          <div key={i} style={{ fontSize: 12, color: '#8888aa', padding: '2px 0' }}>{name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setStep(5)} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
                </div>
              ) : (
                <>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #2a2a3d', borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.background = 'rgba(139,92,246,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a3d'; e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>📂</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8e8f0', marginBottom: 3 }}>{portfolioFile || 'Upload CSV file'}</div>
                    <div style={{ fontSize: 12, color: '#555577' }}>Name, Website, Description, Stage</div>
                    <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </div>

                  {!portfolioFile && <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ flex: 1, height: 1, background: '#2a2a3d' }} />
                      <span style={{ fontSize: 12, color: '#444466' }}>or paste manually</span>
                      <div style={{ flex: 1, height: 1, background: '#2a2a3d' }} />
                    </div>

                    <textarea value={portfolioText} onChange={e => setPortfolioText(e.target.value)}
                      placeholder={"Lotus Health, lotushealth.ai, AI-powered primary care, seed\nZettascale, zettascale.ai, AI compute infrastructure, seed"}
                      rows={4} style={{ ...inputBase, resize: 'vertical', minHeight: 100, fontSize: 13, lineHeight: 1.6 }} />
                  </>}

                  {portfolioError && <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{portfolioError}</div>}

                  <button onClick={importPortfolio} disabled={portfolioImporting || !(portfolioText.trim() || fileContentRef.current?.trim())}
                    style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 8, background: (portfolioText.trim() || fileContentRef.current?.trim()) ? '#1a1230' : '#13131f', border: `1px solid ${(portfolioText.trim() || fileContentRef.current?.trim()) ? '#8b5cf6' : '#2a2a3d'}`, color: (portfolioText.trim() || fileContentRef.current?.trim()) ? '#a78bfa' : '#555577', fontSize: 14, fontWeight: 600, cursor: (portfolioText.trim() || fileContentRef.current?.trim()) ? 'pointer' : 'not-allowed' }}>
                    {portfolioImporting ? 'Importing...' : portfolioFile ? `Import ${parsePortfolioText(portfolioText.trim() || fileContentRef.current || '').length} companies from ${portfolioFile}` : (portfolioText.trim() || fileContentRef.current?.trim()) ? `Import ${parsePortfolioText(portfolioText.trim() || fileContentRef.current || '').length} companies` : 'Import Portfolio'}
                  </button>
                </>
              )}

              {!importSuccess && (
                <button onClick={() => setStep(5)} style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', color: '#444466', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
                  Skip — I'll import later
                </button>
              )}
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#e8e8f0', margin: '0 0 6px' }}>Set up notifications</h2>
              <p style={{ fontSize: 14, color: '#8888aa', marginBottom: 28, lineHeight: 1.6 }}>Radar works while you sleep. Choose what to get notified about so you never miss a deal.</p>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 8, letterSpacing: '0.5px' }}>NOTIFICATION EMAIL</label>
                <input value={form.notification_emails} onChange={e => setForm(f => ({ ...f, notification_emails: e.target.value }))}
                  placeholder="you@yourfirm.com" type="email" style={inputBase} />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 12, letterSpacing: '0.5px' }}>WHAT TO NOTIFY YOU ABOUT</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'notify_top_match', label: 'Daily top matches', desc: 'New companies above your fit threshold from the nightly scrape' },
                    { key: 'notify_diligence_signal', label: 'Diligence signals', desc: 'When pipeline companies get new funding, hires, or press' },
                    { key: 'notify_weekly_summary', label: 'Weekly market brief', desc: 'Friday summary of what moved in your thesis areas' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                      style={{ background: form[key] ? 'rgba(139,92,246,0.1)' : '#13131f', border: `1px solid ${form[key] ? '#8b5cf6' : '#2a2a3d'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: form[key] ? '#e8e8f0' : '#8888aa', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 12, color: '#555577' }}>{desc}</div>
                      </div>
                      <div style={{ width: 36, height: 20, borderRadius: 999, background: form[key] ? '#8b5cf6' : '#2a2a3d', position: 'relative', flexShrink: 0, marginLeft: 16, transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute', top: 3, left: form[key] ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {form.notify_top_match && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#8888aa', display: 'block', marginBottom: 10, letterSpacing: '0.5px' }}>MINIMUM SCORE FOR EMAIL ALERTS</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setForm(f => ({ ...f, notify_min_fit_score: n }))}
                        style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${form.notify_min_fit_score === n ? '#8b5cf6' : '#2a2a3d'}`, background: form.notify_min_fit_score === n ? '#8b5cf6' : 'transparent', color: form.notify_min_fit_score === n ? '#fff' : '#8888aa', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                        {n === 3 ? 'Possible (3+)' : n === 4 ? 'Strong (4+)' : 'Top only (5)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={saveAndLaunch} disabled={saving}
                style={{ width: '100%', padding: 16, borderRadius: 8, border: 'none', background: saving ? '#2a2a3d' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: saving ? '#555577' : '#fff', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: saving ? 'none' : '0 4px 20px rgba(139,92,246,0.3)' }}>
                {saving ? 'Saving...' : '🚀 Launch Radar'}
              </button>
              <p style={{ fontSize: 12, color: '#444466', textAlign: 'center', marginTop: 10 }}>You can change all of this later in Settings</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
