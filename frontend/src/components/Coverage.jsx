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

function getSourceChannel(scoreSource, source) {
  switch (scoreSource) {
    case 'email_pitch': return { label: 'Inbound pitch', color: '#f59e0b', icon: '✉' }
    case 'email_intro':  return { label: 'Warm intro',    color: '#10b981', icon: '↗' }
    case 'manual':       return { label: 'Added manually', color: '#8888aa', icon: '+' }
    default:
      if (source === 'manual') return { label: 'Added manually', color: '#8888aa', icon: '+' }
      return { label: 'Sourced by Reidar', color: '#6b6b8a', icon: 'radar' }
  }
}

function getAccentColor(s) {
  if (s.score_source === 'email_pitch') return '#f59e0b'
  if (s.score_source === 'email_intro') return '#10b981'
  if (s.pipeline_status && PIPELINE_COLORS[s.pipeline_status]) return PIPELINE_COLORS[s.pipeline_status]
  return '#2a2a4a'
}

function getInboundUrgency(s) {
  if (s.score_source !== 'email_pitch' && s.score_source !== 'email_intro') return null
  if (s.pipeline_status && s.pipeline_status !== 'new') return null
  if (!s.scraped_at) return null
  const normalized = s.scraped_at.endsWith('Z') || s.scraped_at.includes('+') ? s.scraped_at : s.scraped_at + 'Z'
  const diffMs = Date.now() - new Date(normalized).getTime()
  const diffDays = diffMs / 86400000
  if (diffDays > 3) return { text: `No reply · ${Math.floor(diffDays)}d ago`, color: '#ef4444' }
  return { text: `Awaiting reply · ${Math.floor(diffMs / 3600000)}h ago`, color: '#f59e0b' }
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
  const [listMode, setListMode] = useState(() => {
    try { return localStorage.getItem('radar_list_mode') === 'true' } catch { return false }
  })
  const toggleListMode = (val) => {
    try { localStorage.setItem('radar_list_mode', String(val)) } catch {}
    setListMode(val)
  }
  const [showAddModal, setShowAddModal] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const cardRefs = useRef({})
  const [searchQuery, setSearchQuery] = useState('')
  const [addedFilter, setAddedFilter] = useState('') // '' | 'today' | 'week' | 'unseen'
  const [pipelineFilter, setPipelineFilter] = useState('') // '' | 'in_pipeline'

  const { data: firmProfile } = useQuery({
    queryKey: ['firmProfile'],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/firm-profile`, { headers })
      return res.data
    },
    staleTime: 1000 * 60 * 10,
  })

  const showAll = viewMode === 'flat'
  const minFitScore = showAll ? 0 : (firmProfile?.fit_threshold ?? 3)
  const threshold = firmProfile?.fit_threshold ?? 3

  const { data: startups = [], isLoading: loading } = useQuery({
    queryKey: ['startups', filters, minFitScore],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      const res = await axios.get(`${API}/startups/`, { params: { ...params, limit: 200, min_fit_score: minFitScore }, headers })
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
                  : showAll
                  ? `${startups.length} companies in your universe — ${startups.filter(s => (s.fit_score ?? 0) >= threshold).length} match your mandate`
                  : `${startups.length} companies match your mandate`
                }
                {inboxCards.length > 0 && !searchQuery && (
                  <span style={{ marginLeft: 10, color: '#10b981', fontWeight: 600 }}>
                    ✦ {inboxCards.length} new this week
                  </span>
                )}
              </p>
            </div>
            {/* View toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 7, overflow: 'hidden' }}>
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
                }}>Show all</button>
              </div>
              <div style={{ display: 'flex', background: '#0f0f1a', border: '1px solid #2a2a4a', borderRadius: 7, overflow: 'hidden' }}>
                <button onClick={() => toggleListMode(false)} title="Grid view" style={{
                  padding: '5px 10px', cursor: 'pointer', border: 'none',
                  background: !listMode ? '#2a2a4a' : 'transparent',
                  color: !listMode ? '#f0f0ff' : '#6b7280', display: 'flex', alignItems: 'center',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="0" y="0" width="5" height="5" rx="1"/><rect x="7" y="0" width="5" height="5" rx="1"/>
                    <rect x="0" y="7" width="5" height="5" rx="1"/><rect x="7" y="7" width="5" height="5" rx="1"/>
                  </svg>
                </button>
                <button onClick={() => toggleListMode(true)} title="List view" style={{
                  padding: '5px 10px', cursor: 'pointer', border: 'none',
                  background: listMode ? '#2a2a4a' : 'transparent',
                  color: listMode ? '#f0f0ff' : '#6b7280', display: 'flex', alignItems: 'center',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="0" y="1" width="12" height="2" rx="1"/><rect x="0" y="5" width="12" height="2" rx="1"/>
                    <rect x="0" y="9" width="12" height="2" rx="1"/>
                  </svg>
                </button>
              </div>
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

        {showAll && (
          <div style={{
            marginBottom: 16, padding: '8px 14px', borderRadius: 7,
            background: '#111120', border: '1px solid #2a2a4a',
            fontSize: 11, color: '#555577', letterSpacing: '0.2px',
          }}>
            Showing all companies including below-threshold fits
          </div>
        )}

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
                  listMode ? (
                    <div style={{ borderTop: '1px solid #0d0d1a' }}>
                      {inboxCards.map(s => (
                        <CompanyRow key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                      {inboxCards.map(s => (
                        <CompanyCard key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} isInbox={true} onQuickAction={handleQuickAction} />
                      ))}
                    </div>
                  )
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
                      listMode ? (
                        <div style={{ borderTop: '1px solid #0d0d1a', marginBottom: 4 }}>
                          {companies.map(s => (
                            <CompanyRow key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} />
                          ))}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                          {companies.map(s => (
                            <CompanyCard key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} isInbox={false} onQuickAction={handleQuickAction} />
                          ))}
                        </div>
                      )
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
                {listMode ? (
                  <div style={{ borderTop: '1px solid #0d0d1a' }}>
                    {filteredCards.map(s => (
                      <CompanyRow key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                    {filteredCards.map(s => (
                      <CompanyCard key={s.id} ref={el => { if (el) cardRefs.current[s.id] = el }} startup={s} onClick={() => handleCardClick(s)} isSelected={selected?.id === s.id} isInbox={false} onQuickAction={handleQuickAction} />
                    ))}
                  </div>
                )}
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
  const badge = s.fit_score != null ? (FIT_BADGES[s.fit_score] || FIT_BADGES[2]) : { label: 'Pending', color: '#555577', bg: '#1a1a2e' }
  const accentColor = getAccentColor(s)
  const channel = getSourceChannel(s.score_source, s.source)
  const urgency = getInboundUrgency(s)
  const pipelineColor = s.pipeline_status && PIPELINE_COLORS[s.pipeline_status] ? PIPELINE_COLORS[s.pipeline_status] : null
  const showActions = isInbox && !s.pipeline_status
  const isOverdue = s.next_action && s.next_action_due && new Date(s.next_action_due) < new Date()

  return (
    <div ref={ref} onClick={onClick} style={{
      background: isSelected ? '#13132a' : '#0f0f1a',
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 10,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'all 0.15s',
      boxShadow: isSelected ? '0 0 0 2px #3730a3' : pipelineColor ? `0 0 0 1px ${pipelineColor}33` : '0 0 0 1px #1e1e2e',
    }}>

      {/* Row 1: Name + fit badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.name}
          </div>
          {isInbox && <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: '#052e16', padding: '2px 5px', borderRadius: 3, letterSpacing: '0.5px', border: '1px solid #065f46', flexShrink: 0 }}>NEW</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 8 }}>
          {pipelineColor && (
            <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${pipelineColor}22`, color: pipelineColor, border: `1px solid ${pipelineColor}55`, textTransform: 'capitalize' }}>
              {s.pipeline_status}
            </span>
          )}
          <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Row 2: One-liner (2-line clamp) */}
      <div style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.45, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {s.one_liner}
      </div>

      {/* Source row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: urgency || s.conviction_score > 0 || s.next_action ? 6 : 8 }}>
        {channel.icon === 'radar' ? (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="1.5" fill="#6b6b8a"/>
            <circle cx="6" cy="6" r="3.5" stroke="#6b6b8a" strokeWidth="1" fill="none" opacity="0.5"/>
            <circle cx="6" cy="6" r="5.5" stroke="#6b6b8a" strokeWidth="1" fill="none" opacity="0.25"/>
          </svg>
        ) : (
          <span style={{ fontSize: 11, color: channel.color, flexShrink: 0, lineHeight: 1 }}>{channel.icon}</span>
        )}
        <span style={{ fontSize: 11, color: channel.color }}>
          {s.score_source === 'email_intro' && s.introducer_name ? `Intro via ${s.introducer_name}` : channel.label}
        </span>
        {s.score_source === 'email_pitch' && s.email_subject && (
          <span style={{ fontSize: 11, color: '#555577', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            · "{s.email_subject}"
          </span>
        )}
      </div>

      {/* Inbound urgency */}
      {urgency && (
        <div style={{ fontSize: 11, color: urgency.color, marginBottom: 6 }}>{urgency.text}</div>
      )}

      {/* Conviction dots */}
      {s.conviction_score > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: '#555577', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', flexShrink: 0 }}>MY CONVICTION</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} style={{ width: 7, height: 7, borderRadius: '50%', background: n <= s.conviction_score ? '#8b5cf6' : '#1e1e2e' }} />
            ))}
          </div>
        </div>
      )}

      {/* Next action */}
      {s.next_action && (
        <div style={{ fontSize: 11, color: isOverdue ? '#ef4444' : '#8888aa', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          → {s.next_action}
        </div>
      )}

      {/* Tags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {s.funding_stage && s.funding_stage !== 'unknown' && <Tag>{s.funding_stage}</Tag>}
        {s.has_unseen_signals && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1e1b4b', color: '#a5b4fc', fontWeight: 600, border: '1px solid #3730a3' }}>⚡ Signal</span>
        )}
      </div>

      {/* Footer: time ago (suppressed when urgency already shows recency) */}
      {!urgency && s.scraped_at && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#3a3a5a' }}>{formatAddedDate(s.scraped_at)}</div>
      )}

      {/* Quick actions */}
      {showActions && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e1e2e' }}>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'watching') }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Watch</button>
          <button onClick={e => { e.stopPropagation(); onQuickAction(s, 'passed') }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1a1a2e', color: '#6b7280', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Pass</button>
          <button onClick={e => { e.stopPropagation(); onClick() }} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'transparent', color: '#555577', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>→ Memo</button>
        </div>
      )}
    </div>
  )
})

