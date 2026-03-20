import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import HowItWorks from './HowItWorks'
import Pricing from './pages/Pricing'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  }
})

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      afterSignInUrl="/app"
      afterSignUpUrl="/app"
    >
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/app/*" element={<App />} />
          <Route path="/sign-in/*" element={
            <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 480, marginBottom: 16, paddingLeft: 8 }}>
                <button onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: 'none', color: '#8888aa', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ← Back to Reidar
                </button>
              </div>
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/app" signUpUrl="/sign-up" appearance={{
                variables: {
                  colorPrimary: '#6B47F5',
                  colorBackground: '#0a0a0f',
                  colorInputBackground: '#13131a',
                  colorInputText: '#ffffff',
                  colorText: '#ffffff',
                  colorTextSecondary: 'rgba(255,255,255,0.5)',
                  colorNeutral: '#ffffff',
                  borderRadius: '8px',
                },
                elements: {
                  card: {
                    backgroundColor: '#0f0f17',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 40px rgba(107,71,245,0.1)',
                  },
                  headerTitle: { color: '#ffffff', fontWeight: '600' },
                  headerSubtitle: { color: 'rgba(255,255,255,0.5)' },
                  socialButtonsBlockButton: {
                    backgroundColor: '#13131a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  },
                  formButtonPrimary: { backgroundColor: '#6B47F5' },
                  footerActionLink: { color: '#6B47F5' },
                  dividerLine: { backgroundColor: 'rgba(255,255,255,0.08)' },
                  dividerText: { color: 'rgba(255,255,255,0.3)' },
                  formFieldInput: {
                    backgroundColor: '#13131a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                  },
                },
              }} />
            </div>
          } />
          <Route path="/sign-up/*" element={
            <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 480, marginBottom: 16, paddingLeft: 8 }}>
                <button onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: 'none', color: '#8888aa', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ← Back to Reidar
                </button>
              </div>
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/app" signInUrl="/sign-in" />
            </div>
          } />
        </Routes>
      </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
