import { useRef, useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

/* ─── RADAR SWEEP BACKGROUND ─── */
function RadarBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let W, H, angle = 0, raf;
    const blips = [];
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * .85 + .05;
      blips.push({ a, d, brightness: 0, decay: .016 + Math.random() * .012 });
    }
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const cx = W * .5, cy = H * .38, R = Math.min(W, H) * .38;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(107,71,245,${.055 - i * .007})`; ctx.lineWidth = .8; ctx.stroke();
      }
      ctx.lineWidth = .5; ctx.strokeStyle = "rgba(107,71,245,.035)";
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, angle - Math.PI * .45, angle); ctx.closePath();
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      rg.addColorStop(0, "rgba(107,71,245,0)"); rg.addColorStop(.6, "rgba(107,71,245,.025)"); rg.addColorStop(1, "rgba(107,71,245,.075)");
      ctx.fillStyle = rg; ctx.fill(); ctx.restore();
      const ex = cx + Math.cos(angle) * R, ey = cy + Math.sin(angle) * R;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
      const lg = ctx.createLinearGradient(cx, cy, ex, ey);
      lg.addColorStop(0, "rgba(139,92,246,0)"); lg.addColorStop(1, "rgba(139,92,246,.6)");
      ctx.strokeStyle = lg; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fillStyle = "rgba(139,92,246,.5)"; ctx.fill();
      const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      blips.forEach(b => {
        const bx = cx + Math.cos(b.a) * b.d * R, by = cy + Math.sin(b.a) * b.d * R;
        const diff = norm(angle) - norm(b.a);
        if (diff >= 0 && diff < .08) b.brightness = 1;
        b.brightness = Math.max(0, b.brightness - b.decay);
        if (b.brightness < .01) return;
        const grd = ctx.createRadialGradient(bx, by, 0, bx, by, 10 + b.brightness * 8);
        grd.addColorStop(0, `rgba(180,140,255,${b.brightness * .65})`); grd.addColorStop(1, "rgba(107,71,245,0)");
        ctx.beginPath(); ctx.arc(bx, by, 10 + b.brightness * 8, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(bx, by, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,180,255,${Math.min(1, b.brightness * 1.3)})`; ctx.fill();
      });
      angle += .006; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

