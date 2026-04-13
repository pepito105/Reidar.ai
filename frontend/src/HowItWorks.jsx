import { useState, useEffect, useRef } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";

const APP_URL = "/app";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const STYLES = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; -webkit-font-smoothing:antialiased; }
  body { background:#07070A; color:#EBEBEB; font-family:'DM Sans',sans-serif; overflow-x:hidden; }

  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }

  .nav { position:fixed;inset:0 0 auto;z-index:200;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,7,10,.9);backdrop-filter:blur(18px); }
  .nav-logo { display:flex;align-items:center;gap:9px;text-decoration:none; }
  .nav-mark-wrap { position:relative;width:26px;height:26px; }
  .nav-mark-ring { position:absolute;inset:0;width:26px;height:26px;border-radius:7px;border:1px solid rgba(107,71,245,.5);animation:radarPing 2s ease-out infinite; }
  .nav-mark-ring.nav-mark-ring-delay { animation-delay:1s; }
  .nav-mark { position:relative;z-index:1;width:26px;height:26px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(107,71,245,.5),0 0 16px rgba(107,71,245,.25); }
  .nav-name { font-size:15px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em; }
  .nav-center { position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:4px; }
  .nav-a { font-size:13px;color:rgba(235,235,235,.42);text-decoration:none;padding:5px 10px;border-radius:6px;transition:all .15s; }
  .nav-a:hover { color:#EBEBEB;background:rgba(255,255,255,.05); }
  .nav-a.active { color:#A992FA; }
  .nav-right { display:flex;align-items:center;gap:8px; }
  .btn-ghost { font:13px/1 'DM Sans',sans-serif;color:rgba(235,235,235,.6);background:transparent;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:7px;cursor:pointer;transition:all .15s; }
  .btn-ghost:hover { border-color:rgba(255,255,255,.22);color:#EBEBEB; }
  .btn-pri { font:13px/1 'DM Sans',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;transition:all .15s;box-shadow:0 0 18px rgba(107,71,245,.3); }
  .btn-pri:hover { background:#7D5CF7;box-shadow:0 0 28px rgba(107,71,245,.5); }

  .footer { border-top:1px solid rgba(255,255,255,.05);padding:24px 40px;display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:0 auto; }
  .foot-l { font-size:12px;color:rgba(235,235,235,.2); }
  .foot-r { font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.15);letter-spacing:.06em; }
  .foot-link { color:rgba(235,235,235,.3);text-decoration:none;font-size:12px; }
  .foot-link:hover { color:rgba(235,235,235,.6); }

  @media(max-width:768px) {
    .nav-center { display:none; }
    .hiw-two-col { grid-template-columns:1fr !important; }
    .hiw-three-col { grid-template-columns:1fr !important; }
  }
  @media(max-width:640px) {
    .nav { padding:0 20px; }
    .footer { flex-direction:column;gap:12px;text-align:center;padding:24px; }
  }
`;

/* ─── SCROLL ENTRY HOOK ─── */
function useSectionEntry() {
  const [entered, setEntered] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setEntered(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [entered, ref];
}

/* ─── MAIN ─── */
export default function HowItWorks() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    document.title = "How Reidar Works — AI Investment Associate for Venture Capital";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', "See how Reidar captures institutional memory from your firm's decisions, sources companies against your mandate, and surfaces intelligence at the right moment — without any manual effort.");
  }, []);

  const goApp = () => { window.location.href = APP_URL; };

  return (
    <>
      <style>{FONTS + STYLES}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-mark-wrap">
            <div className="nav-mark-ring" />
            <div className="nav-mark-ring nav-mark-ring-delay" />
            <div className="nav-mark">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="7" cy="7" r="2" fill="white"/>
              </svg>
            </div>
          </div>
          <span className="nav-name">Reidar</span>
        </a>
        <div className="nav-center">
          <a href="/how-it-works" className={`nav-a${window.location.pathname === '/how-it-works' ? ' active' : ''}`}>How it works</a>
          <a href="/pricing" className={`nav-a${window.location.pathname === '/pricing' ? ' active' : ''}`}>Pricing</a>
        </div>
        <div className="nav-right">
          {isSignedIn ? (
            <><button className="btn-pri" onClick={goApp}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
          ) : (
            <><button className="btn-ghost" onClick={() => window.location.href = '/sign-in'}>Sign in</button><button className="btn-pri" onClick={() => window.location.href = '/sign-up'}>Join the waitlist</button></>
          )}
        </div>
      </nav>

      {/* ── SECTION 1: HERO ── */}
      <div style={{ paddingTop: 140, paddingBottom: 100, paddingLeft: 48, paddingRight: 48 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: '0.12em', color: '#A992FA', textTransform: 'uppercase', marginBottom: 20 }}>
            How Reidar works
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(40px,5.5vw,62px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: 20 }}>
            Bring everything your firm has.<br />Reidar makes it useful from day one.
          </h1>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'rgba(235,235,235,0.5)', lineHeight: 1.75, maxWidth: 580, margin: '0 auto' }}>
            Setup takes 10 minutes. After that, Reidar learns continuously from your normal workflow — every email, meeting, and decision — without any manual effort. The longer you use it, the smarter it gets.
          </p>
        </div>
      </div>

      {/* ── SECTION 2: THREE SETUP STEPS ── */}
      <section style={{ padding: '0 48px 120px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', color: '#A992FA', textTransform: 'uppercase', marginBottom: 16 }}>
              Getting started
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Three steps. Then Reidar works.
            </h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'rgba(235,235,235,0.45)', margin: '0 auto' }}>
              You configure once. Everything after that is automatic.
            </p>
          </div>

          <div className="hiw-three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>

            {/* Step 1 */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid #6B47F5', borderRadius: 12, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(107,71,245,0.5)', letterSpacing: '0.1em', marginBottom: 16 }}>01</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: '#EBEBEB', marginBottom: 10 }}>Describe your mandate.</div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(235,235,235,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                Your firm's investment thesis in plain English. Stage focus, geography, check size, sectors to exclude. This becomes the filter every company is scored against — and the lens every agent uses when it generates output.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '4px 10px', background: 'rgba(107,71,245,0.08)', border: '1px solid rgba(107,71,245,0.15)', borderRadius: 3, color: 'rgba(107,71,245,0.6)', marginBottom: 20 }}>
                ~2 minutes
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.08em', marginBottom: 6 }}>INVESTMENT THESIS</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 10, fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.5)', lineHeight: 1.6 }}>
                  We invest in AI-native B2B SaaS companies automating knowledge work in regulated verticals at pre-seed and seed stage.
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {['Pre-seed', 'Seed'].map(s => (
                    <span key={s} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '3px 8px', background: 'rgba(107,71,245,0.1)', border: '1px solid rgba(107,71,245,0.2)', color: '#A992FA', borderRadius: 3 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid #D97706', borderRadius: 12, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(107,71,245,0.5)', letterSpacing: '0.1em', marginBottom: 16 }}>02</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: '#EBEBEB', marginBottom: 10 }}>Connect your workflow.</div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(235,235,235,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                Gmail, Slack, Google Calendar, and Granola. Reidar watches these surfaces automatically — triaging inbound, capturing meeting context, logging interactions. You don't change how you work. You just connect.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '4px 10px', background: 'rgba(107,71,245,0.08)', border: '1px solid rgba(107,71,245,0.15)', borderRadius: 3, color: 'rgba(107,71,245,0.6)', marginBottom: 20 }}>
                ~3 minutes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { dot: '#EA4335', name: 'Gmail' },
                  { dot: '#4ade80', name: 'Slack' },
                  { dot: '#4285F4', name: 'Google Calendar' },
                  { dot: 'rgba(235,235,235,0.3)', name: 'Granola' },
                ].map(({ dot, name }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.6)', flex: 1 }}>{name}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 7px', borderRadius: 3 }}>connected</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid #10b981', borderRadius: 12, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(107,71,245,0.5)', letterSpacing: '0.1em', marginBottom: 16 }}>03</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: '#EBEBEB', marginBottom: 10 }}>Import your history.</div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(235,235,235,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                Upload a CSV from your CRM, connect Notion, paste your portfolio. Every past decision — investments, passes, deal notes, transcripts — becomes Pool 2 context immediately. The more history you bring, the smarter Reidar is from day one.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '4px 10px', background: 'rgba(107,71,245,0.08)', border: '1px solid rgba(107,71,245,0.15)', borderRadius: 3, color: 'rgba(107,71,245,0.6)', marginBottom: 20 }}>
                ~5 minutes
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#10b981' }}>Import complete</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" fill="rgba(16,185,129,.12)" stroke="rgba(16,185,129,.4)" strokeWidth=".9"/><path d="M3.5 6L5 7.5L8.5 4" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    ['affinity_export.csv', '847 companies'],
                    ['deal_notes_2023–2025.csv', '312 evaluations'],
                    ['portfolio_companies.csv', '23 portfolio cos'],
                    ['granola_transcripts/', '67 transcripts'],
                    ['pitch_decks/', '156 documents'],
                  ].map(([file, count], i, arr) => (
                    <div key={file} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.4)' }}>{file}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.3)' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px -14px -14px', padding: '10px 14px', borderTop: '1px solid rgba(107,71,245,0.15)', background: 'rgba(107,71,245,0.04)', borderRadius: '0 0 6px 6px' }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#A992FA' }}>Pool 2 initialized</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: '#A992FA' }}>1,405 signals extracted</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 3: TWO WAYS REIDAR LEARNS ── */}
      <section style={{ padding: '120px 48px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', color: '#A992FA', textTransform: 'uppercase', marginBottom: 16 }}>
              How it learns
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Two ways to teach Reidar.<br />Both happen naturally.
            </h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'rgba(235,235,235,0.45)', maxWidth: 540, margin: '0 auto' }}>
              Reidar learns from how you work and from what you tell it. Both update the same agent stack. Neither requires a training session.
            </p>
          </div>

          <div className="hiw-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left — Passive */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid #6B47F5', borderRadius: 12, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(107,71,245,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>
                PASSIVE — always on
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: '#EBEBEB', marginBottom: 10 }}>
                Reidar watches how you work.
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(235,235,235,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                Every score override, pass reason, IC objection, and pipeline move is automatically extracted as a structured signal. No forms. No logging. No Friday reflection sessions.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.08em' }}>
                  SIGNALS CAPTURED TODAY
                </div>
                {[
                  { dot: '#D97706', text: 'Pass: Synthos — no enterprise GTM', time: '09:14' },
                  { dot: '#6B47F5', text: 'Score override: Meridian +2',        time: '11:32' },
                  { dot: '#A992FA', text: 'IC objection: defensibility (Maria)', time: '14:05' },
                  { dot: '#10b981', text: 'Conviction shift: DataCorp ↑',        time: '15:47' },
                  { dot: '#D97706', text: 'Pass: NexusAI — market too early',    time: '16:22' },
                ].map(({ dot, text, time }, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.45)', flex: 1, lineHeight: 1.4 }}>{text}</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,0.2)' }}>{time}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(107,71,245,0.04)', borderTop: '1px solid rgba(107,71,245,0.1)' }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(107,71,245,0.5)' }}>5 signals today</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(107,71,245,0.35)' }}>1,410 total</span>
                </div>
              </div>
            </div>

            {/* Right — Active */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid #10b981', borderRadius: 12, padding: 28 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '0.1em', color: 'rgba(16,185,129,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>
                ACTIVE — when you want
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 600, color: '#EBEBEB', marginBottom: 10 }}>
                Tell Reidar something directly.
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'rgba(235,235,235,0.45)', lineHeight: 1.7, marginBottom: 20 }}>
                Type something in plain English and Reidar updates the relevant agent skill immediately. The next brief it generates reflects what you told it — for every deal, forever.
              </p>
              {/* Conversation mock — example 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(107,71,245,0.12)', border: '1px solid rgba(107,71,245,0.2)', borderRadius: '14px 14px 3px 14px', padding: '11px 15px', maxWidth: '80%', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(235,235,235,0.9)', lineHeight: 1.55 }}>
                    We never back first-time founders in healthcare without a clinical operator on the team.
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(107,71,245,0.18)', border: '1px solid rgba(107,71,245,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.4" fill="none"/><circle cx="7" cy="7" r="2.2" fill="#A992FA"/></svg>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(169,146,250,0.52)', letterSpacing: '0.05em' }}>REIDAR</span>
                  </div>
                  <div style={{ paddingLeft: 30, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(235,235,235,0.7)', lineHeight: 1.6 }}>
                    Got it. First-time founders in healthcare will now flag without a clinical operator — reflected in every brief going forward.
                  </div>
                </div>
                <div style={{ paddingLeft: 30, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(16,185,129,0.7)' }}>vc-founder-assessment · updated</span>
                </div>
              </div>
              {/* Conversation mock — example 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(107,71,245,0.12)', border: '1px solid rgba(107,71,245,0.2)', borderRadius: '14px 14px 3px 14px', padding: '11px 15px', maxWidth: '80%', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(235,235,235,0.9)', lineHeight: 1.55 }}>
                    Our IC always pushes back on market size for B2B SaaS. Prepare for it.
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(107,71,245,0.18)', border: '1px solid rgba(107,71,245,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.4" fill="none"/><circle cx="7" cy="7" r="2.2" fill="#A992FA"/></svg>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(169,146,250,0.52)', letterSpacing: '0.05em' }}>REIDAR</span>
                  </div>
                  <div style={{ paddingLeft: 30, fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(235,235,235,0.7)', lineHeight: 1.6 }}>
                    Noted. I'll pre-empt the market size objection in every IC prep brief for B2B SaaS deals going forward.
                  </div>
                </div>
                <div style={{ paddingLeft: 30, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(16,185,129,0.7)' }}>vc-ic-prep · updated</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: DAY ONE VS MONTH TWELVE ── */}
      <section style={{ padding: '120px 48px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', color: '#A992FA', textTransform: 'uppercase', marginBottom: 16 }}>
              The compounding effect
            </div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 12 }}>
              Day one vs. month twelve.
            </h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'rgba(235,235,235,0.45)', margin: '0 auto' }}>
              The agent stack starts with a generic baseline. After 12 months it reflects exactly how your firm thinks.
            </p>
          </div>

          <div className="hiw-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left — Day one */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(235,235,235,0.4)', borderRadius: 3 }}>Day one</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: 'rgba(235,235,235,0.5)' }}>Generic baseline</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['FOUNDER ASSESSMENT', 'Generic signals — technical background, prior exits, domain experience'],
                  ['MANDATE FIT',        'Based on your stated thesis from setup'],
                  ['IC PREP',            'Standard objection categories — market size, team, competition'],
                  ['PASS PATTERNS',      'No history yet — every company evaluated from scratch'],
                  ['COMPARABLE DEALS',   'Global database matches only'],
                  ['MARKET TIMING',      'Public data — same signals everyone has'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.2)' }}>·</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.35)', lineHeight: 1.5 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Month twelve */}
            <div style={{ background: '#0C0C10', border: '1px solid rgba(107,71,245,0.2)', borderTop: '2px solid #6B47F5', borderRadius: 12, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '4px 10px', background: 'rgba(107,71,245,0.1)', border: '1px solid rgba(107,71,245,0.2)', color: '#A992FA', borderRadius: 3 }}>Month 12</span>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: '#EBEBEB' }}>Firm-calibrated</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['FOUNDER ASSESSMENT', "Knows your pattern: technical domain experts with prior exits in regulated verticals — your 4 best outcomes match this exactly"],
                  ['MANDATE FIT',        "Calibrated from 847 evaluations — knows where you've drifted from your stated thesis and why"],
                  ['IC PREP',            'Maria always challenges defensibility. James flags market size on every B2B SaaS deal. Responses prepared in advance.'],
                  ['PASS PATTERNS',      '312 structured pass signals — surfaces when a previously passed company resolves your original concern'],
                  ['COMPARABLE DEALS',   'References 3 deals your firm has actually seen — not generic market comps'],
                  ['MARKET TIMING',      'Cross-references your pipeline activity against real funding data — flags when your most active sector is getting crowded'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(107,71,245,0.1)', border: '1px solid rgba(107,71,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#A992FA' }}>✓</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.65)', lineHeight: 1.5 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 5: THE SECOND ENCOUNTER ── */}
      <section style={{ padding: '120px 48px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '0.12em', color: '#A992FA', textTransform: 'uppercase', marginBottom: 16 }}>
            Second encounter
          </div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,3vw,40px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20 }}>
            The company you passed on<br />just raised a Series B.
          </h2>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'rgba(235,235,235,0.5)', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 40px' }}>
            Reidar remembers why you passed. It shows you what changed. It tells you whether the original concern has been addressed — and if so, what your brief would look like today. No hunting through notes. No trying to remember what you thought 14 months ago.
          </p>

          <div style={{ maxWidth: 520, margin: '0 auto', background: '#0C0C10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 0 40px rgba(107,71,245,0.06)', textAlign: 'left' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
                  <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.5" fill="none"/>
                  <circle cx="7" cy="7" r="2.2" fill="#A992FA"/>
                </svg>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#A992FA' }}>Reidar</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, background: 'rgba(107,71,245,0.1)', border: '1px solid rgba(107,71,245,0.2)', color: 'rgba(169,146,250,0.6)', padding: '2px 6px', borderRadius: 3 }}>second encounter</span>
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.2)' }}>just now</span>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: '#EBEBEB' }}>Synthos AI</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '3px 8px', borderRadius: 4 }}>Series B · $40M</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.04em', marginBottom: 4 }}>ORIGINAL PASS REASON</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.5)', lineHeight: 1.5 }}>
                    No enterprise GTM motion — founder had no sales experience and no distribution plan.
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,0.25)', letterSpacing: '0.04em', marginBottom: 4 }}>WHAT CHANGED</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: 'rgba(235,235,235,0.65)', lineHeight: 1.5 }}>
                    Hired VP Sales from Salesforce Health Cloud. 3 enterprise pilots with major health systems. GTM concern appears resolved.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: '#fff', background: '#6B47F5', border: 'none', padding: '9px 16px', borderRadius: 7, cursor: 'pointer', boxShadow: '0 0 16px rgba(107,71,245,0.3)' }}>
                  Run updated brief →
                </button>
                <button style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'rgba(235,235,235,0.5)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '9px 16px', borderRadius: 7, cursor: 'pointer' }}>
                  View original evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: CTA ── */}
      <section style={{ padding: '140px 48px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, color: '#EBEBEB', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20 }}>
          Start today.<br />The compounding starts immediately.
        </h2>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'rgba(235,235,235,0.5)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 36px' }}>
          Bring your CRM export, your deal notes, your portfolio. Reidar turns years of accumulated context into structured intelligence in minutes. Every decision you make after that compounds it further.
        </p>
        <button
          onClick={() => window.location.href = '/sign-up'}
          style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: '#fff', background: '#6B47F5', border: 'none', padding: '14px 28px', borderRadius: 8, cursor: 'pointer', boxShadow: '0 0 24px rgba(107,71,245,0.4)' }}
        >
          Get early access →
        </button>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,0.22)', marginTop: 24 }}>
          No credit card required · Set up in under an hour · Cancel anytime
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div className="foot-l">© 2026 Reidar.</div>
          <a href="/" className="foot-link">Home</a>
          <a href="/how-it-works" className="foot-link">How it works</a>
          <a href="/pricing" className="foot-link">Pricing</a>
        </div>
        <div className="foot-r">POWERED BY CLAUDE · ANTHROPIC</div>
      </footer>
    </>
  );
}
