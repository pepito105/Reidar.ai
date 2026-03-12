export default function Sidebar({ screen, setScreen, firmProfile, setShowSignals, setShowChat, setShowOnboarding, setShowFirmSettings }) {
    const nav = [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'coverage', label: 'Coverage', icon: '⚡' },
      { id: 'pipeline', label: 'Pipeline', icon: '📋' },
      { id: 'marketmap', label: 'Market Map', icon: '🗺️' },
    ]
  
    return (
      <div style={{ width: 220, background: '#0d0d14', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◈</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#f0f0ff' }}>Radar</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 500, letterSpacing: '0.5px' }}>AI ASSOCIATE</div>
            </div>
          </div>
          {firmProfile && (
            <div style={{ marginTop: 12, padding: '6px 10px', background: '#1a1a2e', borderRadius: 6, fontSize: 11, color: '#8888aa' }}>
              <span style={{ color: '#6366f1' }}>◆</span> {firmProfile.firm_name}
            </div>
          )}
        </div>
  
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => setScreen(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
              background: screen === item.id ? '#1e1e3f' : 'transparent',
              color: screen === item.id ? '#a5b4fc' : '#8888aa',
              fontSize: 13, fontWeight: screen === item.id ? 600 : 400,
              transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
              {screen === item.id && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#6366f1' }} />}
            </button>
          ))}
        </nav>
  
        <div style={{ padding: '10px', borderTop: '1px solid #1e1e2e' }}>
          <button onClick={() => setShowSignals(true)} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a4a',
            background: 'linear-gradient(135deg, #1a1a3e, #1e1e4e)', color: '#a5b4fc',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>🔥</span> Hot Signals
          </button>
          <button onClick={() => setShowChat(true)} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #2a2a4a',
            background: 'transparent', color: '#8888aa',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>💬</span> AI Analyst
          </button>
          <button onClick={() => setShowFirmSettings(true)} style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', color: '#555577',
            fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span>⚙️</span> Firm Settings
          </button>
        </div>
      </div>
    )
  }