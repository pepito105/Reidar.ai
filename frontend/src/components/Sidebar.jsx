import { useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Home, Zap, LayoutList, Trophy, Map, Brain, Flame, MessageSquare, LogOut, Settings } from 'lucide-react'

export default function Sidebar({ screen, setScreen, firmProfile, setShowSignals, setShowChat, setShowOnboarding, setShowFirmSettings }) {
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)

  const nav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'coverage', label: 'Coverage', icon: Zap },
    { id: 'pipeline', label: 'Pipeline', icon: LayoutList },
    { id: 'portfolio', label: 'Portfolio', icon: Trophy },
    { id: 'marketmap', label: 'Market Map', icon: Map },
    { id: 'intelligence', label: 'Autopilot', icon: Brain },
  ]

  const w = collapsed ? 56 : 220

  return (
    <div style={{ width: w, minWidth: w, background: '#0d0d14', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0, transition: 'width 0.2s ease, min-width 0.2s ease', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: collapsed ? '20px 12px' : '24px 20px 20px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>◈</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#f0f0ff' }}>Reidar</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 500, letterSpacing: '0.5px' }}>AI ASSOCIATE</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◈</div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} style={{ background: 'transparent', border: 'none', color: '#555577', cursor: 'pointer', fontSize: 16, padding: '2px 4px', lineHeight: 1 }} title="Collapse">
            ◀
          </button>
        )}
      </div>

      {/* Firm name */}
      {!collapsed && firmProfile && (
        <div style={{ margin: '10px 10px 0', padding: '6px 10px', background: '#1a1a2e', borderRadius: 6, fontSize: 11, color: '#8888aa' }}>
          <span style={{ color: '#6366f1' }}>◆</span> {firmProfile.firm_name}
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {nav.map(item => (
          <button key={item.id} onClick={() => setScreen(item.id)} title={collapsed ? item.label : ''} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10, padding: collapsed ? '10px 0' : '9px 12px',
            borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
            background: screen === item.id ? '#1e1e3f' : 'transparent',
            color: screen === item.id ? '#a5b4fc' : '#8888aa',
            fontSize: 13, fontWeight: screen === item.id ? 600 : 400,
            transition: 'all 0.15s'
          }}>
            <item.icon size={16} />
            {!collapsed && item.label}
            {!collapsed && screen === item.id && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#6366f1' }} />}
          </button>
        ))}

        {/* Expand button at bottom of nav when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#555577', fontSize: 14, marginTop: 8 }} title="Expand">
            ▶
          </button>
        )}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid #1e1e2e' }}>
        <button onClick={() => setShowSignals(true)} title={collapsed ? 'Hot Signals' : ''} style={{
          width: '100%', padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 8, border: '1px solid #2a2a4a',
          background: 'linear-gradient(135deg, #1a1a3e, #1e1e4e)', color: '#a5b4fc',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 6,
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8
        }}>
          <Flame size={14} />{!collapsed && ' Hot Signals'}
        </button>
        <button onClick={() => setShowChat(true)} title={collapsed ? 'AI Analyst' : ''} style={{
          width: '100%', padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 8, border: '1px solid #2a2a4a',
          background: 'transparent', color: '#8888aa',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 6,
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8
        }}>
          <MessageSquare size={14} />{!collapsed && ' AI Analyst'}
        </button>
        <button onClick={() => signOut(() => window.location.href = '/')} style={{
          width: '100%', padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 8, border: 'none',
          background: 'transparent', color: '#555577',
          fontSize: 11, cursor: 'pointer', marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8
        }}>
          <LogOut size={14} />{!collapsed && ' Sign Out'}
        </button>
        <button onClick={() => setShowFirmSettings(true)} title={collapsed ? 'Firm Settings' : ''} style={{
          width: '100%', padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 8, border: 'none',
          background: 'transparent', color: '#555577',
          fontSize: 11, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8
        }}>
          <Settings size={14} />{!collapsed && ' Firm Settings'}
        </button>
      </div>
    </div>
  )
}
