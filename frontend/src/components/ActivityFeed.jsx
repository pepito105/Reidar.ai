import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'

const SIGNAL_TYPES = [
  { value: '', label: 'All Signals' },
  { value: 'funding_round', label: '🟢 Funding' },
  { value: 'product_launch', label: '🚀 Product' },
  { value: 'headcount_growth', label: '📈 Headcount' },
  { value: 'news_mention', label: '📰 News' },
  { value: 'leadership_change', label: '👤 Leadership' },
  { value: 'traction_update', label: '⚡ Traction' },
]

const FIT_BADGES = {
  5: { label: 'Top Match', color: '#10b981' },
  4: { label: 'Strong Fit', color: '#6366f1' },
  3: { label: 'Possible Fit', color: '#f59e0b' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function groupByDate(feed) {
  const groups = {}
  feed.forEach(item => {
    const date = new Date(item.detected_at)
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    let label
    if (days === 0) label = 'Today'
    else if (days === 1) label = 'Yesterday'
    else if (days < 7) label = 'This Week'
    else if (days < 14) label = 'Last Week'
    else label = 'Earlier'
    if (!groups[label]) groups[label] = []
    groups[label].push(item)
  })
  return groups
}

export default function ActivityFeed({ API, onSelectCompany }) {
  const { getToken } = useAuth()
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [unseenCount, setUnseenCount] = useState(0)
  const [signalType, setSignalType] = useState('')
  const [unseenOnly, setUnseenOnly] = useState(false)
  const [days, setDays] = useState(30)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchFeed = async () => {
    setLoading(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    try {
      const res = await axios.get(`${API}/signals/feed`, {
        params: { days, signal_type: signalType || undefined, unseen_only: unseenOnly },
        headers
      })
      setFeed(res.data.feed)
      setUnseenCount(res.data.unseen_count)
    } catch (e) {}
    setLoading(false)
  }

  useEffect(() => { fetchFeed() }, [days, signalType, unseenOnly])

  const markAllSeen = async () => {
    setMarkingAll(true)
    const token = await getToken().catch(() => null)
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    await axios.post(`${API}/signals/mark-all-seen`, null, { headers })
    await fetchFeed()
    setMarkingAll(false)
  }

  const grouped = groupByDate(feed)
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Last Week', 'Earlier']

  return (
    <div style={{ padding: '36px 40px', overflow: 'auto', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0ff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Activity Feed
            {unseenCount > 0 && (
              <span style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, verticalAlign: 'middle' }}>
                {unseenCount} new
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: '#555577', margin: 0 }}>
            Signals detected across all companies in your database
          </p>
        </div>
        {unseenCount > 0 && (
          <button onClick={markAllSeen} disabled={markingAll} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid #2a2a4a',
            background: 'transparent', color: '#8888aa', fontSize: 12,
            cursor: 'pointer', fontWeight: 500
          }}>
            {markingAll ? 'Marking...' : 'Mark all seen'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {SIGNAL_TYPES.map(t => (
          <button key={t.value} onClick={() => setSignalType(t.value)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid',
            borderColor: signalType === t.value ? '#4f46e5' : '#2a2a4a',
            background: signalType === t.value ? '#1e1b4b' : 'transparent',
            color: signalType === t.value ? '#a5b4fc' : '#6b7280',
            fontSize: 12, fontWeight: signalType === t.value ? 600 : 400,
            cursor: 'pointer'
          }}>{t.label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setUnseenOnly(!unseenOnly)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1px solid',
            borderColor: unseenOnly ? '#4f46e5' : '#2a2a4a',
            background: unseenOnly ? '#1e1b4b' : 'transparent',
            color: unseenOnly ? '#a5b4fc' : '#6b7280',
            fontSize: 12, cursor: 'pointer'
          }}>Unseen only</button>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{
            padding: '6px 12px', borderRadius: 8, border: '1px solid #2a2a4a',
            background: '#0f0f1a', color: '#8888aa', fontSize: 12, cursor: 'pointer'
          }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#555577', fontSize: 14 }}>Loading signals...</div>
      ) : feed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 14, color: '#555577' }}>No signals found for this filter</div>
        </div>
      ) : (
        groupOrder.filter(g => grouped[g]).map(groupLabel => (
          <div key={groupLabel} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#3a3a5a', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
              {groupLabel}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[groupLabel].map(item => {
                const badge = FIT_BADGES[item.company_fit_score]
                return (
                  <div key={item.id} onClick={() => onSelectCompany && onSelectCompany(item.startup_id)} style={{
                    background: item.is_seen ? '#0f0f1a' : '#0d0d1f',
                    border: '1px solid',
                    borderColor: item.is_seen ? '#1a1a2a' : '#2a2a4a',
                    borderLeft: `3px solid ${item.is_seen ? '#1e1e2e' : '#6366f1'}`,
                    borderRadius: 10, padding: '14px 18px',
                    cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start'
                  }}>
                    <div style={{ fontSize: 20, marginTop: 1, flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff' }}>{item.company_name}</span>
                        {badge && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: badge.color, padding: '1px 6px', borderRadius: 4, border: `1px solid ${badge.color}22` }}>
                            {badge.label}
                          </span>
                        )}
                        {!item.is_seen && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', padding: '1px 6px', borderRadius: 4, background: '#1e1b4b' }}>NEW</span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3a3a5a' }}>{timeAgo(item.detected_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#c0c0e0', marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{item.summary}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}