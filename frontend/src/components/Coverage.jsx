import { useState, useEffect, useRef, forwardRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import CompanyDetail from './CompanyDetail.jsx'
import AddCompanyModal from './AddCompanyModal.jsx'
import { Icons, theme } from './Icons.jsx'

const FIT_BADGES = {
  5: { label: 'Top Match', color: theme.status.success, bg: theme.status.successMuted },
  4: { label: 'Strong Fit', color: theme.accent.primary, bg: '#1e1b4b' },
  3: { label: 'Possible Fit', color: theme.status.warning, bg: theme.status.warningMuted },
  2: { label: 'Weak Fit', color: theme.text.tertiary, bg: theme.bg.elevated },
  1: { label: 'No Fit', color: theme.status.error, bg: theme.status.errorMuted },
}

const PIPELINE_COLORS = {
  watching: theme.pipeline.watching,
  outreach: theme.pipeline.outreach,
  diligence: theme.pipeline.diligence,
  passed: theme.pipeline.passed,
  invested: theme.pipeline.invested,
}

// Sector icon mapping using SVG icons
function getSectorIcon(sector) {
  if (!sector) return <Icons.diamond size={12} color={theme.text.tertiary} />
  const lower = sector.toLowerCase()
  if (lower.includes('legal')) return <Icons.legal size={12} color={theme.text.secondary} />
  if (lower.includes('health')) return <Icons.health size={12} color={theme.text.secondary} />
  if (lower.includes('fintech') || lower.includes('finance')) return <Icons.finance size={12} color={theme.text.secondary} />
  if (lower.includes('compliance') || lower.includes('regtech')) return <Icons.compliance size={12} color={theme.text.secondary} />
  if (lower.includes('insurance') || lower.includes('insurtech')) return <Icons.shield size={12} color={theme.text.secondary} />
  if (lower.includes('infrastructure')) return <Icons.infra size={12} color={theme.text.secondary} />
  if (lower.includes('saas')) return <Icons.cloud size={12} color={theme.text.secondary} />
  return <Icons.diamond size={12} color={theme.text.tertiary} />
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
  return Object.entries(groups).sort((a, b) => {
    const aMax = Math.max(...a[1].map(s => s.fit_score || 0))
    const bMax = Math.max(...b[1].map(s => s.fit_score || 0))
    if (bMax !== aMax) return bMax - aMax
    return b[1].length - a[1].length
  })
}

export default function Coverage({ API, selectedCompany, onCompanyViewed }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [seenIds, setSeenIds] = useState(() => loadSeenIds())
  const [filters, setFilters] = useState({ stage: '', fit_level: '', sector: '', sort: 'fit_score' })
  const [inboxCollapsed, setInboxCollapsed] = useState(false)
  const [collapsedSectors, setCollapsedSectors] = useState({})
  const [viewMode, setViewMode] = useState('grouped')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showNewOnly, setShowNewOnly] = useState(false)
  const [showUnseenOnly, setShowUnseenOnly] = useState(false)
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const cardRefs = useRef({})

  const { data: startups = [], isLoading: loading } = useQuery({
    queryKey: ['startups', filters],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      const res = await axios.get(`${API}/startups/`, { params: { ...params, limit: 200, min_fit_score: 0 }, headers })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })

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
      queryClient.setQueryData(['startups', filters], prev =>
        (prev || []).map(s => s.id === startup.id ? { ...s, pipeline_status: status } : s)
      )
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
    <div style={{ display: 'flex', height: '100%', background: theme.bg.primary }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text.primary, margin: 0, letterSpacing: '-0.5px' }}>Coverage</h1>
            <p style={{ fontSize: 13, color: theme.text.tertiary, margin: '4px 0 0' }}>
              {startups.length} companies matched to mandate
              {inboxCards.length > 0 && (
                <span style={{ marginLeft: 10, color: theme.status.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icons.zap size={12} color={theme.status.success} fill={theme.status.success} />
                  {inboxCards.length} new this week
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* View mode toggle */}
            <div style={{ display: 'flex', background: theme.bg.secondary, border: `1px solid ${theme.border.default}`, borderRadius: 7, overflow: 'hidden' }}>
              <button onClick={() => setViewMode('grouped')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === 'grouped' ? theme.border.default : 'transparent',
                color: viewMode === 'grouped' ? theme.text.primary : theme.text.tertiary,
              }}>By Sector</button>
              <button onClick={() => setViewMode('flat')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: viewMode === 'flat' ? theme.border.default : 'transparent',
                color: viewMode === 'flat' ? theme.text.primary : theme.text.tertiary,
              }}>All</button>
            </div>

            {unseenHighFitCount > 0 && (
              <button onClick={() => { setShowUnseenOnly(v => !v); setShowTodayOnly(false); setShowNewOnly(false) }} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderRadius: 7, border: `1px solid ${showUnseenOnly ? '#3730a3' : theme.border.default}`,
                background: showUnseenOnly ? '#1e1b4b' : theme.bg.secondary,
                color: showUnseenOnly ? '#a5b4fc' : theme.text.tertiary,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Icons.star size={11} color={showUnseenOnly ? '#a5b4fc' : theme.text.tertiary} />
                Unseen ({unseenHighFitCount})
              </button>
            )}
            {addedTodayCount > 0 && (
              <button onClick={() => { setShowTodayOnly(v => !v); setShowUnseenOnly(false); setShowNewOnly(false) }} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderRadius: 7, border: `1px solid ${showTodayOnly ? '#065f46' : theme.border.default}`,
                background: showTodayOnly ? theme.status.successMuted : theme.bg.secondary,
                color: showTodayOnly ? theme.status.success : theme.text.tertiary,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Icons.moon size={11} color={showTodayOnly ? theme.status.success : theme.text.tertiary} />
                Last 24h ({addedTodayCount})
              </button>
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
              background: `linear-gradient(135deg, ${theme.accent.primary}, #7c3aed)`,
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Icons.plus size={12} color="#fff" />
              Add Company
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: theme.text.tertiary, padding: 80, fontSize: 14 }}>Loading companies...</div>
        ) : (
          <>
            {/* INBOX */}
            {inboxCards.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionHeader
                  label="NEW THIS WEEK"
                  count={inboxCards.length}
                  color={theme.status.success}
                  borderColor="#1a3a1a"
                  countBg={theme.status.successMuted}
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

            {/* UNIVERSE - grouped or flat */}
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
                  color={theme.text.tertiary}
                  borderColor={theme.border.subtle}
                  countBg={theme.bg.elevated}
                  countBorder={theme.border.default}
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
        <div style={{ width: 520, borderLeft: `1px solid ${theme.border.subtle}`, overflow: 'auto', flexShrink: 0 }}>
          <CompanyDetail
            API={API}
            startup={selected}
            onClose={() => setSelected(null)}
            onUpdate={(updatedCompany) => {
              setSelected(updatedCompany)
              queryClient.setQueryData(['startups', filters], prev =>
                (prev || []).map(s => s.id === updatedCompany.id ? updatedCompany : s)
              )
            }}
          />
        </div>
      )}

      {showAddModal && (
        <AddCompanyModal
          API={API}
          onClose={() => setShowAddModal(false)}
          onAdded={(company) => {
            queryClient.invalidateQueries({ queryKey: ['startups'] })
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
      <span style={{ fontSize: 11, fontWeight: 700, color: theme.text.tertiary, letterSpacing: '0.8px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {getSectorIcon(sector)} {sector.toUpperCase()}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: theme.text.tertiary, background: theme.bg.elevated, border: `1px solid ${theme.border.default}`, padding: '1px 7px', borderRadius: 10, flexShrink: 0 }}>{companies.length}</span>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {topMatch > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: theme.status.success, background: theme.status.successMuted, padding: '1px 6px', borderRadius: 8, border: '1px solid #065f46' }}>{topMatch} Top</span>}
        {strongFit > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: theme.accent.primary, background: '#1e1b4b', padding: '1px 6px', borderRadius: 8, border: '1px solid #3730a3' }}>{strongFit} Strong</span>}
        {possibleFit > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: theme.status.warning, background: theme.status.warningMuted, padding: '1px 6px', borderRadius: 8, border: '1px solid #78350f' }}>{possibleFit} Possible</span>}
      </div>
      <div style={{ flex: 1, height: 1, background: theme.border.subtle }} />
      <span style={{ fontSize: 11, color: theme.text.muted, flexShrink: 0 }}>{collapsed ? '\u25B8' : '\u25BE'}</span>
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
        <span style={{ fontSize: 11, color: theme.text.muted, flexShrink: 0 }}>{collapsed ? '\u25B8' : '\u25BE'}</span>
      )}
    </div>
  )
}

