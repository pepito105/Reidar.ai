# Radar Frontend — Claude Code Context

## Stack
- React 18 + Vite
- No Tailwind, no CSS files — inline styles only
- Recharts for data visualization
- Axios for API calls
- @tanstack/react-query — prefetching on login (startups, pipeline, market-map, signals-feed, last-scrape)
- Clerk for authentication (@clerk/clerk-react)
- Inter font from Google Fonts

## Absolute Rules
- NEVER use Tailwind classes
- NEVER create separate CSS files
- NEVER use className with external stylesheets
- All styling must be inline style={{}} objects
- Never use <form> tags — use onClick/onChange handlers instead

## API Pattern
API base URL from environment:
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

All requests include Clerk Bearer token:
  const { getToken } = useAuth()
  const token = await getToken().catch(() => null)
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await axios.get(`${API}/endpoint`, { headers })

## Auth Pattern
  import { useAuth } from '@clerk/clerk-react'
  const { getToken, isSignedIn, isLoaded } = useAuth()

Always handle token fetch failures gracefully with .catch(() => null)

## Notification System
NotificationDrawer.jsx polls /api/notifications/feed every 60 seconds.
It does NOT use /signals/feed — that's a separate older feed.

Notification event types and their styles:
  new_top_match:     { icon: '🎯', color: '#10b981', label: 'Top Match' }
  new_strong_fit:    { icon: '✦',  color: '#6366f1', label: 'Strong Fit' }
  research_complete: { icon: '⚡', color: '#6366f1', label: 'Research' }
  company_signal:    { icon: '📡', color: '#8888aa', label: 'Signal' }
  stale_deal:        { icon: '⚠️', color: '#f59e0b', label: 'Needs Attention' }

## Color System (dark theme throughout)
Background:    #0a0a0f (page), #0d0d14 (panels), #0f0f1a (cards)
Borders:       #1e1e2e (standard), #2a2a4a (elevated)
Text primary:  #f0f0ff
Text secondary: #8888aa
Text muted:    #555577

Fit score colors:
  5/5 Top Match:   #10b981 (green)
  4/5 Strong Fit:  #6366f1 (indigo)
  3/5 Possible:    #f59e0b (amber)

Accent colors:
  Primary:   #6366f1 (indigo)
  Purple:    #6c63ff (associate/chat)
  Success:   #10b981
  Warning:   #f59e0b
  Danger:    #ef4444

## Key Components
- App.jsx — main layout, routing, prefetch logic
- Home.jsx — dashboard with stats, daily brief, top matches
- Coverage.jsx — main company feed grid
- CompanyDetail.jsx — full company view with research, signals, pipeline
- Pipeline.jsx — Kanban board (watching/outreach/diligence/passed/invested)
- Portfolio.jsx — portfolio company tracking and management
- NotificationDrawer.jsx — bell icon + slide-in notification feed.
  NOTE: currently only mounted on the home screen. Not visible on
  coverage, pipeline, marketmap, or portfolio screens. This is a
  known limitation to fix.
- ChatPanel.jsx — AI associate chat (purple theme, SSE streaming)
- HotSignals.jsx — weekly market brief modal
- FirmSettings.jsx — firm profile configuration
- OnboardingModal.jsx — first-run setup flow

## Deleted Components (do not recreate)
- ActivityFeed.jsx — replaced by NotificationDrawer.jsx

## API Endpoints by Component
NotificationDrawer → /api/notifications/feed, /notifications/mark-all-seen,
                     /notifications/mark-seen/{id}
Home → /api/signals/feed, /api/signals/hot-signals, /api/startups/last-scrape
Coverage → /api/startups/
CompanyDetail → /api/startups/{id}, /api/startups/{id}/analyze/stream,
                /api/signals/company/{id}
Pipeline → /api/pipeline/, /api/pipeline/move
ChatPanel → /api/associate/chat (SSE streaming)

## SSE Streaming Pattern
For streaming endpoints (research, sourcing, chat):
  const eventSource = new EventSource(`${API}/endpoint?token=${token}`)
  eventSource.onmessage = (e) => {
    const data = JSON.parse(e.data)
    // handle data.type: 'stage' | 'complete' | 'error' | 'ping'
  }
  eventSource.onerror = () => eventSource.close()

## Pipeline Stages (in order)
watching → outreach → diligence → passed → invested

Stage colors:
  watching:  #6366f1
  outreach:  #f59e0b
  diligence: #10b981
  passed:    #6b7280
  invested:  #8b5cf6
