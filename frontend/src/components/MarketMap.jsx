import { useState, useEffect } from 'react'
import axios from 'axios'

const normalizeStage = (stage) => {
  if (!stage) return 'Unknown'
  const s = stage.toLowerCase().replace(/-/g, ' ').trim()
  if (s.includes('pre') && s.includes('seed')) return 'Pre-Seed'
  if (s === 'seed') return 'Seed'
  if (s.includes('series a')) return 'Series A'
  if (s.includes('series b')) return 'Series B'
  if (s.includes('series c')) return 'Series C'
  if (s.includes('series d')) return 'Series D'
  if (s === 'unknown' || s === '') return 'Unknown'
  if (s.includes('acqui')) return 'Acquired'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const FIT_LABELS = { 1: 'No Fit', 2: 'Weak', 3: 'Possible', 4: 'Strong', 5: 'Top Match' }
const FIT_COLORS = { 1: '#ef4444', 2: '#6b7280', 3: '#f59e0b', 4: '#6366f1', 5: '#10b981' }

export default function MarketMap({ API }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    axios.get(`${API}/market-map/`).then(res => setData(res.data))
  }, [API])

  if (!data) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#555577', fontFamily: "'Inter', sans-serif", background: '#0a0a0f', minHeight: '100%' }}>
        Loading market map...
      </div>
    )
  }

  const stageBreakdown = (data.stage_breakdown || []).reduce((acc, { name, value }) => {
    const normalized = normalizeStage(name)
    if (normalized === 'Unknown') return acc
    acc[normalized] = (acc[normalized] || 0) + value
    return acc
  }, {})
  const stageRows = Object.entries(stageBreakdown)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  const stageMax = Math.max(...stageRows.map(r => r.value), 1)

  const sectorCards = (data.sector_breakdown || []).slice(0, 12)

  const fitByScore = (data.fit_distribution || []).reduce((acc, item) => {
    const m = item.name?.match(/Score (\d)/)
    if (m) acc[parseInt(m[1], 10)] = item.value
    return acc
  }, {})
  const fitRows = [1, 2, 3, 4, 5].map(score => ({
    score,
    label: FIT_LABELS[score],
    color: FIT_COLORS[score],
    value: fitByScore[score] || 0,
  }))
  const fitMax = Math.max(...fitRows.map(r => r.value), 1)

  return (
    <div style={{ padding: '28px 32px', overflow: 'auto', background: '#0a0a0f', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', margin: 0, letterSpacing: '-0.5px' }}>Market Map</h1>
        <p style={{ fontSize: 13, color: '#555577', margin: '4px 0 0' }}>{data.total_companies} companies in database</p>
      </div>

      {/* Section 1 — Sector Cards Grid */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 16 }}>TOP SECTORS BY COMPANY COUNT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {sectorCards.map((sector) => {
            const avgFit = sector.avg_fit != null ? sector.avg_fit : 0
            const fitLabel = avgFit >= 4 ? 'Strong Fit' : avgFit >= 3 ? 'Possible Fit' : 'Weak Fit'
            const fitColor = avgFit >= 4 ? '#10b981' : avgFit >= 3 ? '#6366f1' : '#f59e0b'
            return (
              <div
                key={sector.name}
                style={{
                  background: '#0f0f1a',
                  border: '1px solid #1e1e2e',
                  borderRadius: 12,
                  padding: '16px 18px',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0ff', marginBottom: 8 }}>{sector.name}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#6366f1', marginBottom: 10 }}>{sector.value}</div>
                <div style={{ fontSize: 12, color: '#8888aa', marginTop: 8 }}>
                  Avg fit: <span style={{ color: fitColor, fontWeight: 600 }}>{avgFit.toFixed(1)} — {fitLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 2 — Stage Breakdown */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 16 }}>FUNDING STAGE BREAKDOWN</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stageRows.map((row) => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 90, fontSize: 13, color: '#c0c0e0', flexShrink: 0 }}>{row.name}</div>
                <div style={{ flex: 1, height: 28, background: '#1a1a2e', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                  <div
                    style={{
                      width: `${(row.value / stageMax) * 100}%`,
                      minWidth: row.value > 0 ? 4 : 0,
                      background: '#6366f1',
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div style={{ width: 36, fontSize: 13, fontWeight: 600, color: '#8888aa', textAlign: 'right', flexShrink: 0 }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3 — Fit Score Distribution */}
      <div>
        <div style={{ background: '#0f0f1a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginBottom: 16 }}>FIT SCORE DISTRIBUTION</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fitRows.map((row) => (
              <div key={row.score} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 90, fontSize: 13, color: '#c0c0e0', flexShrink: 0 }}>{row.label}</div>
                <div style={{ flex: 1, height: 28, background: '#1a1a2e', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
                  <div
                    style={{
                      width: `${(row.value / fitMax) * 100}%`,
                      minWidth: row.value > 0 ? 4 : 0,
                      background: row.color,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div style={{ width: 36, fontSize: 13, fontWeight: 600, color: '#8888aa', textAlign: 'right', flexShrink: 0 }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