const CompanyRow = forwardRef(function CompanyRow({ startup: s, onClick, isSelected }, ref) {
  const badge = s.fit_score != null ? (FIT_BADGES[s.fit_score] || FIT_BADGES[2]) : { label: 'Pending', color: '#555577', bg: '#1a1a2e' }
  const accentColor = getAccentColor(s)
  const channel = getSourceChannel(s.score_source, s.source)
  const pipelineColor = s.pipeline_status && PIPELINE_COLORS[s.pipeline_status] ? PIPELINE_COLORS[s.pipeline_status] : null
  const isOverdue = s.next_action && s.next_action_due && new Date(s.next_action_due) < new Date()

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        height: 44, paddingLeft: 12, paddingRight: 16,
        borderLeft: `3px solid ${accentColor}`,
        borderBottom: '1px solid #0d0d1a',
        background: isSelected ? '#0d0d1a' : 'transparent',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#0d0d1a' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ minWidth: 180, maxWidth: 200, fontWeight: 600, fontSize: 14, color: '#f0f0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
        {s.name}
      </div>
      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: badge.bg, color: badge.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {badge.label}
      </span>
      <span style={{ fontSize: 10, color: channel.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {s.score_source === 'email_intro' && s.introducer_name ? `Intro via ${s.introducer_name}` : channel.label}
      </span>
      <div style={{ flex: 1, fontSize: 12, color: '#8888aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {s.one_liner}
      </div>
      {s.conviction_score > 0 && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: n <= s.conviction_score ? '#8b5cf6' : '#1e1e2e' }} />
          ))}
        </div>
      )}
      {s.next_action && (
        <div style={{ fontSize: 11, color: isOverdue ? '#ef4444' : '#8888aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160, flexShrink: 0 }}>
          → {s.next_action}
        </div>
      )}
      {pipelineColor && (
        <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${pipelineColor}22`, color: pipelineColor, border: `1px solid ${pipelineColor}55`, textTransform: 'capitalize', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {s.pipeline_status}
        </span>
      )}
      {s.has_unseen_signals && (
        <span style={{ fontSize: 10, color: '#a5b4fc', flexShrink: 0 }}>⚡</span>
      )}
      {s.scraped_at && (
        <div style={{ fontSize: 11, color: '#555577', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {formatAddedDate(s.scraped_at)}
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