const CompanyCard = forwardRef(function CompanyCard({ startup: s, onClick, isSelected, isInbox, onQuickAction }, ref) {
  const badge = s.fit_score != null
    ? (FIT_BADGES[s.fit_score] || FIT_BADGES[2])
    : { label: 'Pending', color: theme.text.tertiary, bg: theme.bg.elevated }
  const inPipeline = s.pipeline_status && PIPELINE_COLORS[s.pipeline_status]
  const pipelineColor = inPipeline ? PIPELINE_COLORS[s.pipeline_status] : theme.border.default
  const showActions = isInbox && !s.pipeline_status
  const investors = Array.isArray(s.top_investors) ? s.top_investors.slice(0, 2) : []

  return (
    <div ref={ref} onClick={onClick} style={{
      background: isSelected ? '#13132a' : theme.bg.secondary,
      borderLeft: `3px solid ${pipelineColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: isSelected
        ? '0 0 0 2px #3730a3'
        : inPipeline
        ? `0 0 0 1px ${pipelineColor}33`
        : `0 0 0 1px ${theme.border.subtle}`,
    }}>

      {/* Row 1: Name + fit badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.name}
          </div>
          {isInbox && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: theme.status.success, background: theme.status.successMuted,
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
      <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.45, marginBottom: 10 }}>
        {s.one_liner}
      </div>

      {/* Row 3: Meta info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 11, color: theme.text.tertiary }}>
        {s.founding_year && (
          <span>Est. {s.founding_year}</span>
        )}
        {s.team_size && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <span style={{ color: theme.text.muted }}>{'\u00B7'}</span> {s.team_size}
          </span>
        )}
        {s.notable_traction && (
          <span style={{ color: theme.status.success, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <span style={{ color: theme.text.muted }}>{'\u00B7'}</span> {s.notable_traction}
          </span>
        )}
      </div>

      {/* Row 4: Tags + investors */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {s.source === 'manual' && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: theme.bg.elevated, color: theme.text.tertiary, border: `1px solid ${theme.border.default}` }}>Added by you</span>
        )}
        {s.funding_stage && <Tag>{s.funding_stage}</Tag>}
        {s.has_unseen_signals && (
          <span style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10,
            background: '#1e1b4b', color: '#a5b4fc', fontWeight: 600,
            border: '1px solid #3730a3',
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <Icons.bolt size={10} color="#a5b4fc" /> Signal
          </span>
        )}
        {investors.map((inv, i) => (
          <span key={i} style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10,
            background: theme.bg.elevated, color: theme.accent.primary,
            border: `1px solid ${theme.border.default}`, fontWeight: 500
          }}>{inv}</span>
        ))}
      </div>

      {s.scraped_at && (
        <div style={{ marginTop: 8, fontSize: 10, color: theme.text.muted }}>
          {formatAddedDate(s.scraped_at)}
        </div>
      )}

      {/* Quick actions */}
      {showActions && (
        <div style={{
          display: 'flex', gap: 8, marginTop: 12, paddingTop: 12,
          borderTop: `1px solid ${theme.border.subtle}`
        }}>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'watching') }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: theme.accent.primary, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <Icons.plus size={10} color="#fff" /> Watch
          </button>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'passed') }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: theme.bg.elevated, color: theme.text.tertiary, fontSize: 11, fontWeight: 600, cursor: 'pointer'
          }}>Pass</button>
          <button onClick={e => { e.stopPropagation(); onClick() }} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none',
            background: 'transparent', color: theme.text.tertiary, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <Icons.arrowRight size={10} color={theme.text.tertiary} /> Memo
          </button>
        </div>
      )}
    </div>
  )
})

const Tag = ({ children }) => (
  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: theme.bg.elevated, color: theme.text.tertiary, border: `1px solid ${theme.border.default}` }}>{children}</span>
)

const selectStyle = {
  background: theme.bg.secondary, border: `1px solid ${theme.border.default}`, color: theme.text.secondary,
  padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', outline: 'none'
}
