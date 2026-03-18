import { useState, useEffect, useRef } from 'react'
import { useAuth } from "@clerk/clerk-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import PortfolioImportModal from './PortfolioImportModal.jsx'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

const STATUS_ACCENTS = {
  active:   { color: '#10b981', label: 'Active' },
  acquired: { color: '#6366f1', label: 'Acquired' },
  exited:   { color: '#8b5cf6', label: 'Exited' },
  dead:     { color: '#6b7280', label: 'Dead' },
  unknown:  { color: '#10b981', label: 'Active' },
}

const STAGE_LABELS = {
  'pre-seed': 'Pre-Seed',
  'seed': 'Seed',
  'series-a': 'Series A',
  'series-b': 'Series B',
  'unknown': null,
}

const STATUS_ORDER = ['active', 'unknown', 'acquired', 'exited', 'dead']
const STATUS_GROUP_LABELS = {
  active: 'Active',
  unknown: 'Active',
  acquired: 'Acquired',
  exited: 'Exited',
  dead: 'Dead',
}

function StatTile({ label, value, accent, sub }) {
  return (
    <div style={{
      background: '#0f0f1a',
      border: '1px solid #1e1e2e',
      borderRadius: 10,
      padding: '18px 20px',
      flex: 1,
    }}>
      <div style={{
        fontSize: 26, fontWeight: 700,
        color: accent || '#f0f0ff',
        letterSpacing: '-0.5px', lineHeight: 1, marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: 11, color: '#555577', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: accent || '#8888aa', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

function PortfolioCard({ company, isSelected, onClick }) {
  const statusKey = company.portfolio_status || 'unknown'
  const accent = STATUS_ACCENTS[statusKey] || STATUS_ACCENTS.unknown
  const stage = STAGE_LABELS[company.funding_stage] ?? company.funding_stage ?? null
  const coInvestors = company.co_investors || []
  const checkSize = company.check_size_usd
    ? `${(company.check_size_usd / 1000).toFixed(0)}K`
    : null
  const investmentDate = company.investment_date
    ? new Date(company.investment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? '#13132a' : '#0f0f1a',
        borderLeft: `3px solid ${accent.color}`,
        borderRadius: 10,
        padding: '14px 16px',
        boxShadow: isSelected ? '0 0 0 2px #3730a3' : '0 0 0 1px #1e1e2e',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.boxShadow = `0 0 0 1px ${accent.color}44` }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.boxShadow = '0 0 0 1px #1e1e2e' }}
    >
      {/* Row 1: Name + status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <div style={{
          fontWeight: 700, fontSize: 14, color: '#f0f0ff',
          flex: 1, minWidth: 0, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {company.name}
        </div>
        <span style={{
          padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
          background: `${accent.color}22`, color: accent.color,
          border: `1px solid ${accent.color}55`,
          whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0,
        }}>
          {accent.label}
        </span>
      </div>

      {/* Row 2: One-liner */}
      {company.one_liner && (
        <div style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.45, marginBottom: 10 }}>
          {company.one_liner}
        </div>
      )}

      {/* Row 3: Tags */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {stage && stage !== '—' && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>
            {stage}
          </span>
        )}
        {checkSize && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#0d2010', color: '#10b981', border: '1px solid #1e3e1e' }}>
            {checkSize}
          </span>
        )}
        {investmentDate && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1a1a2e', color: '#6b7280', border: '1px solid #2a2a4a' }}>
            {investmentDate}
          </span>
        )}
        {company.sector && (
          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, background: '#1e1a2e', color: '#a78bfa', border: '1px solid #2e2a4a' }}>
            {company.sector}
          </span>
        )}
      </div>

      {/* Website */}
      {company.website && (
        <div style={{ marginTop: 8 }}>
          <a
            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {company.website.replace(/https?:\/\//, '')} ↗
          </a>
        </div>
      )}
    </div>
  )
}

