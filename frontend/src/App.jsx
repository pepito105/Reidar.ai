import { useState, useEffect } from 'react'
import { useAuth, UserButton, SignIn, SignUp } from '@clerk/clerk-react'
import Sidebar from './components/Sidebar.jsx'
import Home from './components/Home.jsx'
import Coverage from './components/Coverage.jsx'
import Pipeline from './components/Pipeline.jsx'
import MarketMap from './components/MarketMap.jsx'
import HotSignals from './components/HotSignals.jsx'
import OnboardingModal from './components/OnboardingModal.jsx'
import FirmSettings from './components/FirmSettings.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import NotificationDrawer from './components/NotificationDrawer.jsx'
import axios from 'axios'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api'

export default function App() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [screen, setScreen] = useState('home')
  const [firmProfile, setFirmProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const authHeaders = async () => {
    try {
      const token = await getToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch { return {} }
  }
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showFirmSettings, setShowFirmSettings] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showSignals, setShowSignals] = useState(false)
  const [coverageKey, setCoverageKey] = useState(0)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [toast, setToast] = useState({ message: '', submessage: '', visible: false })

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { setProfileLoading(false); return }
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarding') === 'true') {
      setShowOnboarding(true)
      setProfileLoading(false)
      return
    }
    authHeaders().then(headers => {
      axios.get(`${API}/firm-profile/`, { headers }).then(res => {
        if (res.data) setFirmProfile(res.data)
        else setShowOnboarding(true)
      }).catch(() => setShowOnboarding(true)).finally(() => setProfileLoading(false))
    })
  }, [isLoaded, isSignedIn])

  const showToast = (options) => {
    setToast({
      message: options.message || '',
      submessage: options.submessage || '',
      visible: true,
    })
    const duration = options.duration ?? 10000
    setTimeout(() => setToast(t => ({ ...t, visible: false })), duration)
  }

  useEffect(() => {
    if (!toast.visible) return
    const interval = setInterval(() => setCoverageKey(k => k + 1), 30000)
    const clear = setTimeout(() => clearInterval(interval), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
      clearTimeout(clear)
    }
  }, [toast.visible])

  const handleProfileSaved = (profile) => {
    setFirmProfile(profile)
    setShowOnboarding(false)
    setCoverageKey(k => k + 1)
  }

  if (!isLoaded || profileLoading) return <div style={{ background: '#0a0a0f', height: '100vh' }} />
  if (!isSignedIn) return (
    <div style={{ background: '#0a0a0f', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <SignUp routing="hash" signInUrl="/app" />
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', color: '#e8e8f0', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <Sidebar
        screen={screen}
        setScreen={setScreen}
        firmProfile={firmProfile}
        setShowSignals={setShowSignals}
        setShowChat={setShowChat}
        setShowOnboarding={setShowOnboarding}
        setShowFirmSettings={setShowFirmSettings}
      />

      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {screen === 'home' && (
          <>
            <Home API={API} firmProfile={firmProfile} onNavigate={(screen, company) => { setScreen(screen); setSelectedCompany(company ?? null); }} />
            <NotificationDrawer
              API={API}
              onSelectCompany={async (startupId) => {
                try {
                  const res = await axios.get(`${API}/startups/${startupId}`)
                  await axios.post(`${API}/signals/mark-seen/${startupId}`)
                  setSelectedCompany(res.data)
                  setScreen('coverage')
                } catch (e) {
                  setScreen('coverage')
                }
              }}
            />
          </>
        )}
        {screen === 'coverage' && (
          <Coverage
            key={coverageKey}
            API={API}
            selectedCompany={selectedCompany}
            onCompanyViewed={() => setSelectedCompany(null)}
          />
        )}
        {screen === 'pipeline' && <Pipeline API={API} />}
        {screen === 'marketmap' && <MarketMap API={API} />}
      </main>

      {showOnboarding && (
        <OnboardingModal API={API} onSaved={handleProfileSaved} onClose={() => { window.location.href = "/"; }} />
      )}
      {showFirmSettings && (
        <FirmSettings API={API} onSaved={handleProfileSaved} onClose={() => setShowFirmSettings(false)} onToast={showToast} />
      )}
      {toast.visible && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            zIndex: 4000,
            minWidth: 320,
            maxWidth: 380,
            padding: '14px 18px',
            background: '#0d0d14',
            border: '1px solid #1e1e2e',
            borderLeft: '4px solid #8b5cf6',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'toastFadeIn 0.25s ease-out',
          }}
        >
          <style>{`@keyframes toastFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <button
            type="button"
            onClick={() => setToast(t => ({ ...t, visible: false }))}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'none',
              border: 'none',
              color: '#8888aa',
              fontSize: 18,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{toast.message}</div>
          {toast.submessage && <div style={{ fontSize: 12, color: '#8888aa' }}>{toast.submessage}</div>}
        </div>
      )}
      {showSignals && (
        <HotSignals API={API} onClose={() => setShowSignals(false)} />
      )}
      {showChat && (
        <ChatPanel API={API} onClose={() => setShowChat(false)} />
      )}
    </div>
  )
}
