import { useState, useEffect, useCallback, useRef, forwardRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'
import CompanyDetail from './CompanyDetail.jsx'
import AddCompanyModal from './AddCompanyModal.jsx'

const FIT_BADGES = {
  5: { label: 'Top Match', color: '#10b981', bg: '#052e16' },
  4: { label: 'Strong Fit', color: '#6366f1', bg: '#1e1b4b' },
  3: { label: 'Possible Fit', color: '#f59e0b', bg: '#1c1a00' },
  2: { label: 'Weak Fit', color: '#6b7280', bg: '#1a1a2e' },
  1: { label: 'No Fit', color: '#ef4444', bg: '#2d0a0a' },
}

const PIPELINE_COLORS = {
  watching: '#6366f1',
  outreach: '#f59e0b',
  diligence: '#10b981',
  passed: '#6b7280',
  invested: '#8b5cf6',
}

const SECTOR_ICONS = {
  'Legal Tech': '⚖️',
  'LegalTech': '⚖️',
  'Legal': '⚖️',
  'Healthcare': '🏥',
  'HealthTech': '🏥',
  'Health': '🏥',
  'Finance': '💰',
  'FinTech': '💰',
  'Fintech': '💰',
  'Compliance': '📋',
  'RegTech': '📋',
  'Insurance': '🛡️',
  'InsurTech': '🛡️',
  'AI Infrastructure': '⚡',
  'Infrastructure': '⚡',
  'SaaS': '☁️',
  'B2B SaaS': '☁️',
}

function getSectorIcon(sector) {
  if (!sector) return '◈'
  for (const [key, icon] of Object.entries(SECTOR_ICONS)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return '◈'
}

function isNewThisWeek(scraped_at) {
  if (!scraped_at) return false
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return new Date(scraped_at) >= sevenDaysAgo
}

function isAddedToday(scraped_at) {
  if (!scraped_at) return false
  const oneDayAgo = new Date()
  oneDayAgo.setHours(oneDayAgo.getHours() - 24)
  return new Date(scraped_at) >= oneDayAgo
}

function formatAddedDate(scraped_at) {
  if (!scraped_at) return null
  const normalized = scraped_at.endsWith('Z') || scraped_at.includes('+') ? scraped_at : scraped_at + 'Z'
  const d = new Date(normalized)
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 24) return `Added ${hours}h ago`
  if (days === 1) return 'Added yesterday'
  if (days < 7) return `Added ${days}d ago`
  return `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function loadSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem('radar_seen_companies') || '[]'))
  } catch { return new Set() }
}

function saveSeenIds(set) {
  try { localStorage.setItem('radar_seen_companies', JSON.stringify([...set])) } catch {}
}

function normalizeSectorName(raw) {
  if (!raw) return 'Other'
  const lower = raw.toLowerCase()
  if (lower.includes('legal')) return 'Legal Tech'
  if (lower.includes('health')) return 'HealthTech'
  if (lower.includes('fintech') || lower.includes('finance') || lower.includes('financial')) return 'FinTech'
  if (lower.includes('compliance') || lower.includes('regtech')) return 'RegTech / Compliance'
  if (lower.includes('insurance') || lower.includes('insurtech')) return 'InsurTech'
  if (lower.includes('infrastructure')) return 'AI Infrastructure'
  if (lower.includes('saas')) return 'B2B SaaS'
  return raw.trim() || 'Other'
}

function groupBySector(companies) {
  const groups = {}
  companies.forEach(s => {
    const sectorRaw = s.sector || 'Other'
    const normalized = normalizeSectorName(sectorRaw)
    const key = (normalized.split('/')[0] || 'Other').trim()
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })
  // Sort groups by highest fit score in group, then by count
  return Object.entries(groups).sort((a, b) => {
    const aMax = Math.max(...a[1].map(s => s.fit_score || 0))
    const bMax = Math.max(...b[1].map(s => s.fit_score || 0))
    if (bMax !== aMax) return bMax - aMax
    return b[1].length - a[1].length
  })
}

export default function Coverage({ API, selectedCompany, onCompanyViewed }) {
  const { getToken } = useAuth()
  const [startups, setStartups] = useState([])
  const [selected, setSelected] = useState(null)
  const [seenIds, setSeenIds] = useState(() => loadSeenIds())
  const [filters, setFilters] = useState({ stage: '', fit_level: '', sector: '', sort: 'fit_score' })
  const [loading, setLoading] = useState(true)
  const [inboxCollapsed, setInboxCollapsed] = useState(false)
  const [collapsedSectors, setCollapsedSectors] = useState({})
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' | 'flat'
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNewOnly, setShowNewOnly] = useState(false)
  const [showUnseenOnly, setShowUnseenOnly] = useState(false)
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const cardRefs = useRef({})

  const fetchStartups = useCallback(async () => {
    setLoading(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    try {
      const res = await axios.get(`${API}/startups/`, { params: { ...params, limit: 200, min_fit_score: 0 }, headers })
      setStartups(res.data)
      setSelected(prev => {
        if (!prev?.id) return prev
        const updated = res.data.find(x => x.id === prev.id)
        return updated ?? prev
      })
    } catch (_) {}
    setLoading(false)
  }, [filters, API, getToken])

  useEffect(() => { fetchStartups() }, [fetchStartups])

  useEffect(() => {
    if (selectedCompany) {
      markSeen(selectedCompany)
      setSelected(selectedCompany)
      onCompanyViewed?.()
      const id = setTimeout(() => {
        cardRefs.current[selectedCompany.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
      return () => clearTimeout(id)
    }
  }, [selectedCompany])

  const markSeen = (startup) => {
    setSeenIds(prev => {
      const next = new Set(prev)
      next.add(startup.id)
      saveSeenIds(next)
      return next
    })
  }

  const handleCardClick = (startup) => {
    markSeen(startup)
    setSelected(startup)
  }

  const handleQuickAction = async (startup, status) => {
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      await axios.patch(`${API}/startups/${startup.id}`, { pipeline_status: status }, { headers })
      setStartups(prev => prev.map(s => s.id === startup.id ? { ...s, pipeline_status: status } : s))
      setSelected(prev => prev?.id === startup.id ? { ...prev, pipeline_status: status } : prev)
      setSavedId(startup.id)
      setTimeout(() => setSavedId(null), 2000)
    } catch (e) { console.error(e) }
  }

  const toggleSector = (sector) => {
    setCollapsedSectors(prev => ({ ...prev, [sector]: !prev[sector] }))
  }

  const sectors = [...new Set(startups.map(s => s.sector).filter(Boolean))].sort()
  const stages = ['pre-seed', 'seed', 'Series A', 'Series B', 'Series C']

  const inboxCards = startups.filter(s =>
    isNewThisWeek(s.scraped_at) && !seenIds.has(s.id) && !s.pipeline_status
  )
  const universeCardsBase = startups.filter(s =>
    !(isNewThisWeek(s.scraped_at) && !seenIds.has(s.id) && !s.pipeline_status)
  )
  const universeCards = (() => {
    if (showTodayOnly) return startups.filter(s => isAddedToday(s.scraped_at))
    if (showNewOnly) return startups.filter(s => isNewThisWeek(s.scraped_at))
    if (showUnseenOnly) return universeCardsBase.filter(s => !seenIds.has(s.id) && (s.fit_score || 0) >= 4)
    return universeCardsBase
  })()
  const unseenHighFitCount = universeCardsBase.filter(s => !seenIds.has(s.id) && (s.fit_score || 0) >= 4).length
  const addedTodayCount = startups.filter(s => isAddedToday(s.scraped_at)).length

  const sectorGroups = groupBySector(universeCards)
    .map(([sector, companies]) => {
      const visible = companies.filter(s => (s.fit_score || 0) >= 3 || s.source === 'manual')
      return [sector, visible]
    })
    .filter(([_, companies]) => companies.length > 0)

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', margin: 0, letterSpacing: '-0.5px' }}>Coverage</h1>
            <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>
              {startups.length} companies matched to mandate
              {inboxCards.length > 0 && (
                <span style={{ marginLeft: 10, color: '#10b981', fontWeight: 600 }}>
                  ✦ {inboxCards.length} new this week
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* View mode toggle */}
            <div style={{ display: 'flex', background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 7, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('grouped')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === 'grouped' ? '#2a2a4a' : 'transparent',
                color: viewMode === 'grouped' ? '#f0f0ff' : '#6b7280',
              }}>By Sector</button>
              <button onClick={() => setViewMode('flat')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === 'flat' ? '#2a2a4a' : 'transparent',
                color: viewMode === 'flat' ? '#f0f0ff' : '#6b7280',
              }}>All</button>
            </div>

            {unseenHighFitCount > 0 && (
              <button onClick={() => { setShowUnseenOnly(v => !v); setShowTodayOnly(false); setShowNewOnly(false) }} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderRadius: 7, border: `1px solid ${showUnseenOnly ? '#3730a3' : '#2a2a4a'}`,
                background: showUnseenOnly ? '#1e1b4b' : '#0f0f1a',
                color: showUnseenOnly ? '#a5b4fc' : '#6b7280',
              }}>⭐ Unseen ({unseenHighFitCount})</button>
            )}
            {addedTodayCount > 0 && (
              <button onClick={() => { setShowTodayOnly(v => !v); setShowUnseenOnly(false); setShowNewOnly(false) }} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderRadius: 7, border: `1px solid ${showTodayOnly ? '#065f46' : '#2a2a4a'}`,
                background: showTodayOnly ? '#052e16' : '#0f0f1a',
                color: showTodayOnly ? '#10b981' : '#6b7280',
              }}>🌙 Last 24h ({addedTodayCount})</button>
            )}
            <select value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))} style={selectStyle}>
              <option value="">All Stages</option>
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.fit_level} onChange={e => setFilters(f => ({ ...f, fit_level: e.target.value }))} style={selectStyle}>
              <option value="">All Fits</option>
              <option value="top">Top Match</option>
              <option value="strong">Strong Fit</option>
              <option value="possible">Possible Fit</option>
            </select>
            <select value={filters.sector} onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))} style={selectStyle}>
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))} style={selectStyle}>
              <option value="fit_score">Fit Score</option>
              <option value="newest">Newest</option>
            </select>
            <button onClick={() => setShowAddModal(true)} style={{
              padding: '6px 14px', borderRadius: 7, border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}>+ Add Company</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555577', padding: 80, fontSize: 14 }}>Loading companies...</div>
        ) : (
          <>
            {/* INBOX */}
            {inboxCards.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionHeader
                  label="NEW THIS WEEK"
                  count={inboxCards.length}
                  color="#10b981"
                  borderColor="#1a3a1a"
                  countBg="#052e16"
                  countBorder="#065f46"
                  collapsed={inboxCollapsed}
                  onToggle={() => setInboxCollapsed(c => !c)}
                />
                {!inboxCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {inboxCards.map(s => (
                      <CompanyCard
                        key={s.id}
                        ref={el => { if (el) cardRefs.current[s.id] = el }}
                        startup={s}
                        onClick={() => handleCardClick(s)}
                        isSelected={selected?.id === s.id}
                        isInbox={true}
                        onQuickAction={handleQuickAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* UNIVERSE — grouped or flat */}
            {viewMode === 'grouped' ? (
              <div>
                {sectorGroups.map(([sector, companies]) => (
                  <div key={sector} style={{ marginBottom: 28 }}>
                    <SectorHeader
                      sector={sector}
                      companies={companies}
                      collapsed={collapsedSectors[sector]}
                      onToggle={() => toggleSector(sector)}
                    />
                    {!collapsedSectors[sector] && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                        {companies.map(s => (
                          <CompanyCard
                            key={s.id}
                            ref={el => { if (el) cardRefs.current[s.id] = el }}
                            startup={s}
                            onClick={() => handleCardClick(s)}
                            isSelected={selected?.id === s.id}
                            isInbox={false}
                            onQuickAction={handleQuickAction}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <SectionHeader
                  label="COVERAGE UNIVERSE"
                  count={universeCards.length}
                  color="#6b7280"
                  borderColor="#1e1e2e"
                  countBg="#1a1a2e"
                  countBorder="#2a2a4a"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {universeCards.map(s => (
                    <CompanyCard
                      key={s.id}
                      ref={el => { if (el) cardRefs.current[s.id] = el }}
                      startup={s}
                      onClick={() => handleCardClick(s)}
                      isSelected={selected?.id === s.id}
                      isInbox={false}
                      onQuickAction={handleQuickAction}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{ width: 520, borderLeft: '1px solid #1e1e2e', overflow: 'auto', flexShrink: 0 }}>
          <CompanyDetail
            API={API}
            startup={selected}
            onClose={() => setSelected(null)}
            onUpdate={(updatedCompany) => {
              setSelected(updatedCompany)
              setStartups(prev => prev.map(s => s.id === updatedCompany.id ? updatedCompany : s))
            }}
          />
        </div>
      )}

      {showAddModal && (
        <AddCompanyModal
          API={API}
          onClose={() => setShowAddModal(false)}
          onAdded={(company) => {
            fetchStartups()
            if (company) setSelected(company)
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function SectorHeader({ sector, companies, collapsed, onToggle }) {
  const topMatch = companies.filter(s => s.fit_score === 5).length
  const strongFit = companies.filter(s => s.fit_score === 4).length
  const possibleFit = companies.filter(s => s.fit_score === 3).length
  return (
    <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: collapsed ? 0 : 14, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
        {getSectorIcon(sector)}  {sector.toUpperCase()}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#1a1a2e', border: '1px solid #2a2a4a', padding: '1px 7px', borderRadius: 10, flexShrink: 0 }}>{companies.length}</span>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {topMatch > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#10b981', background: '#052e16', padding: '1px 6px', borderRadius: 8, border: '1px solid #065f46' }}>{topMatch} Top</span>}
        {strongFit > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#6366f1', background: '#1e1b4b', padding: '1px 6px', borderRadius: 8, border: '1px solid #3730a3' }}>{strongFit} Strong</span>}
        {possibleFit > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', background: '#1c1a00', padding: '1px 6px', borderRadius: 8, border: '1px solid #78350f' }}>{possibleFit} Possible</span>}
      </div>
      <div style={{ flex: 1, height: 1, background: '#1e1e2e' }} />
      <span style={{ fontSize: 11, color: '#3a3a5a', flexShrink: 0 }}>{collapsed ? '▸' : '▾'}</span>
    </div>
  )
}

function SectionHeader({ label, count, color, borderColor, countBg, countBorder, collapsed, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: collapsed ? 0 : 14,
        cursor: onToggle ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color,
        background: countBg, border: `1px solid ${countBorder}`,
        padding: '1px 7px', borderRadius: 10, flexShrink: 0
      }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: borderColor }} />
      {onToggle && (
        <span style={{ fontSize: 11, color: '#3a3a5a', flexShrink: 0 }}>{collapsed ? '▸' : '▾'}</span>
      )}
    </div>
  )
}

const CompanyCard = forwardRef(function CompanyCard({ startup: s, onClick, isSelected, isInbox, onQuickAction }, ref) {
  const badge = s.fit_score != null
    ? (FIT_BADGES[s.fit_score] || FIT_BADGES[2])
    : { label: 'Pending', color: '#555577', bg: '#1a1a2e' }
  const inPipeline = s.pipeline_status && PIPELINE_COLORS[s.pipeline_status]
  const pipelineColor = inPipeline ? PIPELINE_COLORS[s.pipeline_status] : '#2a2a4a'
  const showActions = isInbox && !s.pipeline_status
  const investors = Array.isArray(s.top_investors) ? s.top_investors.slice(0, 2) : []

  return (
    <div ref={ref} onClick={onClick} style={{
      background: isSelected ? '#13132a' : '#0f0f1a',
      borderLeft: `3px solid ${pipelineColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: isSelected
        ? '0 0 0 2px #3730a3'
        : inPipeline
        ? `0 0 0 1px ${pipelineColor}33`
        : '0 0 0 1px #1e1e2e',
    }}>

      {/* Row 1: Name + fit badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.name}
          </div>
          {isInbox && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: '#10b981', background: '#052e16',
              padding: '2px 5px', borderRadius: 3, letterSpacing: '0.5px',
              border: '1px solid #065f46', flexShrink: 0
            }}>NEW</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
          {inPipeline && (
            <span style={{
              padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
              background: `${pipelineColor}22`, color: pipelineColor,
              border: `1px solid ${pipelineColor}55`, textTransform: 'capitalize'
            }}>{s.pipeline_status}</span>
          )}
          <span style={{
            padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
            background: badge.bg, color: badge.color, whiteSpace: 'nowrap'
          }}>{badge.label}</span>
        </div>
      </div>

      {/* Row 2: One-liner */}
      <div style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.45, marginBottom: 10 }}>
        {s.one_liner}
      </div>

      {/* Row 3: Meta info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 11, color: '#555577' }}>
        {s.founding_year && (
          <span>Est. {s.founding_year}</span>
        )}
        {s.team_size && (
          <span>· {s.team_size}</span>
        )}
        {s.notable_traction && (
          <span style={{ color: '#10b981', fontWeight: 600 }}>· {s.notable_traction}</span>
        )}
      </div>

      {/* Row 4: Tags + investors */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {s.source === 'manual' && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>Added by you</span>
        )}
        {s.funding_stage && <Tag>{s.funding_stage}</Tag>}
        {s.has_unseen_signals && (
          <span style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10,
            background: '#1e1b4b', color: '#a5b4fc', fontWeight: 600,
            border: '1px solid #3730a3'
          }}>⚡ Signal</span>
        )}
        {investors.map((inv, i) => (
          <span key={i} style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10,
            background: '#1a1a2e', color: '#6366f1',
            border: '1px solid #2a2a4a', fontWeight: 500
          }}>{inv}</span>
        ))}
      </div>

      {s.scraped_at && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#3a3a5a' }}>
          {formatAddedDate(s.scraped_at)}
        </div>
      )}

      {/* Quick actions */}
      {showActions && (
        <div style={{
          display: 'flex', gap: 8, marginTop: 12, paddingTop: 12,
          borderTop: '1px solid #1e1e2e'
        }}>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'watching') }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer'
          }}>+ Watch</button>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'passed') }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: '#1a1a2e', color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer'
          }}>Pass</button>
          <button onClick={e => { e.stopPropagation(); onClick() }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: 'transparent', color: '#555577', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', marginLeft: 'auto'
          }}>→ Memo</button>
        </div>
      )}
    </div>
  )
})

const Tag = ({ children }) => (
  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>{children}</span>
)

const selectStyle = {
  background: '#0f0f1a', border: '1px solid #2a2a4a', color: '#8888aa',
  padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', outline: 'none'
}