function PortfolioDetailPanel({ company, onClose, onUpdate }) {
  const { getToken } = useAuth()
  const [portfolioStatus, setPortfolioStatus] = useState(company.portfolio_status || 'active')
  const [notes, setNotes] = useState(company.notes || '')
  const [checkSize, setCheckSize] = useState(company.check_size_usd || '')
  const [investmentDate, setInvestmentDate] = useState(
    company.investment_date
      ? new Date(company.investment_date).toISOString().split('T')[0]
      : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const isFirstRender = useRef(true)

  const accent = STATUS_ACCENTS[portfolioStatus] || STATUS_ACCENTS.unknown
  const stage = STAGE_LABELS[company.funding_stage] ?? company.funding_stage ?? null
  const coInvestors = company.co_investors || []

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#0a0a0f', border: '1px solid #2a2a4a',
    borderRadius: 6, padding: '7px 10px',
    color: '#f0f0ff', fontSize: 12, outline: 'none',
    fontFamily: 'inherit',
  }

  const save = async () => {
    setSaving(true)
    try {
      const token = await getToken().catch(() => null)
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const payload = {
        portfolio_status: portfolioStatus,
        notes: notes || null,
        check_size_usd: checkSize ? parseFloat(checkSize) : null,
        investment_date: investmentDate || null,
      }
      await fetch(`${API}/startups/${company.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onUpdate && onUpdate({ ...payload, id: company.id })
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    save()
  }, [portfolioStatus])

  return (
    <div style={{
      width: '100%',
      background: '#0d0d14', overflow: 'auto',
      flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px', borderBottom: '1px solid #1e1e2e',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f0f0ff', margin: 0 }}>
              {company.name}
            </h2>
            <span style={{
              padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
              background: `${accent.color}22`, color: accent.color,
              border: `1px solid ${accent.color}55`, flexShrink: 0,
            }}>
              {accent.label}
            </span>
          </div>
          {company.website && (
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}
            >
              {company.website.replace(/https?:\/\//, '')} ↗
            </a>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#555577', fontSize: 18, cursor: 'pointer', padding: '0 0 0 12px', flexShrink: 0 }}
        >✕</button>
      </div>

      {/* Body */}
      <div style={{ padding: '20px', flex: 1, overflow: 'auto' }}>

        {/* Description */}
        {company.one_liner && (
          <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6, marginBottom: 20 }}>
            {company.one_liner}
          </div>
        )}

        {/* Section 1: Portfolio Status */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a5a', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Portfolio Status
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['active', 'acquired', 'exited', 'dead'].map(s => {
              const a = STATUS_ACCENTS[s]
              const isActive = portfolioStatus === s
              return (
                <button
                  key={s}
                  onClick={() => setPortfolioStatus(s)}
                  style={{
                    padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: isActive ? `${a.color}22` : '#0f0f1a',
                    color: isActive ? a.color : '#3a3a5a',
                    outline: `1px solid ${isActive ? `${a.color}55` : '#1e1e2e'}`,
                  }}
                >
                  {a.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Investment Details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a5a', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
            Investment Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#555577', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Stage</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>
                {stage && stage !== '—' ? stage : '—'}
              </div>
            </div>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#555577', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Check Size ($)</div>
              <input
                type="number"
                value={checkSize}
                onChange={e => setCheckSize(e.target.value)}
                placeholder="e.g. 500000"
                style={inputStyle}
              />
            </div>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#555577', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Date</div>
              <input
                type="date"
                value={investmentDate}
                onChange={e => setInvestmentDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#555577', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sector</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>
                {company.sector || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Co-investors */}
        {coInvestors.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a5a', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
              Co-Investors
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {coInvestors.map((inv, i) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  background: '#1a1a2e', color: '#8888aa', border: '1px solid #2a2a4a',
                }}>
                  {inv}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Notes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3a3a5a', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
            Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Board updates, milestones, concerns..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          />
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          style={{
            width: '100%', padding: '10px', borderRadius: 8, border: 'none',
            background: saved
              ? '#10b981'
              : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

function SectorDistribution({ companies }) {
  const sectorMap = {}
  companies.forEach(c => {
    if (c.sector) sectorMap[c.sector] = (sectorMap[c.sector] || 0) + 1
  })
  const sectors = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const max = sectors[0]?.[1] || 1

  if (sectors.length === 0) return null

  return (
    <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
        Sector Distribution
      </div>
      {sectors.map(([sector, count]) => (
        <div key={sector} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#c0c0e0' }}>{sector}</span>
            <span style={{ fontSize: 11, color: '#555577' }}>{count}</span>
          </div>
          <div style={{ height: 3, background: '#1e1e2e', borderRadius: 2 }}>
            <div style={{ height: 3, background: '#6366f1', borderRadius: 2, width: `${(count / max) * 100}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Portfolio() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)

  const { data: companies = [], isLoading: loading, error } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API}/startups/portfolio`, { headers })
      if (!res.ok) throw new Error('Failed to load portfolio')
      return res.json()
    },
    staleTime: 1000 * 60 * 10,
  })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#555577', fontSize: 14 }}>Loading portfolio…</div>
    </div>
  )

  if (error) return (
    <div style={{ padding: 32, color: '#ef4444', fontSize: 14 }}>Failed to load: {error?.message}</div>
  )

  // Stats
  const total = companies.length
  const active = companies.filter(c => !c.portfolio_status || c.portfolio_status === 'active' || c.portfolio_status === 'unknown').length
  const exits = companies.filter(c => ['acquired', 'exited'].includes(c.portfolio_status)).length
  const exitRate = total > 0 ? Math.round((exits / total) * 100) : 0
  const totalDeployed = companies.reduce((sum, c) => sum + (c.check_size_usd || 0), 0)
  const deployedLabel = totalDeployed > 0
    ? totalDeployed >= 1_000_000
      ? `${(totalDeployed / 1_000_000).toFixed(1)}M`
      : `${(totalDeployed / 1000).toFixed(0)}K`
    : '—'

  // Co-investor frequency
  const coInvestorMap = {}
  companies.forEach(c => {
    (c.co_investors || []).forEach(inv => {
      coInvestorMap[inv] = (coInvestorMap[inv] || 0) + 1
    })
  })
  const topCoInvestors = Object.entries(coInvestorMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Group by status
  const grouped = {}
  STATUS_ORDER.forEach(s => { grouped[s] = [] })
  companies.forEach(c => {
    const key = c.portfolio_status || 'unknown'
    if (grouped[key]) grouped[key].push(c)
    else grouped['unknown'].push(c)
  })
  // Merge active + unknown into one group
  const activeGroup = [...grouped['active'], ...grouped['unknown']]
  const acquiredGroup = grouped['acquired']
  const exitedGroup = grouped['exited']
  const deadGroup = grouped['dead']

  const groups = [
    { key: 'active', label: 'Active', companies: activeGroup, color: '#10b981' },
    { key: 'acquired', label: 'Acquired', companies: acquiredGroup, color: '#6366f1' },
    { key: 'exited', label: 'Exited', companies: exitedGroup, color: '#8b5cf6' },
    { key: 'dead', label: 'Dead', companies: deadGroup, color: '#6b7280' },
  ].filter(g => g.companies.length > 0)

  if (total === 0) return (
    <div style={{ padding: '28px 32px', background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏆</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0ff', marginBottom: 8 }}>No portfolio companies yet</div>
        <div style={{ fontSize: 13, color: '#555577', marginBottom: 24 }}>
          Import your existing portfolio to track investments and find co-investor patterns.
        </div>
        <button onClick={() => setShowImportModal(true)} style={{
          padding: '10px 24px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Import Portfolio
        </button>
      </div>
      {showImportModal && (
        <PortfolioImportModal
          API={API}
          onClose={() => setShowImportModal(false)}
          onImported={() => { queryClient.invalidateQueries({ queryKey: ['portfolio'] }); setShowImportModal(false) }}
        />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0a0a0f' }}>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', margin: 0, letterSpacing: '-0.5px' }}>Portfolio</h1>
            <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>{total} companies backed</p>
          </div>
          <button onClick={() => setShowImportModal(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            + Import
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          <StatTile label="Total Backed" value={total} />
          <StatTile label="Active" value={active} accent="#10b981" sub={`${Math.round((active/total)*100)}% of portfolio`} />
          <StatTile label="Exits" value={exits} accent="#8b5cf6" sub={`${exitRate}% exit rate`} />
          <StatTile label="Capital Deployed" value={deployedLabel} accent="#f59e0b" />
        </div>

        {/* Grouped company sections */}
        {groups.map(group => (
          <div key={group.key} style={{ marginBottom: 32 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: group.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {group.label}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, color: group.color,
                background: `${group.color}22`, padding: '1px 7px',
                borderRadius: 10, border: `1px solid ${group.color}44`,
              }}>
                {group.companies.length}
              </span>
              <div style={{ flex: 1, height: 1, background: '#1e1e2e' }} />
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {group.companies.map(c => (
                <PortfolioCard
                  key={c.id}
                  company={c}
                  isSelected={selectedCompany?.id === c.id}
                  onClick={() => setSelectedCompany(selectedCompany?.id === c.id ? null : c)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Right panel — detail or intelligence */}
      <div style={{ width: selectedCompany ? 420 : 280, borderLeft: '1px solid #1e1e2e', overflow: 'auto', flexShrink: 0, background: '#0d0d14', transition: 'width 0.2s ease' }}>
        {selectedCompany ? (
          <PortfolioDetailPanel
            company={selectedCompany}
            onClose={() => setSelectedCompany(null)}
            onUpdate={(updated) => {
              setSelectedCompany(c => ({ ...c, ...updated }))
              queryClient.invalidateQueries({ queryKey: ['portfolio'] })
            }}
          />
        ) : (
          <div style={{ padding: '20px 18px' }}>
            <SectorDistribution companies={companies} />

            {/* Co-investors */}
            {topCoInvestors.length > 0 && (
              <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 14 }}>
                  Top Co-Investors
                </div>
                {topCoInvestors.map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#c0c0e0' }}>{name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#1a1a3e', padding: '2px 7px', borderRadius: 8 }}>
                      {count} deal{count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: '#3a3a5a', marginTop: 14, lineHeight: 1.5, borderTop: '1px solid #1e1e2e', paddingTop: 12 }}>
                  Use these relationships for warm intros on new deals.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showImportModal && (
        <PortfolioImportModal
          API={API}
          onClose={() => setShowImportModal(false)}
          onImported={() => { queryClient.invalidateQueries({ queryKey: ['portfolio'] }); setShowImportModal(false) }}
        />
      )}
    </div>
  )
}
