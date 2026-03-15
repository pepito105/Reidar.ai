import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const FIT_BADGES = {
  5: { label: 'Top Match', color: '#10b981', bg: '#052e16' },
  4: { label: 'Strong Fit', color: '#6366f1', bg: '#1e1b4b' },
  3: { label: 'Possible Fit', color: '#f59e0b', bg: '#1c1a00' },
  2: { label: 'Weak Fit', color: '#6b7280', bg: '#1a1a2e' },
  1: { label: 'No Fit', color: '#ef4444', bg: '#2d0a0a' },
}

const PIPELINE_STAGES = ['watching', 'outreach', 'diligence', 'passed', 'invested']

const CONFIDENCE_COLORS = { High: '#10b981', Medium: '#f59e0b', Low: '#6b7280' }
function FitReasoningBullets({ text }) {
  if (!text || !text.trim()) return <p style={{ fontSize: 13, color: '#a0a0cc', lineHeight: 1.6, margin: 0 }}>No reasoning available.</p>
  const parts = text.split(/\s*•\s*/).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {parts.map((part, i) => {
        const match = part.match(/\s*—\s*(High|Medium|Low)\s+confidence\s*$/i)
        const confidence = match ? match[1] : null
        const label = match ? part.replace(/\s*—\s*(High|Medium|Low)\s+confidence\s*$/i, '').trim() : part.trim()
        const color = confidence ? CONFIDENCE_COLORS[confidence] : '#6b7280'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#6366f1', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 13, color: '#a0a0cc', lineHeight: 1.6, flex: 1 }}>{label}</span>
            {confidence && (
              <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}22`, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
                {confidence}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CompanyDetail({ API, startup: s, onClose, onUpdate }) {
  const { getToken } = useAuth()
  const [notes, setNotes] = useState(startup.notes || '')
  const [pipelineStatus, setPipelineStatus] = useState(startup.pipeline_status || 'new')
  const [signals, setSignals] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [ddQuestions, setDdQuestions] = useState(null)
  const [ddLoading, setDdLoading] = useState(false)
  const [convictionScore, setConvictionScore] = useState(null)
  const [nextAction, setNextAction] = useState('')
  const [nextActionDue, setNextActionDue] = useState('')
  const [keyRisks, setKeyRisks] = useState('')
  const [bullCase, setBullCase] = useState('')
  const [meetingNotes, setMeetingNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [activityLog, setActivityLog] = useState([])
  const [toast, setToast] = useState(false)
  const [memo, setMemo] = useState(null)
  const [memoFiles, setMemoFiles] = useState([])
  const [memoGeneratedAt, setMemoGeneratedAt] = useState(null)
  const [memoLoading, setMemoLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showImportSummary, setShowImportSummary] = useState(false)
  const [importSummaryText, setImportSummaryText] = useState('')
  const [importingNote, setImportingNote] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [newContact, setNewContact] = useState({})
  const [showLogOutreach, setShowLogOutreach] = useState(false)
  const [newOutreach, setNewOutreach] = useState({})
  const [analyzing, setAnalyzing] = useState(false)
  const [startup, setStartup] = useState(s)

  const badge = startup.fit_score != null ? (FIT_BADGES[startup.fit_score] || FIT_BADGES[2]) : { label: 'Pending', color: '#555577', bg: '#1a1a2e' }

  const loadMemo = async (id) => {
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const startupId = id ?? startup.id
    try {
      const res = await axios.get(`${API}/memo/${startupId}`, { headers })
      setMemo(res.data.memo)
      setMemoFiles(res.data.memo_files || [])
      setMemoGeneratedAt(res.data.memo_generated_at)
      setBullCase(res.data.bull_case || '')
      setKeyRisks(res.data.key_risks || '')
    } catch (e) {}
  }

  const generateMemo = async () => {
    setMemoLoading(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.post(`${API}/memo/generate/${startup.id}`, null, { headers })
      setMemo(res.data.memo)
      setMemoGeneratedAt(res.data.generated_at)
      if (res.data.bull_case != null) setBullCase(res.data.bull_case)
      if (res.data.key_risks != null) setKeyRisks(res.data.key_risks)
      await loadMemo()
    } catch (e) {
      console.error(e)
    }
    setMemoLoading(false)
  }

  const uploadFile = async (file) => {
    setUploading(true)
    const token = await getToken().catch(() => null)
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const formData = new FormData()
      formData.append('file', file)
      await axios.post(`${API}/memo/upload/${startup.id}`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' }
      })
      await loadMemo()
    } catch (e) {
      console.error(e)
    }
    setUploading(false)
  }

  const deleteFile = async (filename) => {
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      await axios.delete(`${API}/memo/file/${startup.id}/${filename}`, { headers })
      await loadMemo()
    } catch (e) {}
  }

  useEffect(() => {
    if (!s?.id) return
    setStartup(s)
    setDdQuestions(null)
    setDdLoading(false)
    setNotes(s.notes || '')
    setPipelineStatus(s.pipeline_status || 'new')
    setConvictionScore(s.conviction_score || null)
    setNextAction(s.next_action || '')
    setNextActionDue(s.next_action_due || '')
    setKeyRisks(s.key_risks || '')
    setBullCase(s.bull_case || '')
    setMeetingNotes(s.meeting_notes || [])
    setActivityLog(s.activity_log || [])
    const fn = async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      try {
        const res = await axios.get(`${API}/signals/company/${s.id}`, { headers })
        setSignals(res.data.signals || [])
      } catch (_) {}
      loadMemo(s.id)
    }
    fn()
  }, [s])

  useEffect(() => {
    if (!s?.id) return
    const fn = async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.post(`${API}/signals/mark-seen/${s.id}`, null, { headers }).catch(() => {})
    }
    fn()
  }, [s?.id])

  useEffect(() => {
    if (startup.fit_score == null && !analyzing) {
      const analyze = async () => {
        setAnalyzing(true)
        try {
          const token = await getToken().catch(() => null)
          const headers = token ? { Authorization: `Bearer ${token}` } : {}
          const res = await axios.post(`${API}/startups/${startup.id}/analyze`, {}, { headers })
          setStartup(res.data)
          onUpdate && onUpdate(res.data)
        } catch (e) {
          console.error('Analysis failed:', e)
        }
        setAnalyzing(false)
      }
      analyze()
    }
  }, [startup.id])

  const save = async () => {
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      await axios.patch(`${API}/startups/${startup.id}`, { notes, pipeline_status: pipelineStatus }, { headers })
      setToast(true)
      setTimeout(() => setToast(false), 2000)
      onUpdate()
    } catch (e) {
      console.error(e)
    }
  }

  const saveChanges = async () => {
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const baseLog = Array.isArray(activityLog) ? activityLog : (Array.isArray(startup.activity_log) ? startup.activity_log : [])
      const log = [...baseLog]
      if (convictionScore !== startup.conviction_score && convictionScore != null) {
        log.push({
          action: 'conviction_updated',
          detail: `Conviction set to ${convictionScore}/5`,
          created_at: new Date().toISOString(),
        })
      }
      if (nextAction !== startup.next_action && nextAction) {
        log.push({
          action: 'next_action_set',
          detail: nextAction,
          created_at: new Date().toISOString(),
        })
      }
      await axios.patch(`${API}/startups/${startup.id}`, {
        pipeline_status: pipelineStatus,
        notes,
        conviction_score: convictionScore,
        next_action: nextAction,
        next_action_due: nextActionDue || null,
        meeting_notes: meetingNotes,
        activity_log: log,
      }, { headers })
      setActivityLog(log)
      setToast(true)
      setTimeout(() => setToast(false), 2000)
      onUpdate?.()
    } catch (e) {
      console.error(e)
    }
  }

  const generateDDQuestions = async () => {
    if (!s) return
    setDdLoading(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.post(`${API}/chat/`, {
        message: `Generate 5 sharp due diligence questions a VC analyst should ask the founder of ${startup.name} in a first call. ${startup.name} is: ${startup.one_liner}. Business model: ${startup.business_model || 'unknown'}. Target customer: ${startup.target_customer || 'unknown'}. Thesis fit reasoning: ${startup.fit_reasoning || 'unknown'}. Return ONLY a JSON array of 5 question strings, no other text.`,
        context: []
      }, { headers })
      const text = res.data.response || res.data.message || ''
      const clean = text.replace(/```json|```/g, '').trim()
      const questions = JSON.parse(clean)
      setDdQuestions(questions)
    } catch (e) {
      setDdQuestions(['Could not generate questions. Please try again.'])
    }
    setDdLoading(false)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555577', fontSize: 18, cursor: 'pointer', float: 'right', marginTop: -4 }}>✕</button>

          <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>{startup.name}</h2>
            <span style={{ padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
        <p style={{ fontSize: 13, color: '#8888aa', margin: 0, lineHeight: 1.5 }}>{(startup.enriched_one_liner || startup.one_liner)}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {startup.funding_stage && <Tag>{startup.funding_stage}</Tag>}
          {startup.sector && <Tag>{startup.sector}</Tag>}
          {startup.founding_year && <Tag>Founded {startup.founding_year}</Tag>}
          {startup.funding_amount_usd > 0 && <Tag>${(startup.funding_amount_usd / 1000000).toFixed(1)}M raised</Tag>}
        </div>
          {startup.website && (
            <a href={startup.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', marginTop: 8, display: 'block' }}>
              {startup.website} ↗
            </a>
          )}
        </div>

        <Divider />

        {analyzing && (
          <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 14, color: '#8888aa' }}>Analyzing this company against your mandate...</span>
            </div>
            <div style={{ height: 4, background: '#1a1a2e', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 4, animation: 'slide 1.8s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        <Section title="Thesis Fit" accent="#6366f1">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: badge.color }}>{startup.fit_score != null ? `${startup.fit_score}/5` : '—/5'}</div>
          <div style={{ flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${startup.fit_score != null ? (startup.fit_score / 5) * 100 : 0}%`, background: badge.color, borderRadius: 3 }} />
          </div>
        </div>
        <FitReasoningBullets text={startup.fit_reasoning} />
        </Section>

      <Divider />

        <Section title="Company Overview">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {startup.business_model && <InfoItem label="Business Model" value={startup.business_model} />}
          {startup.target_customer && <InfoItem label="Target Customer" value={startup.target_customer} />}
          {startup.team_size && <InfoItem label="Team Size" value={startup.team_size} />}
        </div>
        {startup.notable_traction && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: '#0f1a0f', borderRadius: 6, border: '1px solid #1a2e1a' }}>
            <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>TRACTION</div>
            <p style={{ fontSize: 13, color: '#a0a0cc', margin: 0 }}>{startup.notable_traction}</p>
          </div>
        )}
        </Section>

        {/* Research pending state */}
        {!startup.business_model && !startup.research_status && (
          <div style={{
            background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8,
            padding: '14px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ fontSize: 18 }}>🔍</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 2 }}>Autonomous research pending</div>
              <div style={{ fontSize: 11, color: '#3a3a5a' }}>Radar will visit this company's website tonight and generate a full research brief.</div>
            </div>
          </div>
        )}

        {startup.research_status === 'failed' && (
          <div style={{
            background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8,
            padding: '14px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ fontSize: 18 }}>⚠️</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 2 }}>Research failed</div>
              <div style={{ fontSize: 11, color: '#3a3a5a' }}>Could not access this company's website. Will retry on next cycle.</div>
            </div>
          </div>
        )}

        {startup.top_investors?.length > 0 && (
        <>
          <Divider />
            <Section title="Key Investors">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {startup.top_investors.map((inv, i) => (
                <span key={i} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 12, background: '#1a1a2e', color: '#a5b4fc', border: '1px solid #3730a3' }}>{inv}</span>
              ))}
            </div>
            </Section>
          </>
        )}

        {startup.thesis_tags?.length > 0 && (
        <>
          <Divider />
            <Section title="Thesis Tags">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {startup.thesis_tags.map((tag, i) => (
                <span key={i} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 12, background: '#1a0a2e', color: '#c4b5fd', border: '1px solid #4c1d95' }}>{tag}</span>
              ))}
            </div>
            </Section>
          </>
        )}

        {startup.recommended_next_step && (
        <>
          <Divider />
            <Section title="Recommended Next Step" accent="#10b981">
            <div style={{ padding: '12px 14px', background: '#061a10', borderRadius: 8, border: '1px solid #065f46' }}>
              <p style={{ fontSize: 13, color: '#6ee7b7', margin: 0, lineHeight: 1.5 }}>→ {startup.recommended_next_step}</p>
            </div>
            </Section>
          </>
        )}

        {signals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 12 }}>
            RECENT SIGNALS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {signals.slice(0, 5).map(signal => (
              <div key={signal.id} style={{
                background: '#0a0a14', border: '1px solid #1e1e2e',
                borderLeft: `3px solid ${signal.is_seen ? '#1e1e2e' : '#6366f1'}`,
                borderRadius: 8, padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{signal.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#c0c0e0', flex: 1 }}>{signal.title}</span>
                  <span style={{ fontSize: 10, color: '#3a3a5a', flexShrink: 0 }}>
                    {new Date(signal.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, paddingLeft: 22 }}>
                  {signal.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        <Divider />

        <Section title="VC Tracking">
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: '#555577', fontWeight: 600, display: 'block', marginBottom: 6 }}>PIPELINE STATUS</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['new', ...PIPELINE_STAGES].map(stage => (
                <button key={stage} onClick={() => setPipelineStatus(stage)} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
                  borderColor: pipelineStatus === stage ? '#6366f1' : '#2a2a4a',
                  background: pipelineStatus === stage ? '#1e1b4b' : 'transparent',
                  color: pipelineStatus === stage ? '#a5b4fc' : '#555577',
                  fontWeight: pipelineStatus === stage ? 600 : 400,
                }}>
                  {stage}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#555577', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOTES</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add your notes, next steps, or context..."
              style={{
                width: '100%', minHeight: 80, background: '#0f0f1a', border: '1px solid #2a2a4a',
                borderRadius: 7, color: '#c0c0e0', fontSize: 13, padding: '10px 12px',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>
          <button onClick={save} style={{
            marginTop: 10, padding: '8px 20px', borderRadius: 7, border: 'none',
            background: '#4f46e5', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer'
          }}>
            Save Changes
          </button>
        </Section>
        </div>

        <div style={{
          borderTop: '1px solid #1e1e2e',
          padding: '12px 16px',
          background: '#0d0d14',
          flexShrink: 0
        }}>
          <button onClick={() => setExpanded(true)} style={{
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            border: '1px solid #3730a3',
            background: 'linear-gradient(135deg, #1e1b4b, #2e1b4b)',
            color: '#a5b4fc',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}>
            <span>⤢</span> Open Full Memo
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(3,3,12,0.96)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 32, boxSizing: 'border-box'
        }}>
          <div style={{
            width: '100%', maxWidth: 1200, height: '100%', maxHeight: '100%',
            background: '#050510', borderRadius: 16, border: '1px solid #1e1e2e',
            display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            opacity: 1, transition: 'opacity 0.2s ease'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0ff' }}>{startup.name}</div>
                <div style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>{startup.one_liner}</div>
                {startup.website && (
                  <a href={startup.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                    🔗 {startup.website}
                  </a>
                )}
              </div>
              <button onClick={() => setExpanded(false)} style={{
                background: 'none', border: 'none', color: '#555577',
                fontSize: 20, cursor: 'pointer', padding: '4px 8px'
              }}>✕</button>
            </div>
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Left column */}
              <div style={{ width: '38%', borderRight: '1px solid #1e1e2e', padding: '32px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>{startup.name}</h2>
                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#8888aa', margin: '0 0 10px' }}>{startup.one_liner}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {startup.funding_stage && <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, background: '#1a1a2e', color: '#6b7280' }}>{startup.funding_stage}</span>}
                    {startup.funding_amount_usd && <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, background: '#1a1a2e', color: '#6b7280' }}>${(startup.funding_amount_usd / 1000000).toFixed(1)}M raised</span>}
                    {startup.founding_year && <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, background: '#1a1a2e', color: '#6b7280' }}>Founded {startup.founding_year}</span>}
                  </div>
                  {startup.website && (
                    <a href={startup.website} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', display: 'block', marginTop: 8 }}>
                      🔗 {startup.website}
                    </a>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>THESIS FIT</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: badge.color, marginBottom: 8 }}>{startup.fit_score != null ? `${startup.fit_score}/5` : '—/5'}</div>
                  <div style={{ height: 4, background: '#1e1e2e', borderRadius: 2, marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${startup.fit_score != null ? (startup.fit_score / 5) * 100 : 0}%`, background: badge.color, borderRadius: 2 }} />
                  </div>
                  <FitReasoningBullets text={startup.fit_reasoning} />
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>MY CONVICTION</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setConvictionScore(n)}
                        style={{
                          width: 36, height: 36, borderRadius: 8, border: '1px solid',
                          borderColor: convictionScore === n ? '#6366f1' : '#2a2a4a',
                          background: convictionScore === n ? '#1e1b4b' : 'transparent',
                          color: convictionScore === n ? '#a5b4fc' : '#555577',
                          fontSize: 14, fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {convictionScore && (
                    <div style={{ fontSize: 11, color: '#555577', marginTop: 6 }}>
                      {convictionScore === 5 ? 'Highest conviction — flag for IC' :
                        convictionScore === 4 ? 'Strong — move to diligence' :
                          convictionScore === 3 ? 'Interesting — keep watching' :
                            convictionScore === 2 ? 'Lukewarm — low priority' : 'Pass'}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>NEXT ACTION</div>
                  <input
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    placeholder="e.g. Request intro via Bessemer"
                    style={{ width: '100%', background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 7, color: '#c0c0e0', fontSize: 12, padding: '8px 12px', boxSizing: 'border-box', marginBottom: 8, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                  <input
                    type="date"
                    value={nextActionDue}
                    onChange={e => setNextActionDue(e.target.value)}
                    style={{ width: '100%', background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 7, color: '#c0c0e0', fontSize: 12, padding: '8px 12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>

                {startup.recommended_next_step && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>RECOMMENDED NEXT STEP</div>
                    <div style={{ background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#86efac' }}>
                      → {startup.recommended_next_step}
                    </div>
                  </div>
                )}

                {signals.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>RECENT SIGNALS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {signals.map(signal => (
                        <div key={signal.id} style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderLeft: `3px solid ${signal.is_seen ? '#1e1e2e' : '#6366f1'}`, borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14 }}>{signal.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#c0c0e0', flex: 1 }}>{signal.title}</span>
                            <span style={{ fontSize: 10, color: '#3a3a5a' }}>
                              {new Date(signal.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, paddingLeft: 22 }}>{signal.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={saveChanges}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Changes
                </button>
              </div>
              {/* Right column */}
              <div style={{ flexBasis: '60%', maxWidth: '60%', padding: '18px 20px', overflow: 'auto' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['overview', 'memo', 'signals', 'outreach'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '6px 12px', borderRadius: 999, border: '1px solid',
                        borderColor: activeTab === tab ? '#6366f1' : '#2a2a4a',
                        background: activeTab === tab ? '#1e1b4b' : 'transparent',
                        color: activeTab === tab ? '#a5b4fc' : '#8888aa',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.6px'
                      }}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Section title="Company Overview">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {startup.business_model && <InfoItem label="Business Model" value={startup.business_model} />}
                        {startup.target_customer && <InfoItem label="Target Customer" value={startup.target_customer} />}
                        {startup.team_size && <InfoItem label="Team Size" value={startup.team_size} />}
                      </div>
                    </Section>
                    {startup.top_investors?.length > 0 && (
                      <Section title="Key Investors">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {startup.top_investors.map((inv, i) => (
                            <span key={i} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 12, background: '#1a1a2e', color: '#a5b4fc', border: '1px solid #3730a3' }}>{inv}</span>
                          ))}
                        </div>
                      </Section>
                    )}
                    {startup.thesis_tags?.length > 0 && (
                      <Section title="Thesis Tags">
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {startup.thesis_tags.map((tag, i) => (
                            <span key={i} style={{ padding: '3px 9px', borderRadius: 5, fontSize: 12, background: '#1a0a2e', color: '#c4b5fd', border: '1px solid #4c1d95' }}>{tag}</span>
                          ))}
                        </div>
                      </Section>
                    )}
                    {Array.isArray(startup.comparable_companies) && startup.comparable_companies.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 12 }}>COMPARABLE COMPANIES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {startup.comparable_companies.map((c, i) => (
                            <div key={i} style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>{c.name}</div>
                                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.one_liner}</div>
                                </div>
                                <span style={{ fontSize: 10, color: '#6366f1', background: '#1e1b4b', padding: '2px 8px', borderRadius: 4, fontWeight: 600, flexShrink: 0 }}>
                                  Fit {c.fit_score}/5
                                </span>
                              </div>
                              {c.differentiation && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 2 }}>Differentiation</div>
                                  <div style={{ fontSize: 11, color: '#c4b5fd', lineHeight: 1.5 }}>{c.differentiation}</div>
                                </div>
                              )}
                              {c.reason_investor_might_prefer && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 2 }}>Why prefer this</div>
                                  <div style={{ fontSize: 11, color: '#10b981', lineHeight: 1.5 }}>{c.reason_investor_might_prefer}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'memo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Traction Signals */}
                    {startup.traction_signals && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', letterSpacing: 0.5, marginBottom: 10 }}>
                          ⚡ TRACTION SIGNALS
                        </div>
                        <div style={{
                          background: '#0a1a0f', border: '1px solid #10b98130',
                          borderRadius: 8, padding: '14px 16px'
                        }}>
                          <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.7 }}>{startup.traction_signals}</div>
                        </div>
                      </div>
                    )}

                    {/* Red Flags */}
                    {startup.red_flags && startup.red_flags !== 'None identified' && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', letterSpacing: 0.5, marginBottom: 10 }}>
                          ⚠ RED FLAGS
                        </div>
                        <div style={{
                          background: '#1a0a0a', border: '1px solid #ef444430',
                          borderRadius: 8, padding: '14px 16px'
                        }}>
                          <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.7 }}>{startup.red_flags}</div>
                        </div>
                      </div>
                    )}

                    {/* Research pending state */}
                    {!startup.business_model && !startup.research_status && (
                      <div style={{
                        background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8,
                        padding: '16px', display: 'flex', alignItems: 'center', gap: 10
                      }}>
                        <div style={{ fontSize: 20 }}>🔍</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', marginBottom: 4 }}>
                            Autonomous research pending
                          </div>
                          <div style={{ fontSize: 12, color: '#3a3a5a' }}>
                            Radar will visit this company's website tonight and generate a full research brief.
                          </div>
                        </div>
                      </div>
                    )}

                    {startup.research_status === 'failed' && (
                      <div style={{
                        background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8,
                        padding: '16px', display: 'flex', alignItems: 'center', gap: 10
                      }}>
                        <div style={{ fontSize: 20 }}>⚠️</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>
                            Research failed
                          </div>
                          <div style={{ fontSize: 12, color: '#3a3a5a' }}>
                            Could not access this company's website. Will retry on next cycle.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Research badge */}
                    {startup.research_completed_at && (
                      <div style={{ marginTop: 16, fontSize: 11, color: '#3a3a5a', textAlign: 'right' }}>
                        🤖 Autonomously researched by Radar · {new Date(startup.research_completed_at).toLocaleDateString()}
                      </div>
                    )}

                    {/* File Upload Zone */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 10 }}>DOCUMENTS</div>
                      <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault()
                          const file = e.dataTransfer.files[0]
                          if (file) uploadFile(file)
                        }}
                        onClick={() => document.getElementById(`file-input-${startup.id}`).click()}
                        style={{
                          border: '2px dashed #2a2a4a', borderRadius: 10, padding: '20px',
                          textAlign: 'center', cursor: 'pointer', background: '#0a0a14',
                          color: '#555577', fontSize: 12, transition: 'border-color 0.2s'
                        }}
                      >
                        {uploading ? '⏳ Uploading...' : '📎 Drop files here or click to upload (PDF, TXT, MD)'}
                        <input
                          id={`file-input-${startup.id}`}
                          type="file"
                          accept=".pdf,.txt,.md"
                          style={{ display: 'none' }}
                          onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0]) }}
                        />
                      </div>
                      {memoFiles.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {memoFiles.map((f, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 7,
                              padding: '8px 12px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>📄</span>
                                <div>
                                  <div style={{ fontSize: 12, color: '#c0c0e0', fontWeight: 500 }}>{f.original_name || f.name}</div>
                                  <div style={{ fontSize: 10, color: '#555577' }}>
                                    {(f.size / 1024).toFixed(1)} KB · {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString() : ''}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => deleteFile(f.name)} style={{
                                background: 'none', border: 'none', color: '#555577',
                                cursor: 'pointer', fontSize: 14, padding: '2px 6px'
                              }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Generate Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px' }}>INVESTMENT MEMO</div>
                        {memoGeneratedAt && (
                          <div style={{ fontSize: 10, color: '#555577', marginTop: 2 }}>
                            Generated {new Date(memoGeneratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={generateMemo}
                        disabled={memoLoading}
                        style={{
                          padding: '7px 16px', borderRadius: 7, border: 'none',
                          background: memoLoading ? '#2a2a4a' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                          color: memoLoading ? '#555577' : '#fff',
                          fontSize: 12, fontWeight: 600, cursor: memoLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {memoLoading ? '✦ Writing memo...' : memo ? '↻ Regenerate' : '✦ Generate Memo'}
                      </button>
                    </div>

                    {/* Memo Content */}
                    {memoLoading && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#555577' }}>
                        <div style={{ fontSize: 24, marginBottom: 12 }}>✦</div>
                        <div style={{ fontSize: 13 }}>Claude is writing your investment memo...</div>
                        <div style={{ fontSize: 11, marginTop: 6, color: '#3a3a5a' }}>This takes about 15 seconds</div>
                      </div>
                    )}

                    {!memoLoading && memo && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {memo.split('\n## ').filter(Boolean).map((section, i) => {
                          const lines = section.replace(/^## /, '').split('\n')
                          const title = lines[0]
                          const body = lines.slice(1).join('\n').trim()
                          const isRecommendation = title.toLowerCase().includes('recommendation')
                          const isRisk = title.toLowerCase().includes('risk')
                          return (
                            <div key={i} style={{
                              background: isRecommendation ? '#061a10' : isRisk ? '#1a0a0a' : '#0a0a14',
                              border: `1px solid ${isRecommendation ? '#065f46' : isRisk ? '#3a1010' : '#1e1e2e'}`,
                              borderRadius: 10, padding: '14px 16px'
                            }}>
                              <div style={{
                                fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', marginBottom: 8,
                                color: isRecommendation ? '#10b981' : isRisk ? '#ef4444' : '#6366f1'
                              }}>
                                {title.toUpperCase()}
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
                                }}>
                                  {body}
                                </Markdown>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {!memoLoading && !memo && (
                      <div style={{
                        textAlign: 'center', padding: '40px 20px', color: '#555577',
                        border: '1px dashed #1e1e2e', borderRadius: 10, background: '#0a0a14'
                      }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>No memo generated yet</div>
                        <div style={{ fontSize: 11, color: '#3a3a5a' }}>Upload documents and click Generate Memo to create an AI investment memo</div>
                      </div>
                    )}

                  </div>
                )}
                {activeTab === 'signals' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {signals.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#555577', fontSize: 13 }}>No signals detected yet</div>
                    ) : signals.map(signal => (
                      <div key={signal.id} style={{
                        background: '#0a0a14', border: '1px solid #1e1e2e',
                        borderLeft: `3px solid ${signal.is_seen ? '#1e1e2e' : '#6366f1'}`,
                        borderRadius: 8, padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{signal.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#c0c0e0', flex: 1 }}>{signal.title}</span>
                          <span style={{ fontSize: 11, color: '#3a3a5a' }}>
                            {new Date(signal.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, paddingLeft: 24 }}>{signal.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'outreach' && (
                  <div>
                    {/* MEETING NOTES */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 12 }}>MEETING NOTES</div>

                      {/* Import Summary Button */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <button
                          onClick={() => setShowImportSummary(v => !v)}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✦ Import Meeting Summary
                        </button>
                      </div>

                      {/* Import Summary Panel */}
                      {showImportSummary && (
                        <div style={{ background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                          <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 8 }}>Paste your meeting summary from Fireflies, Otter, or your own notes — Claude will structure it.</div>
                          <textarea
                            value={importSummaryText}
                            onChange={e => setImportSummaryText(e.target.value)}
                            placeholder="Paste meeting summary here..."
                            style={{ width: '100%', minHeight: 100, background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, padding: '10px 12px', resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
                          />
                          <button
                            onClick={async () => {
                              if (!importSummaryText.trim()) return
                              setImportingNote(true)
                              try {
                                const token = await getToken().catch(() => null)
                                const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                const res = await axios.post(`${API}/startups/${startup.id}/import-meeting`, { summary: importSummaryText }, { headers })
                                const structured = res.data.note
                                const note = { note: structured, created_at: new Date().toISOString(), source: 'import' }
                                const updated = [note, ...(Array.isArray(meetingNotes) ? meetingNotes : [])]
                                setMeetingNotes(updated)
                                await axios.patch(`${API}/startups/${startup.id}`, { meeting_notes: updated }, { headers })
                                setImportSummaryText('')
                                setShowImportSummary(false)
                              } catch(e) { console.error(e) }
                              setImportingNote(false)
                            }}
                            disabled={importingNote}
                            style={{ marginTop: 8, padding: '7px 14px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 600, cursor: importingNote ? 'not-allowed' : 'pointer', opacity: importingNote ? 0.6 : 1 }}
                          >
                            {importingNote ? 'Processing...' : 'Structure with Claude'}
                          </button>
                        </div>
                      )}

                      {/* Manual Note Input */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <textarea
                          value={newNote}
                          onChange={e => setNewNote(e.target.value)}
                          placeholder="Add a note from your call, meeting, or research..."
                          style={{ flex: 1, minHeight: 72, background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 8, color: '#c0c0e0', fontSize: 12, padding: '10px 12px', resize: 'none', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                        />
                        <button
                          onClick={() => {
                            if (!newNote.trim()) return
                            const note = { note: newNote.trim(), created_at: new Date().toISOString() }
                            const updated = [note, ...(Array.isArray(meetingNotes) ? meetingNotes : [])]
                            setMeetingNotes(updated)
                            setNewNote('')
                            getToken().catch(() => null).then(token => {
                              const headers = token ? { Authorization: `Bearer ${token}` } : {}
                              return axios.patch(`${API}/startups/${startup.id}`, { meeting_notes: updated }, { headers })
                            }).catch(() => {})
                          }}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-end' }}
                        >
                          Add
                        </button>
                      </div>

                      {/* Notes List */}
                      {(!meetingNotes || meetingNotes.length === 0) ? (
                        <div style={{ fontSize: 12, color: '#555577' }}>No notes yet — add your first note above</div>
                      ) : meetingNotes.map((n, i) => (
                        <div key={i} style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8, padding: '12px 14px', marginBottom: 8, position: 'relative' }}>
                          {n.source === 'import' && (
                            <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>✦ Imported</div>
                          )}
                          <div style={{ fontSize: 13, color: '#c0c0e0', lineHeight: 1.6, marginBottom: 6, whiteSpace: 'pre-wrap' }}>{n.note}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: '#3a3a5a' }}>
                              {n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                            <button
                              onClick={() => {
                                const updated = meetingNotes.filter((_, idx) => idx !== i)
                                setMeetingNotes(updated)
                                getToken().catch(() => null).then(token => {
                                  const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                  return axios.patch(`${API}/startups/${startup.id}`, { meeting_notes: updated }, { headers })
                                }).catch(() => {})
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3a3a5a', fontSize: 11, cursor: 'pointer', padding: '2px 6px' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FOUNDER CONTACTS */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 12 }}>FOUNDER CONTACTS</div>
                      {Array.isArray(startup.founder_contacts) && startup.founder_contacts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {startup.founder_contacts.map((contact, i) => (
                            <div key={i} style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>{contact.name}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                  {contact.role}{contact.email && ` · ${contact.email}`}{contact.linkedin && ` · `}
                                  {contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: 11 }}>LinkedIn</a>}
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  const updated = startup.founder_contacts.filter((_, idx) => idx !== i)
                                  const token = await getToken().catch(() => null)
                                  const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                  await axios.patch(`${API}/startups/${startup.id}`, { founder_contacts: updated }, { headers })
                                  onUpdate && onUpdate({ ...s, founder_contacts: updated })
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#3a3a5a', fontSize: 11, cursor: 'pointer' }}
                              >Delete</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add Contact Form */}
                      {showAddContact ? (
                        <div style={{ background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 8, padding: 14, marginBottom: 8 }}>
                          {[['contactName', 'Name *'], ['contactRole', 'Role'], ['contactEmail', 'Email'], ['contactLinkedin', 'LinkedIn URL']].map(([key, placeholder]) => (
                            <input
                              key={key}
                              value={newContact[key] || ''}
                              onChange={e => setNewContact(v => ({ ...v, [key]: e.target.value }))}
                              placeholder={placeholder}
                              style={{ width: '100%', marginBottom: 8, padding: '8px 10px', background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                            />
                          ))}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={async () => {
                                if (!newContact.contactName?.trim()) return
                                const contact = { name: newContact.contactName, role: newContact.contactRole, email: newContact.contactEmail, linkedin: newContact.contactLinkedin }
                                const updated = [...(Array.isArray(startup.founder_contacts) ? startup.founder_contacts : []), contact]
                                const token = await getToken().catch(() => null)
                                const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                await axios.patch(`${API}/startups/${startup.id}`, { founder_contacts: updated }, { headers })
                                onUpdate && onUpdate({ ...s, founder_contacts: updated })
                                setNewContact({})
                                setShowAddContact(false)
                              }}
                              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >Save</button>
                            <button onClick={() => { setShowAddContact(false); setNewContact({}) }} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddContact(true)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          + Add Contact
                        </button>
                      )}
                    </div>

                    {/* OUTREACH LOG */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 12 }}>OUTREACH LOG</div>
                      {showLogOutreach ? (
                        <div style={{ background: '#0a0a14', border: '1px solid #2a2a4a', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                          <select
                            value={newOutreach.type || 'email'}
                            onChange={e => setNewOutreach(v => ({ ...v, type: e.target.value }))}
                            style={{ width: '100%', marginBottom: 8, padding: '8px 10px', background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, outline: 'none' }}
                          >
                            {['Email', 'Call', 'Meeting', 'Intro Request', 'LinkedIn', 'Other'].map(t => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                          </select>
                          <input
                            type="date"
                            value={newOutreach.date || new Date().toISOString().split('T')[0]}
                            onChange={e => setNewOutreach(v => ({ ...v, date: e.target.value }))}
                            style={{ width: '100%', marginBottom: 8, padding: '8px 10px', background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                          />
                          <input
                            value={newOutreach.outcome || ''}
                            onChange={e => setNewOutreach(v => ({ ...v, outcome: e.target.value }))}
                            placeholder="Outcome (e.g. No reply, Intro made, Call scheduled)"
                            style={{ width: '100%', marginBottom: 8, padding: '8px 10px', background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                          />
                          <textarea
                            value={newOutreach.notes || ''}
                            onChange={e => setNewOutreach(v => ({ ...v, notes: e.target.value }))}
                            placeholder="Notes..."
                            style={{ width: '100%', minHeight: 60, marginBottom: 8, padding: '8px 10px', background: '#13131f', border: '1px solid #2a2a4a', borderRadius: 6, color: '#c0c0e0', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={async () => {
                                const entry = { type: newOutreach.type || 'email', date: newOutreach.date || new Date().toISOString().split('T')[0], outcome: newOutreach.outcome, notes: newOutreach.notes, logged_at: new Date().toISOString() }
                                const current = Array.isArray(activityLog) ? activityLog : []
                                const updated = [entry, ...current]
                                setActivityLog(updated)
                                const token = await getToken().catch(() => null)
                                const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                await axios.patch(`${API}/startups/${startup.id}`, { activity_log: updated }, { headers })
                                setNewOutreach({})
                                setShowLogOutreach(false)
                              }}
                              style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >Log</button>
                            <button onClick={() => { setShowLogOutreach(false); setNewOutreach({}) }} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: '#8888aa', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowLogOutreach(true)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #2a2a4a', background: 'transparent', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
                          + Log Outreach
                        </button>
                      )}
                      {Array.isArray(activityLog) && activityLog.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {activityLog.map((entry, i) => (
                            <div key={i} style={{ background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'capitalize' }}>{entry.type}</span>
                                  {entry.outcome && <span style={{ fontSize: 11, color: '#8888aa' }}>· {entry.outcome}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ fontSize: 10, color: '#3a3a5a' }}>{entry.date || (entry.logged_at ? new Date(entry.logged_at).toLocaleDateString() : '')}</span>
                                  <button
                                    onClick={async () => {
                                      const updated = activityLog.filter((_, idx) => idx !== i)
                                      setActivityLog(updated)
                                      const token = await getToken().catch(() => null)
                                      const headers = token ? { Authorization: `Bearer ${token}` } : {}
                                      await axios.patch(`${API}/startups/${startup.id}`, { activity_log: updated }, { headers })
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#3a3a5a', fontSize: 11, cursor: 'pointer' }}
                                  >Delete</button>
                                </div>
                              </div>
                              {entry.notes && <div style={{ fontSize: 12, color: '#c0c0e0', lineHeight: 1.5 }}>{entry.notes}</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#555577' }}>No outreach logged yet</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#10b981', color: '#fff',
          padding: '10px 18px', borderRadius: 8,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 99999
        }}>
          ✓ Changes saved
        </div>,
        document.body
      )}
    </>
  )
}

const Section = ({ title, children, accent = '#3730a3' }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.8px', marginBottom: 10 }}>{title.toUpperCase()}</div>
    {children}
  </div>
)

const Divider = () => <div style={{ height: 1, background: '#1e1e2e', margin: '16px 0' }} />

const Tag = ({ children }) => (
  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>{children}</span>
)

const InfoItem = ({ label, value }) => (
  <div style={{ padding: '8px 10px', background: '#0f0f1a', borderRadius: 6, border: '1px solid #1e1e2e' }}>
    <div style={{ fontSize: 10, color: '#555577', fontWeight: 600, marginBottom: 3 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 13, color: '#c0c0e0' }}>{value}</div>
  </div>
)