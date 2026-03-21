import { useState, useEffect, useRef, forwardRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

export default function Coverage({ API, selectedCompany, selectedEventType, onCompanyViewed }) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [selectedTab, setSelectedTab] = useState(null)
  const [seenIds, setSeenIds] = useState(() => loadSeenIds())
  const [filters, setFilters] = useState({ stage: '', fit_level: '', sector: '', sort: 'fit_score' })
  const [inboxCollapsed, setInboxCollapsed] = useState(false)
  const [collapsedSectors, setCollapsedSectors] = useState({})
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' | 'flat'
  const [showAddModal, setShowAddModal] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const cardRefs = useRef({})
  const [searchQuery, setSearchQuery] = useState('')
  const [addedFilter, setAddedFilter] = useState('') // '' | 'today' | 'week' | 'unseen'
  const [pipelineFilter, setPipelineFilter] = useState('') // '' | 'in_pipeline'

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
      setSelectedTab(
        selectedEventType === 'company_signal' ? 'signals'
        : selectedEventType === 'research_complete' ? 'research'
        : 'overview'
      )
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

  const inboxCards = startups.filter(s =>
    isNewThisWeek(s.scraped_at) && !seenIds.has(s.id) && !s.pipeline_status
  )
  const universeCardsBase = startups.filter(s =>
    !(isNewThisWeek(s.scraped_at) && !seenIds.has(s.id) && !s.pipeline_status)
  )
  const universeCards = (() => {
    let base
    if (addedFilter === 'today') base = startups.filter(s => isAddedToday(s.scraped_at))
    else if (addedFilter === 'week') base = startups.filter(s => isNewThisWeek(s.scraped_at))
    else if (addedFilter === 'unseen') base = universeCardsBase.filter(s => !seenIds.has(s.id) && (s.fit_score || 0) >= 4)
    else base = universeCardsBase
    if (pipelineFilter === 'in_pipeline') {
      base = base.filter(s => s.pipeline_status &&
        ['watching', 'outreach', 'diligence'].includes(s.pipeline_status))
    }
    return base
  })()
  const unseenHighFitCount = universeCardsBase.filter(s => !seenIds.has(s.id) && (s.fit_score || 0) >= 4).length
  const filteredCards = searchQuery.trim()
    ? universeCards.filter(s => {
        const q = searchQuery.toLowerCase()
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (s.one_liner || '').toLowerCase().includes(q) ||
          (s.sector || '').toLowerCase().includes(q)
        )
      })
    : universeCards

  const sectorGroups = groupBySector(filteredCards)
    .map(([sector, companies]) => {
      const visible = companies.filter(s => (s.fit_score || 0) >= 3 || s.source === 'manual')
      return [sector, visible]
    })
    .filter(([_, companies]) => companies.length > 0)

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>

          {/* Title row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 12
          }}>
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: '#f0f0ff',
                margin: 0, letterSpacing: '-0.5px'
              }}>Coverage</h1>
              <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>
                {searchQuery.trim()
                  ? `${filteredCards.length} result${filteredCards.length !== 1 ? 's' : ''} for "${searchQuery}"`
                  : addedFilter || filters.stage || filters.fit_level || filters.sector || pipelineFilter
                  ? `${filteredCards.length} of ${startups.length} companies`
                  : `${startups.length} companies in your universe`
                }
                {inboxCards.length > 0 && !searchQuery && (
                  <span style={{ marginLeft: 10, color: '#10b981', fontWeight: 600 }}>
                    ✦ {inboxCards.length} new this week
                  </span>
                )}
              </p>
            </div>
            {/* View toggle */}
            <div style={{
              display: 'flex', background: '#0f0f1a',
              border: '1px solid #2a2a4a', borderRadius: 7, overflow: 'hidden'
            }}>
              <button onClick={() => setViewMode('grouped')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: viewMode === 'grouped' ? '#2a2a4a' : 'transparent',
                color: viewMode === 'grouped' ? '#f0f0ff' : '#6b7280',
              }}>By Sector</button>
              <button onClick={() => setViewMode('flat')} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: viewMode === 'flat' ? '#2a2a4a' : 'transparent',
                color: viewMode === 'flat' ? '#f0f0ff' : '#6b7280',
              }}>All</button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: '#555577', fontSize: 14,
                pointerEvents: 'none'
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, description, or sector..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0f0f1a', border: '1px solid #2a2a4a',
                  borderRadius: 8, padding: '8px 12px 8px 36px',
                  color: '#f0f0ff', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: '#555577', cursor: 'pointer',
                    fontSize: 14, padding: '0 4px'
                  }}
                >✕</button>
              )}
            </div>
            <button onClick={() => setShowAddModal(true)} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0
            }}>+ Add Company</button>
          </div>

          {/* Filter row */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap'
          }}>
            {/* Fit pills */}
            {[
              { label: 'All Fits', value: '' },
              { label: '🎯 Top Match', value: 'top' },
              { label: 'Strong', value: 'strong' },
              { label: 'Possible', value: 'possible' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setFilters(f => ({ ...f, fit_level: value }))}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11,
                  fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  borderColor: filters.fit_level === value ? '#4f46e5' : '#2a2a4a',
                  background: filters.fit_level === value ? '#1e1b4b' : '#0f0f1a',
                  color: filters.fit_level === value ? '#a5b4fc' : '#6b7280',
                }}
              >{label}</button>
            ))}

            <div style={{ width: 1, height: 16, background: '#2a2a4a', margin: '0 2px' }} />

            {/* Stage dropdown */}
            <select
              value={filters.stage}
              onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
              style={selectStyle}
            >
              <option value="">All Stages</option>
              <option value="pre-seed">Pre-seed</option>
              <option value="seed">Seed</option>
              <option value="series-a">Series A</option>
              <option value="series-b">Series B</option>
            </select>

            {/* Sector dropdown */}
            <select
              value={filters.sector}
              onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}
              style={selectStyle}
            >
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Added dropdown */}
            <select
              value={addedFilter}
              onChange={e => setAddedFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">Any Time</option>
              <option value="today">Last 24h</option>
              <option value="week">This Week</option>
              {unseenHighFitCount > 0 && (
                <option value="unseen">Unseen ({unseenHighFitCount})</option>
              )}
            </select>

            {/* Pipeline dropdown */}
            <select
              value={pipelineFilter}
              onChange={e => setPipelineFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">All Companies</option>
              <option value="in_pipeline">In Pipeline</option>
            </select>

            {/* Clear filters */}
            {(searchQuery || addedFilter || pipelineFilter ||
              filters.stage || filters.fit_level || filters.sector) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setAddedFilter('')
                  setPipelineFilter('')
                  setFilters({ stage: '', fit_level: '', sector: '', sort: 'fit_score' })
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11,
                  fontWeight: 600, cursor: 'pointer',
                  border: '1px solid #2a2a4a',
                  background: 'transparent', color: '#555577',
                }}
              >✕ Clear</button>
            )}
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
            {addedFilter === 'unseen' && filteredCards.length === 0 ? (
              <AllCaughtUp onDone={() => setAddedFilter('')} />
            ) : viewMode === 'grouped' ? (
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
                  count={filteredCards.length}
                  color="#6b7280"
                  borderColor="#1e1e2e"
                  countBg="#1a1a2e"
                  countBorder="#2a2a4a"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                  {filteredCards.map(s => (
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
            initialTab={selectedTab}
            onClose={() => { setSelected(null); setSelectedTab(null) }}
            onUpdate={(updatedCompany) => {
              setSelected(updatedCompany)
              queryClient.setQueryData(['startups', filters], prev =>
                (prev || []).map(s => s.id === updatedCompany.id ? updatedCompany : s)
              )
              queryClient.invalidateQueries({ queryKey: ['startups'] })
              queryClient.invalidateQueries({ queryKey: ['pipeline'] })
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
          <span>· 👤 {s.team_size}</span>
        )}
      </div>

      {/* Row 4: Tags + investors */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {s.source === 'manual' && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>Added by you</span>
        )}
        {s.funding_stage && s.funding_stage !== 'unknown' && <Tag>{s.funding_stage}</Tag>}
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

function AllCaughtUp({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div style={{
      textAlign: 'center', padding: '80px 20px', color: '#555577'
    }}>
      <div style={{
        fontSize: 32, marginBottom: 16,
        animation: 'fadeIn 0.4s ease'
      }}>✓</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 8
      }}>
        You're all caught up
      </div>
      <div style={{ fontSize: 13, color: '#555577' }}>
        No unseen top matches. Returning to your coverage universe...
      </div>
    </div>
  )
}

const Tag = ({ children }) => (
  <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>{children}</span>
)

const selectStyle = {
  background: '#0f0f1a', border: '1px solid #2a2a4a', color: '#8888aa',
  padding: '6px 10px', borderRadius: 7, fontSize: 12, cursor: 'pointer', outline: 'none'
}