const CHECK = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="6.5" fill="rgba(245,158,11,.12)" stroke="rgba(245,158,11,.35)" strokeWidth=".9"/>
    <path d="M4 7L6 9L10 5" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CROSS = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="7" cy="7" r="6.5" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.1)" strokeWidth=".9"/>
    <path d="M5 5L9 9M9 5L5 9" stroke="rgba(235,235,235,.25)" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: open ? 20 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'none', border: 'none', cursor: 'pointer', padding: '20px 0', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#EBEBEB', fontFamily: "'Inter',sans-serif" }}>{q}</span>
        <span style={{
          color: 'rgba(235,235,235,.35)', fontSize: 20, lineHeight: 1, flexShrink: 0, marginLeft: 16,
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s ease',
          fontFamily: 'monospace', display: 'inline-block',
        }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: 'rgba(235,235,235,.45)', lineHeight: 1.75, margin: '0 0 0 0', fontFamily: "'Inter',sans-serif" }}>{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const { isSignedIn } = useAuth();
  useEffect(() => {
    document.title = "Pricing — Reidar | AI Investment Associate for VC Firms";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', "Reidar is free during beta for emerging fund managers. Autonomous deal sourcing, investment memo generation, and pipeline tracking — built for funds that move fast.");
  }, []);

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { -webkit-font-smoothing:antialiased; scroll-behavior:smooth; }
        body { background:#0a0a0f; color:#EBEBEB; font-family:'Inter',sans-serif; }
        @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
      `}</style>

      <RadarBg />

      {/* Fade over canvas */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse 80% 55% at 50% 38%, transparent 20%, #0a0a0f 75%)',
        pointerEvents: 'none', zIndex: 1,
      }} />

      <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}>

        {/* NAV */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 36px', borderBottom: '1px solid rgba(255,255,255,.06)',
          background: 'rgba(10,10,15,.92)', backdropFilter: 'blur(18px)',
        }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{ position: 'relative', width: 26, height: 26 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 7, border: '1px solid rgba(107,71,245,.5)', animation: 'radarPing 2s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: 7, border: '1px solid rgba(107,71,245,.5)', animation: 'radarPing 2s ease-out infinite', animationDelay: '1s' }} />
              <div style={{ position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: 7, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1px rgba(107,71,245,.5), 0 0 16px rgba(107,71,245,.25)' }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="7" cy="7" r="2" fill="white"/></svg>
              </div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#EBEBEB', letterSpacing: '-.02em' }}>Reidar</span>
          </a>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
            <a href="/how-it-works" style={{ fontSize: 13, color: 'rgba(235,235,235,.42)', textDecoration: 'none', padding: '5px 10px', borderRadius: 6 }}>How it works</a>
            <a href="/pricing" style={{ fontSize: 13, color: '#A992FA', textDecoration: 'none', padding: '5px 10px', borderRadius: 6, background: 'rgba(255,255,255,.05)' }}>Pricing</a>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSignedIn ? (
              <><button onClick={() => window.location.href = '/app'} style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#6B47F5', border: 'none', padding: '7px 16px', borderRadius: 7, cursor: 'pointer', boxShadow: '0 0 18px rgba(107,71,245,.3)' }}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
            ) : (
              <><a href="/sign-in" style={{ fontSize: 13, color: 'rgba(235,235,235,.6)', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', padding: '6px 14px', borderRadius: 7, textDecoration: 'none' }}>Sign in</a><a href="/sign-up" style={{ fontSize: 13, fontWeight: 500, color: '#fff', background: '#6B47F5', border: 'none', padding: '7px 16px', borderRadius: 7, textDecoration: 'none', boxShadow: '0 0 18px rgba(107,71,245,.3)' }}>Join the waitlist</a></>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <div style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center', maxWidth: 720, margin: '0 auto', padding: '140px 40px 80px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 18, animation: 'fadeUp .5s .05s both' }}>Pricing</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-.02em', color: '#EBEBEB', marginBottom: 18, animation: 'fadeUp .55s .12s both' }}>
            Built for funds that move fast.
          </h1>
          <p style={{ fontSize: 16, fontWeight: 300, color: 'rgba(235,235,235,.45)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto', animation: 'fadeUp .55s .2s both' }}>
            Reidar is in early access. We're onboarding a small number of emerging fund managers now — no enterprise contract, no $100K commitment.
          </p>
        </div>

        {/* ── WHO IT'S FOR ── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left — yes */}
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '28px 28px' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: '#f59e0b', textTransform: 'uppercase', marginBottom: 20 }}>Reidar is for you if —</div>
            {[
              "You run a sub-$200M fund with no dedicated analyst",
              "You're a solo GP or small team doing everything manually",
              "You're losing deals because your sourcing process doesn't scale",
              "You want your firm's judgment to compound over time, not disappear when people leave",
              "You can't justify a $12K–$100K PitchBook or Harmonic contract",
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                {CHECK}
                <span style={{ fontSize: 13, color: 'rgba(235,235,235,.7)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
          {/* Right — no */}
          <div style={{ background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, padding: '28px 28px' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: 'rgba(235,235,235,.25)', textTransform: 'uppercase', marginBottom: 20 }}>Reidar is probably not for you if —</div>
            {[
              "You have a full research team and existing tooling that works",
              "You need enterprise SSO, custom SLAs, or procurement sign-off",
              "You're not willing to connect Gmail or Calendar (the product needs context to work)",
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                {CROSS}
                <span style={{ fontSize: 13, color: 'rgba(235,235,235,.35)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PRICING CARD ── */}
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{
            background: 'rgba(13,13,20,.9)', border: '1px solid rgba(107,71,245,.25)',
            borderRadius: 16, padding: '40px 40px',
            boxShadow: '0 0 60px rgba(107,71,245,.08)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 200, height: 1, background: 'linear-gradient(90deg,transparent,rgba(107,71,245,.6),transparent)' }} />

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 100, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#f59e0b', letterSpacing: '.08em', marginBottom: 14 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />
                EARLY ACCESS
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#EBEBEB', letterSpacing: '-.02em', lineHeight: 1 }}>Free during beta</div>
            </div>

            <div style={{ fontSize: 13, color: 'rgba(235,235,235,.4)', marginBottom: 28, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              Founding firm pricing locked in when you join.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 32 }}>
              {[
                "Autonomous deal sourcing across YC, ProductHunt, and the open web",
                "Mandate-aware scoring against your thesis",
                "Full investment memo generation",
                "Pipeline tracking and signal monitoring",
                "Gmail integration — inbound pitches auto-evaluated",
                "AI associate chat — ask anything about your pipeline",
                "Founding firm rate locked in at launch",
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {CHECK}
                  <span style={{ fontSize: 13, color: 'rgba(235,235,235,.65)', lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>

            <a href="/sign-up" style={{
              display: 'block', width: '100%', textAlign: 'center',
              fontSize: 15, fontWeight: 500, color: '#fff', background: '#6B47F5',
              borderRadius: 9, padding: '14px 0', cursor: 'pointer',
              textDecoration: 'none', boxShadow: '0 0 28px rgba(107,71,245,.4)',
            }}>
              Join the waitlist →
            </a>
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: 'rgba(235,235,235,.2)', fontFamily: "'DM Mono',monospace", letterSpacing: '.04em' }}>
              No credit card. No commitment. Cancel anytime.
            </div>
          </div>
        </div>

        {/* ── COMPARISON ROW ── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>What you're replacing</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: "Junior Analyst", cost: "$80–120K/yr", sub: "salary + benefits" },
              { label: "PitchBook",      cost: "$12–100K/yr",  sub: "data license" },
              { label: "Harmonic",       cost: "$$$",           sub: "early-stage intelligence" },
              { label: "Affinity",       cost: "$2–2.7K/user/yr", sub: "CRM" },
            ].map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(235,235,235,.6)', marginBottom: 10 }}>{item.label}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>{item.cost}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.2)', letterSpacing: '.06em' }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: '#f59e0b', letterSpacing: '.04em' }}>Reidar: Free during beta. Founding rate locked at launch.</span>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 40px 80px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 32, textAlign: 'center' }}>FAQ</div>
          <FaqItem
            q="When will paid plans launch?"
            a="We're heads-down with our first cohort of fund managers. Paid plans will launch once we've validated the core workflow. Founding firms get their rate locked in before that happens."
          />
          <FaqItem
            q="What do I need to get started?"
            a="A Gmail account and 10 minutes. Connect your inbox, define your mandate, and Reidar starts working immediately."
          />
          <FaqItem
            q="Is my data shared with other funds?"
            a="Never. Every firm's intelligence is completely isolated. Your passes, conviction patterns, and pipeline are yours alone — that's the entire point."
          />
        </div>

        {/* ── BOTTOM CTA ── */}
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 40px 100px', textAlign: 'center' }}>
          <div style={{ border: '1px solid rgba(107,71,245,.18)', borderRadius: 16, padding: '64px 48px', position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse 80% 100% at 50% 110%,rgba(107,71,245,.08),transparent 70%)' }}>
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 160, height: 1, background: 'linear-gradient(90deg,transparent,rgba(107,71,245,.6),transparent)' }} />
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(24px,3.2vw,38px)', fontWeight: 700, lineHeight: 1.15, color: '#EBEBEB', letterSpacing: '-.025em', marginBottom: 14 }}>
              Get in before the cohort closes.
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(235,235,235,.35)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.65 }}>
              We're onboarding a small number of funds in this batch. Early firms get founding pricing locked.
            </p>
            <a href="/sign-up" style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 15, fontWeight: 500, color: '#fff', background: '#6B47F5',
              borderRadius: 8, padding: '13px 26px',
              cursor: 'pointer', textDecoration: 'none',
              boxShadow: '0 0 28px rgba(107,71,245,.4)',
            }}>
              Join the waitlist →
            </a>
          </div>
        </div>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(235,235,235,.2)' }}>© 2026 Reidar.</span>
            <a href="/" style={{ color: 'rgba(235,235,235,.3)', textDecoration: 'none', fontSize: 12 }}>Home</a>
            <a href="/how-it-works" style={{ color: 'rgba(235,235,235,.3)', textDecoration: 'none', fontSize: 12 }}>How it works</a>
            <a href="/pricing" style={{ color: 'rgba(235,235,235,.3)', textDecoration: 'none', fontSize: 12 }}>Pricing</a>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,.15)', letterSpacing: '.06em' }}>POWERED BY CLAUDE · ANTHROPIC</div>
        </footer>

      </div>
    </>
  );
}
