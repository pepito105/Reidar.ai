import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'

const EVENT_STYLES = {
  new_top_match:      { icon: '🎯', color: '#10b981', label: 'Top Match' },
  new_strong_fit:     { icon: '✦',  color: '#6366f1', label: 'Strong Fit' },
  research_complete:  { icon: '⚡', color: '#6366f1', label: 'Research' },
  company_signal:     { icon: '📡', color: '#8888aa', label: 'Signal' },
  stale_deal:         { icon: '⚠️', color: '#f59e0b', label: 'Needs Attention' },
}

const SIGNAL_ICONS = {
  funding_round: '🟢', product_launch: '🚀', headcount_growth: '📈',
  news_mention: '📰', leadership_change: '👤', traction_update: '⚡',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+')
    ? dateStr
    : dateStr + 'Z'
  const diff = Date.now() - new Date(normalized).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function NotificationDrawer({ API, onSelectCompany }) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [feed, setFeed] = useState([])
  const [unseenCount, setUnseenCount] = useState(0)
  const drawerRef = useRef(null)

  const fetchFeed = async () => {
    try {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API}/notifications/feed`, {
        params: { days: 30, limit: 50 },
        headers,
      })
      setFeed(res.data.feed)
      setUnseenCount(res.data.unseen_count)
    } catch (e) {}
  }

  useEffect(() => {
    fetchFeed()
    const interval = setInterval(fetchFeed, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelectCompany = async (notif) => {
    if (!notif.is_seen) {
      try {
        const token = await getToken().catch(() => null)
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        await axios.post(`${API}/notifications/mark-seen/${notif.id}`, null, { headers })
        setFeed(f => f.map(n => n.id === notif.id ? { ...n, is_seen: true } : n))
        setUnseenCount(c => Math.max(0, c - 1))
      } catch (e) {}
    }
    setOpen(false)
    onSelectCompany && onSelectCompany(notif.startup_id)
  }

  const markAllSeen = async () => {
    try {
      const token = await getToken().catch(() => null)
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.post(`${API}/notifications/mark-all-seen`, null, { headers })
      setUnseenCount(0)
      setFeed(f => f.map(n => ({ ...n, is_seen: true })))
    } catch (e) {}
  }

  return (
    <>
      {/* Bell */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 16, right: 20, zIndex: 1000,
          background: '#0f0f1a', border: '1px solid #2a2a4a',
          borderRadius: 10, width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 16,
        }}
      >
        🔔
        {unseenCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 10,
            minWidth: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid #0a0a0f',
          }}>
            {unseenCount > 99 ? '99+' : unseenCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1100, backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Drawer */}
      <div ref={drawerRef} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#0d0d14', borderLeft: '1px solid #1e1e2e',
        zIndex: 1200, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.4)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #1e1e2e',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f0ff' }}>
              Notifications
            </div>
            <div style={{ fontSize: 11, color: '#555577', marginTop: 2 }}>
              {feed.length} events in the last 30 days
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {unseenCount > 0 && (
              <button onClick={markAllSeen} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a4a',
                background: 'transparent', color: '#8888aa', fontSize: 11,
                cursor: 'pointer', fontWeight: 500,
              }}>
                Mark all seen
              </button>
            )}
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: '#555577',
              fontSize: 18, cursor: 'pointer', padding: '4px 8px',
            }}>✕</button>
          </div>
        </div>

        {/* Feed */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {feed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555577' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📡</div>
              <div style={{ fontSize: 13 }}>No notifications yet</div>
            </div>
          ) : (
            feed.map((item, i) => {
              const style = EVENT_STYLES[item.event_type] || EVENT_STYLES.company_signal
              const icon = item.event_type === 'company_signal'
                ? (SIGNAL_ICONS[item.metadata?.signal_type] || '📡')
                : style.icon
              const thisDate = timeAgo(item.created_at)
              const prevDate = i > 0 ? timeAgo(feed[i - 1].created_at) : null
              const showDivider = i === 0 || thisDate !== prevDate

              return (
                <div key={item.id}>
                  {showDivider && (
                    <div style={{
                      padding: '8px 20px 4px',
                      fontSize: 10, fontWeight: 700,
                      color: '#3a3a5a', letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>
                      {thisDate}
                    </div>
                  )}
                  <div
                    onClick={() => item.startup_id && handleSelectCompany(item)}
                    style={{
                      padding: '12px 20px',
                      borderLeft: `3px solid ${item.is_seen ? 'transparent' : style.color}`,
                      background: item.is_seen ? 'transparent' : '#0f0f1f',
                      cursor: item.startup_id ? 'pointer' : 'default',
                      display: 'flex', gap: 12,
                      borderBottom: '1px solid #0f0f1a',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        gap: 6, marginBottom: 3, flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0ff' }}>
                          {item.startup_name || item.title}
                        </span>
                        <span style={{
                          fontSize: 9, fontWeight: 600, color: style.color,
                          padding: '1px 5px', borderRadius: 3,
                          border: `1px solid ${style.color}33`,
                        }}>
                          {style.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#c0c0e0', marginBottom: 3, lineHeight: 1.4 }}>
                        {item.title}
                      </div>
                      {item.body && (
                        <div style={{ fontSize: 11, color: '#555577', lineHeight: 1.4 }}>
                          {item.body}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
