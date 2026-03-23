import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const STAGE_COLORS = {
  watching: '#6366f1', outreach: '#f59e0b', diligence: '#10b981', passed: '#6b7280', invested: '#8b5cf6'
}

const FIT_BADGES = {
  5: { label: 'Top Match', color: '#10b981', bg: '#052e16' },
  4: { label: 'Strong Fit', color: '#6366f1', bg: '#1e1b4b' },
  3: { label: 'Possible Fit', color: '#f59e0b', bg: '#1c1a00' },
}

const SIGNAL_ICONS = {
  funding_round: '🟢',
  product_launch: '🚀',
  headcount_growth: '📈',
  news_mention: '📰',
  leadership_change: '👤',
  traction_update: '⚡',
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function isNewThisWeek(scraped_at) {
  if (!scraped_at) return false
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return new Date(scraped_at) >= sevenDaysAgo
}

const SECTION_LABEL = {
  fontSize: 11, fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.8px',
}

export default function Home({ API, firmProfile, onNavigate }) {
  const { getToken } = useAuth()
  const [digestExpanded, setDigestExpanded] = useState(true)

  const { data: topMatches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['startups', { min_fit_score: 5 }],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/startups/`, { params: { sort: 'fit_score', limit: 20, min_fit_score: 5 }, headers })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['startups', { min_fit_score: 1 }],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/startups/`, { params: { sort: 'fit_score', limit: 200, min_fit_score: 1 }, headers })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: pipelineData = {}, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/pipeline/`, { headers })
      return res.data
    },
    staleTime: 1000 * 60 * 2,
  })

  const { data: feedData = {}, isLoading: feedLoading } = useQuery({
    queryKey: ['signals-feed'],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/signals/feed`, { params: { days: 7, limit: 20 }, headers })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

  const { data: lastScrape, isLoading: lastScrapeLoading } = useQuery({
    queryKey: ['last-scrape'],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/startups/last-scrape`, { headers })
      return res.data
    },
    staleTime: 1000 * 60 * 10,
  })

  const pipeline = pipelineData
  const pipelineSignals = (feedData.feed || []).slice(0, 5)
  const newCompanies = lastScrape?.companies || []
  const lastScrapedAt = lastScrape?.last_scraped_at ?? null
  const digestLoading = pipelineLoading || feedLoading || lastScrapeLoading
  const totalInPipeline = Object.values(pipeline).reduce((acc, arr) => acc + (arr?.length || 0), 0)
  const firmName = firmProfile?.firm_name || 'your firm'
  const newThisWeek = allCompanies.filter(s => isNewThisWeek(s.scraped_at) && s.fit_score >= 4).length
  const totalTopMatches = allCompanies.filter(s => s.fit_score === 5).length
  const hasDigestContent = newCompanies.length > 0 || pipelineSignals.length > 0

  // TODAY'S AGENDA
  const agendaItems = []

  // Priority 1 — diligence companies with signals this week (high, red)
  const diligenceNames = new Set((pipeline.diligence || []).map(c => c.name))
  const seenDiligence = new Set()
  ;(feedData.feed || []).filter(sig => diligenceNames.has(sig.company_name)).forEach(sig => {
    if (!seenDiligence.has(sig.company_name)) {
      seenDiligence.add(sig.company_name)
      agendaItems.push({
        label: `${sig.company_name} — new signal detected`,
        urgencyColor: '#ef4444',
        nav: () => onNavigate('pipeline', { id: sig.startup_id }, 'company_signal'),
      })
    }
  })

  // Priority 2 — stale pipeline deals (medium, amber)
  const staleCutoff = Date.now() - 14 * 86400000
  ;[...(pipeline.watching || []), ...(pipeline.outreach || []), ...(pipeline.diligence || [])].forEach(c => {
    const lastActivity = c.updated_at || c.created_at
    const isStale = !lastActivity || new Date(lastActivity).getTime() < staleCutoff
    if (isStale) {
      const daysOld = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : null
      agendaItems.push({
        label: `${c.name} — ${daysOld ? `no activity in ${daysOld} days` : 'no activity recorded'}`,
        urgencyColor: '#f59e0b',
        nav: () => onNavigate('pipeline'),
      })
    }
  })

  // Priority 3 — unreviewed inbound pitches (low, purple)
  allCompanies
    .filter(s => ['email_pitch', 'email_intro'].includes(s.source) && s.pipeline_status === 'new')
    .forEach(s => {
      agendaItems.push({
        label: `${s.name} — inbound pitch, unreviewed`,
        urgencyColor: '#8b5cf6',
        nav: () => onNavigate('coverage', s),
      })
    })

  // Priority 4 — top untracked matches (fit_score >= 4, not in pipeline)
  const pipelineCompanyNames = new Set([
    ...(pipeline.watching || []),
    ...(pipeline.outreach || []),
    ...(pipeline.diligence || []),
    ...(pipeline.passed || []),
    ...(pipeline.invested || []),
  ].map(c => c.name))
  allCompanies
    .filter(s => s.fit_score >= 4 && !pipelineCompanyNames.has(s.name))
    .slice(0, 2)
    .forEach(s => {
      agendaItems.push({
        label: `${s.name} — strong fit, not yet tracked`,
        urgencyColor: '#6366f1',
        nav: () => onNavigate('coverage', s),
      })
    })

  const agendaTop = agendaItems.slice(0, 4)

  return (
    <div style={{ padding: '36px 40px', overflow: 'auto', height: '100%' }}>

      {/* HEADER */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: '#555577', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{formatDate()}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f0f0ff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          {getGreeting()}, {firmName} ◈
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Here's what's happening in your deal flow today.</p>
      </div>

      {/* TODAY'S AGENDA */}
      {agendaTop.length > 0 && (
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ ...SECTION_LABEL, marginBottom: 14 }}>Today's Agenda</div>
          {agendaTop.map((item, idx) => (
            <div
              key={idx}
              onClick={item.nav}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0',
                borderBottom: idx < agendaTop.length - 1 ? '1px solid #1a1a2e' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.urgencyColor, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: '#d0d0e8', flex: 1 }}>{item.label}</div>
              <span style={{ fontSize: 13, color: item.urgencyColor }}>→</span>
            </div>
          ))}
        </div>
      )}

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="In Pipeline" value={totalInPipeline} sub="active deals" color="#6366f1" />
        <StatCard label="New This Week" value={newThisWeek} sub="top and strong fits added" color="#10b981" />
        <StatCard label="Top Matches" value={totalTopMatches} sub="fit your mandate exactly" color="#8b5cf6" />
        <StatCard label="In Diligence" value={pipeline.diligence?.length || 0} sub="needs attention" color="#10b981" />
      </div>

      {/* WHAT'S NEW DIGEST */}
      <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
        <div
          onClick={() => setDigestExpanded(e => !e)}
          style={{
            padding: '16px 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', cursor: 'pointer',
            borderBottom: digestExpanded ? '1px solid #1e1e2e' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: hasDigestContent ? '#10b981' : '#3a3a5a',
              boxShadow: hasDigestContent ? '0 0 6px #10b981' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0ff' }}>What's New</span>
            <span style={{ fontSize: 12, color: '#555577' }}>
              {lastScrapedAt ? `Last scrape: ${formatTimeAgo(lastScrapedAt)}` : 'Latest scrape'}
            </span>
            {!digestLoading && hasDigestContent && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#1e1b4b', color: '#6366f1', padding: '2px 8px', borderRadius: 10 }}>
                {newCompanies.length + pipelineSignals.length} updates
              </span>
            )}
          </div>
          <span style={{ color: '#555577', fontSize: 11 }}>{digestExpanded ? '▲' : '▼'}</span>
        </div>

        {digestExpanded && (
          digestLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#555577', fontSize: 13 }}>Checking for updates...</div>
          ) : !hasDigestContent ? (
            <div style={{ padding: '28px', textAlign: 'center', color: '#555577' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 13 }}>You're all caught up — nothing new from the latest scrape</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: newCompanies.length > 0 && pipelineSignals.length > 0 ? '1fr 1fr' : '1fr',
            }}>
              {newCompanies.length > 0 && (
                <div style={{ padding: '16px 24px', borderRight: pipelineSignals.length > 0 ? '1px solid #1e1e2e' : 'none' }}>
                  <div style={{ ...SECTION_LABEL, color: '#10b981', marginBottom: 12 }}>
                    🆕 {newCompanies.length} NEW {newCompanies.length === 1 ? 'COMPANY' : 'COMPANIES'} ADDED
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {newCompanies.map(s => {
                      const badge = FIT_BADGES[s.fit_score] || FIT_BADGES[3]
                      return (
                        <div key={s.id} onClick={() => onNavigate('coverage', s)} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: '#0a0a14', border: '1px solid #1a1a2e',
                          borderLeft: `3px solid ${badge.color}`, cursor: 'pointer',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0ff' }}>{s.name}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: badge.color, background: badge.bg, padding: '1px 5px', borderRadius: 3 }}>{badge.label}</span>
                              {s.funding_stage && <span style={{ fontSize: 9, color: '#6b7280', background: '#1a1a2e', padding: '1px 5px', borderRadius: 3 }}>{s.funding_stage}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#8888aa', lineHeight: 1.4 }}>{s.one_liner}</div>
                          </div>
                          <div style={{ fontSize: 10, color: '#3a3a5a', whiteSpace: 'nowrap', marginTop: 2 }}>{formatTimeAgo(s.scraped_at)}</div>
                        </div>
                      )
                    })}
                  </div>
                  {newCompanies.length >= 8 && (
                    <button onClick={() => onNavigate('coverage')} style={{ marginTop: 10, fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      View all new companies →
                    </button>
                  )}
                </div>
              )}

              {pipelineSignals.length > 0 && (
                <div style={{ padding: '16px 24px' }}>
                  <div style={{ ...SECTION_LABEL, color: '#f59e0b', marginBottom: 12 }}>
                    📡 {pipelineSignals.length} NEW {pipelineSignals.length === 1 ? 'SIGNAL' : 'SIGNALS'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pipelineSignals.map(sig => (
                      <div key={sig.id} onClick={() => onNavigate('pipeline', { id: sig.startup_id }, 'company_signal')} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '10px 12px', borderRadius: 8,
                        background: '#0a0a14', border: '1px solid #1a1a2e', cursor: 'pointer',
                      }}>
                        <div style={{ fontSize: 16, flexShrink: 0 }}>{SIGNAL_ICONS[sig.signal_type] || '📡'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f0f0ff', marginBottom: 2 }}>{sig.company_name}</div>
                          <div style={{ fontSize: 11, color: '#c0c0e0', lineHeight: 1.4 }}>{sig.title}</div>
                          {sig.summary && <div style={{ fontSize: 11, color: '#555577', lineHeight: 1.4, marginTop: 2 }}>{sig.summary}</div>}
                        </div>
                        <div style={{ fontSize: 10, color: '#3a3a5a', whiteSpace: 'nowrap', marginTop: 2 }}>{formatTimeAgo(sig.detected_at)}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => onNavigate('pipeline')} style={{ marginTop: 10, fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    View full activity feed →
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* PIPELINE */}
      <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...SECTION_LABEL, marginBottom: 3 }}>Pipeline</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0ff' }}>{totalInPipeline} Active Deals</div>
        </div>
        {totalInPipeline === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#555577' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>No deals in pipeline yet</div>
            <button onClick={() => onNavigate('coverage')} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Browse Coverage to add deals →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(STAGE_COLORS).map(([stage, color]) => {
              const count = pipeline[stage]?.length || 0
              const max = Math.max(...Object.values(pipeline).map(arr => arr?.length || 0), 1)
              return (
                <div key={stage} onClick={() => onNavigate('pipeline')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#8888aa', textTransform: 'capitalize' }}>{stage}</span>
                    <span style={{ fontSize: 12, color: count > 0 ? color : '#3a3a5a', fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 4, background: '#1e1e2e', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {totalInPipeline > 0 && (
          <button onClick={() => onNavigate('pipeline')} style={{ marginTop: 16, width: '100%', padding: '8px', borderRadius: 7, border: '1px solid #2a2a4a', background: 'transparent', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            View Full Pipeline →
          </button>
        )}
      </div>

      {/* TOP MATCHES */}
      <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ ...SECTION_LABEL, marginBottom: 3 }}>Top Matches</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0ff' }}>Highest conviction companies in your mandate</div>
          </div>
          <button onClick={() => onNavigate('coverage')} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
        </div>
        {loadingMatches ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#555577', fontSize: 13 }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {topMatches.slice(0, 4).map(s => {
              const badge = FIT_BADGES[s.fit_score] || FIT_BADGES[3]
              const showNew = isNewThisWeek(s.scraped_at)
              return (
                <div key={s.id} onClick={() => onNavigate('coverage', s)} style={{
                  background: '#0a0a14', border: '1px solid #1e1e2e', borderRadius: 9,
                  padding: '14px', cursor: 'pointer', borderTop: `2px solid ${badge.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#f0f0ff' }}>{s.name}</div>
                    {showNew && <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: '#052e16', padding: '2px 5px', borderRadius: 3, letterSpacing: '0.5px', flexShrink: 0, marginLeft: 6 }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#8888aa', lineHeight: 1.4, marginBottom: 10 }}>{s.one_liner}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, background: badge.bg, color: badge.color, fontWeight: 600 }}>{badge.label}</span>
                    {s.funding_stage && <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280' }}>{s.funding_stage}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px 20px' }}>
    <div style={{ fontSize: 11, color: '#555577', fontWeight: 600, letterSpacing: '0.5px', marginBottom: 6 }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
    <div style={{ fontSize: 11, color: '#555577' }}>{sub}</div>
  </div>
)
