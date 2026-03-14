import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import HowItWorks from './HowItWorks'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      afterSignInUrl="/app"
      afterSignUpUrl="/app"
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/app/*" element={<App />} />
          <Route path="/sign-in/*" element={
            <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SignIn routing="path" path="/sign-in" afterSignInUrl="/app" signUpUrl="/sign-up" />
            </div>
          } />
          <Route path="/sign-up/*" element={
            <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SignUp routing="path" path="/sign-up" afterSignUpUrl="/app" signInUrl="/sign-in" />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
