import { useState } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Icons, theme } from './Icons.jsx'

export default function Sidebar({ screen, setScreen, firmProfile, setShowSignals, setShowChat, setShowOnboarding, setShowFirmSettings }) {
  const { signOut } = useClerk()
  const [collapsed, setCollapsed] = useState(false)

  const nav = [
    { id: 'home', label: 'Home', icon: Icons.home },
    { id: 'coverage', label: 'Coverage', icon: Icons.coverage },
    { id: 'pipeline', label: 'Pipeline', icon: Icons.pipeline },
    { id: 'portfolio', label: 'Portfolio', icon: Icons.portfolio },
    { id: 'marketmap', label: 'Market Map', icon: Icons.marketMap },
  ]

  const w = collapsed ? 56 : 220

  return (
    <div style={{ 
      width: w, 
      minWidth: w, 
      background: theme.bg.secondary, 
      borderRight: `1px solid ${theme.border.subtle}`, 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '0', 
      flexShrink: 0, 
      transition: 'width 0.2s ease, min-width 0.2s ease', 
      overflow: 'hidden' 
    }}>
      
      {/* Header */}
      <div style={{ 
        padding: collapsed ? '20px 12px' : '24px 20px 20px', 
        borderBottom: `1px solid ${theme.border.subtle}`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between' 
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${theme.accent.primary}, ${theme.accent.secondary})`, 
              borderRadius: 8, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flexShrink: 0 
            }}>
              {Icons.radar({ size: 18, color: '#fff' })}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: theme.text.primary }}>Radar</div>
              <div style={{ fontSize: 10, color: theme.accent.primary, fontWeight: 500, letterSpacing: '0.5px' }}>AI ASSOCIATE</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ 
            width: 32, 
            height: 32, 
            background: `linear-gradient(135deg, ${theme.accent.primary}, ${theme.accent.secondary})`, 
            borderRadius: 8, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {Icons.radar({ size: 18, color: '#fff' })}
          </div>
        )}
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: theme.text.muted, 
              cursor: 'pointer', 
              padding: '4px', 
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }} 
            title="Collapse"
          >
            {Icons.chevronLeft({ size: 16 })}
          </button>
        )}
      </div>

      {/* Firm name */}
      {!collapsed && firmProfile && (
        <div style={{ 
          margin: '10px 10px 0', 
          padding: '6px 10px', 
          background: theme.bg.tertiary, 
          borderRadius: 6, 
          fontSize: 11, 
          color: theme.text.secondary,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {Icons.diamond({ size: 10, color: theme.accent.primary })}
          <span>{firmProfile.firm_name}</span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {nav.map(item => {
          const isActive = screen === item.id
          return (
            <button 
              key={item.id} 
              onClick={() => setScreen(item.id)} 
              title={collapsed ? item.label : ''} 
              style={{
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 10, 
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: 8, 
                border: 'none', 
                cursor: 'pointer', 
                marginBottom: 2, 
                textAlign: 'left',
                background: isActive ? theme.bg.elevated : 'transparent',
                color: isActive ? theme.accent.primary : theme.text.secondary,
                fontSize: 13, 
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon({ size: 16, color: isActive ? theme.accent.primary : theme.text.secondary })}
              </span>
              {!collapsed && item.label}
              {!collapsed && isActive && (
                <div style={{ 
                  marginLeft: 'auto', 
                  width: 4, 
                  height: 4, 
                  borderRadius: '50%', 
                  background: theme.accent.primary 
                }} />
              )}
            </button>
          )
        })}

        {/* Expand button at bottom of nav when collapsed */}
        {collapsed && (
          <button 
            onClick={() => setCollapsed(false)} 
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '10px 0', 
              borderRadius: 8, 
              border: 'none', 
              cursor: 'pointer', 
              background: 'transparent', 
              color: theme.text.muted, 
              marginTop: 8 
            }} 
            title="Expand"
          >
            {Icons.chevronRight({ size: 16 })}
          </button>
        )}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '10px 8px', borderTop: `1px solid ${theme.border.subtle}` }}>
        <button 
          onClick={() => setShowSignals(true)} 
          title={collapsed ? 'Hot Signals' : ''} 
          style={{
            width: '100%', 
            padding: collapsed ? '10px 0' : '9px 12px', 
            borderRadius: 8, 
            border: `1px solid ${theme.border.default}`,
            background: `linear-gradient(135deg, ${theme.bg.elevated}, ${theme.bg.tertiary})`, 
            color: theme.accent.primary,
            fontSize: 12, 
            fontWeight: 600, 
            cursor: 'pointer', 
            marginBottom: 6,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            gap: 8
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {Icons.hotSignals({ size: 14, color: '#F59E0B' })}
          </span>
          {!collapsed && ' Hot Signals'}
        </button>
        <button 
          onClick={() => setShowChat(true)} 
          title={collapsed ? 'AI Analyst' : ''} 
          style={{
            width: '100%', 
            padding: collapsed ? '10px 0' : '9px 12px', 
            borderRadius: 8, 
            border: `1px solid ${theme.border.default}`,
            background: 'transparent', 
            color: theme.text.secondary,
            fontSize: 12, 
            fontWeight: 500, 
            cursor: 'pointer', 
            marginBottom: 6,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            gap: 8
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {Icons.chat({ size: 14 })}
          </span>
          {!collapsed && ' AI Analyst'}
        </button>
        <button 
          onClick={() => signOut(() => window.location.href = '/')} 
          style={{
            width: '100%', 
            padding: collapsed ? '10px 0' : '9px 12px', 
            borderRadius: 8, 
            border: 'none',
            background: 'transparent', 
            color: theme.text.muted,
            fontSize: 11, 
            cursor: 'pointer', 
            marginBottom: 4,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            gap: 8
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {Icons.signOut({ size: 14 })}
          </span>
          {!collapsed && ' Sign Out'}
        </button>
        <button 
          onClick={() => setShowFirmSettings(true)} 
          title={collapsed ? 'Firm Settings' : ''} 
          style={{
            width: '100%', 
            padding: collapsed ? '10px 0' : '9px 12px', 
            borderRadius: 8, 
            border: 'none',
            background: 'transparent', 
            color: theme.text.muted,
            fontSize: 11, 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            gap: 8
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {Icons.settings({ size: 14 })}
          </span>
          {!collapsed && ' Firm Settings'}
        </button>
      </div>
    </div>
  )
}
