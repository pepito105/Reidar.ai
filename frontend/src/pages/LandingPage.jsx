import { useState, useEffect, useRef } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";

const APP_URL = "/app";
const SIGN_IN_URL = "/sign-in";
const SIGN_UP_URL = "/sign-up";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const STYLES = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; -webkit-font-smoothing:antialiased; }
  body { background:#07070A; color:#EBEBEB; font-family:'Inter',sans-serif; overflow-x:hidden; }

  @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes ticker    { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
  @keyframes panelIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 0 1px rgba(107,71,245,.45),0 0 8px rgba(107,71,245,.1)} 50%{box-shadow:0 0 0 1px rgba(107,71,245,.7),0 0 32px rgba(107,71,245,.45)} }
  @keyframes fileDrop  { from{opacity:0;transform:translateY(-14px) scale(.97)} to{opacity:1;transform:none} }
  @keyframes chatInR   { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }
  @keyframes streamIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  @keyframes spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes flowLeft  { 0%{right:0;opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{right:100%;opacity:0} }
  @keyframes flowRight { 0%{left:0;opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{left:100%;opacity:0} }
  @keyframes pulseDot      { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
  @keyframes insightFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

  .typewriter-cursor { display:inline; animation:blink 1s step-end infinite }

  /* NAV */
  .nav { position:fixed;top:0;left:0;right:0;z-index:300;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,7,10,.92);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px); }
  .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
  .nav-links{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:4px}
  .nav-mark-wrap{position:relative;width:26px;height:26px}
  .nav-mark-ring{position:absolute;inset:0;border-radius:7px;border:1px solid rgba(107,71,245,.5);animation:radarPing 2s ease-out infinite}
  .nav-mark-ring.delay{animation-delay:1s}
  .nav-mark{position:relative;z-index:1;width:26px;height:26px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(107,71,245,.5),0 0 16px rgba(107,71,245,.25)}
  .nav-name{font-size:15px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em}
  .nav-a{font-size:13px;color:rgba(235,235,235,.42);text-decoration:none;padding:5px 10px;border-radius:6px;transition:all .15s}
  .nav-a:hover{color:#EBEBEB;background:rgba(255,255,255,.05)}
  .nav-right{display:flex;align-items:center;gap:8px}
  .btn-ghost{font:13px/1 'Inter',sans-serif;color:rgba(235,235,235,.6);background:transparent;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:7px;cursor:pointer;transition:all .15s}
  .btn-ghost:hover{border-color:rgba(255,255,255,.22);color:#EBEBEB}
  .btn-pri{font:13px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;transition:all .15s;box-shadow:0 0 18px rgba(107,71,245,.3)}
  .btn-pri:hover{background:#7D5CF7;box-shadow:0 0 28px rgba(107,71,245,.5)}

  /* TICKER */
  .ticker{overflow:hidden;border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);padding:10px 0}
  .ticker-inner{display:flex;animation:ticker 32s linear infinite;width:max-content}
  .ticker:hover .ticker-inner{animation-play-state:paused}
  .tick-item{display:flex;align-items:center;gap:10px;padding:0 32px;white-space:nowrap;font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.2);letter-spacing:.08em}
  .tick-sep{color:rgba(107,71,245,.4);font-size:8px}
  .tick-dot{width:5px;height:5px;border-radius:50%;background:#00ff88;animation:pulse 2s ease-in-out infinite;flex-shrink:0}

  /* SECTION LAYOUT */
  .sec-inner { max-width:1100px;width:100%;padding:0 48px;margin:0 auto; }
  .s-tag { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.12em;color:#6B47F5;text-transform:uppercase;margin-bottom:14px }
  .s-h2 { font-family:'Syne',sans-serif;font-size:clamp(26px,3.2vw,40px);font-weight:600;line-height:1.1;color:#EBEBEB;letter-spacing:-.02em;margin-bottom:14px }
  .s-h2 em { font-style:normal;color:rgba(235,235,235,.42) }
  .s-p { font-size:15px;font-weight:400;color:rgba(235,235,235,.62);line-height:1.72;max-width:520px }

  /* HERO */
  .hero-wrap{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding-top:56px}
  .hero-content{position:relative;z-index:2;padding:0 24px;max-width:720px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:100px;border:1px solid rgba(107,71,245,.4);background:rgba(107,71,245,.1);font-family:'DM Mono',monospace;font-size:10px;color:#A992FA;letter-spacing:.06em;margin-bottom:24px;animation:fadeUp .5s .05s both}
  .badge-dot{width:5px;height:5px;border-radius:50%;background:#6B47F5;animation:pulse 2s infinite}
  .hero-h1{font-family:'Syne',sans-serif;font-size:clamp(32px,4.5vw,58px);font-weight:600;line-height:1.1;color:#EBEBEB;letter-spacing:-.02em;margin-bottom:20px;animation:fadeUp .55s .13s both}
  .hero-sub{font-size:16px;font-weight:400;color:rgba(235,235,235,.62);line-height:1.72;max-width:540px;margin:0 auto 20px;animation:fadeUp .55s .2s both}
  .hero-phrase{font-size:15px;color:#A992FA;letter-spacing:-.01em;margin-bottom:32px;min-height:24px;animation:fadeUp .55s .25s both}
  .hero-cta{display:flex;gap:10px;align-items:center;justify-content:center;animation:fadeUp .55s .27s both}
  .btn-lg{font:15px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:0 0 24px rgba(107,71,245,.4)}
  .btn-lg:hover{background:#7D5CF7;transform:translateY(-1px);box-shadow:0 0 36px rgba(107,71,245,.55)}
  .btn-out{font:14px/1 'Inter',sans-serif;color:rgba(235,235,235,.5);background:transparent;border:1px solid rgba(255,255,255,.1);padding:11px 20px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;text-decoration:none}
  .btn-out:hover{color:#EBEBEB;border-color:rgba(255,255,255,.2)}

  /* THESIS */
  .thesis-pull{border-left:2px solid rgba(107,71,245,.4);padding:16px 22px;background:rgba(107,71,245,.04);border-radius:0 8px 8px 0;margin-top:28px;max-width:520px}
  .thesis-pull-q{font-family:'Playfair Display',serif;font-size:16px;font-style:italic;color:rgba(235,235,235,.52);line-height:1.5;margin-bottom:8px}
  .thesis-pull-src{font-family:'Space Mono',monospace;font-size:9px;color:rgba(107,71,245,.45);letter-spacing:.1em}

  /* DEMO */
  .chat-shell{background:#0B0B11;border:1px solid rgba(255,255,255,.07);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;height:100%}
  .chat-header{height:40px;background:#0E0E16;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;padding:0 14px;gap:7px;flex-shrink:0}
  .chat-dot{width:8px;height:8px;border-radius:50%}
  .chat-title{margin-left:auto;margin-right:auto;font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.3);letter-spacing:.08em}
  .msg-user{align-self:flex-end;background:rgba(107,71,245,.18);border:1px solid rgba(107,71,245,.25);border-radius:10px 10px 2px 10px;padding:9px 12px;max-width:75%;animation:chatInR .3s ease both}
  .msg-file{align-self:flex-end;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;animation:fileDrop .35s cubic-bezier(.34,1.56,.64,1) both}
  .stream-line{font-size:12px;color:rgba(235,235,235,.6);line-height:1.6;animation:streamIn .25s ease both}
  .stream-action{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:7px;background:rgba(107,71,245,.14);border:1px solid rgba(107,71,245,.3);font-size:11px;font-weight:500;color:#A992FA;cursor:pointer;margin-top:4px;animation:streamIn .3s ease both;transition:background .15s}
  .stream-action:hover{background:rgba(107,71,245,.25)}
  .typing-dots{display:flex;gap:4px;align-items:center;padding:8px 0}
  .typing-dots span{width:5px;height:5px;border-radius:50%;background:rgba(107,71,245,.5);animation:pulse 1.2s ease-in-out infinite}
  .typing-dots span:nth-child(2){animation-delay:.15s}
  .typing-dots span:nth-child(3){animation-delay:.3s}

  /* THREE MOMENTS */
  .moments-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.06);border-radius:12px;overflow:hidden;margin-top:36px}
  .moment-card{padding:28px 24px;background:#07070A;cursor:pointer;transition:background .25s;position:relative}
  .moment-card:hover{background:rgba(107,71,245,.04)}
  .moment-active{background:rgba(107,71,245,.07)!important}
  .moment-active::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#6B47F5;border-radius:2px 2px 0 0}
  .moment-num{font-family:'DM Mono',monospace;font-size:10px;color:rgba(107,71,245,.4);letter-spacing:.1em;margin-bottom:12px}
  .moment-active .moment-num{color:#A992FA}
  .moment-tag{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(235,235,235,.22);margin-bottom:10px}
  .moment-active .moment-tag{color:rgba(107,71,245,.55)}
  .moment-h{font-size:14px;font-weight:600;color:rgba(235,235,235,.62);margin-bottom:9px;line-height:1.3}
  .moment-active .moment-h{color:#EBEBEB}
  .moment-p{font-size:11px;color:rgba(235,235,235,.42);line-height:1.65}
  .moment-active .moment-p{color:rgba(235,235,235,.62)}
  .moment-prog{height:1.5px;background:rgba(255,255,255,.05);border-radius:1px;margin-top:18px;overflow:hidden}
  .moment-active .moment-prog{background:rgba(107,71,245,.18)}
  .moment-prog-bar{height:100%;background:#6B47F5;border-radius:1px}

  /* HOW IT WORKS */
  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;margin-top:36px}
  .step{padding:28px 22px;background:rgba(255,255,255,.012);border-right:1px solid rgba(255,255,255,.06);transition:background .2s}
  .step:last-child{border-right:none}
  .step:hover{background:rgba(107,71,245,.06)}
  .step-n{font-family:'DM Mono',monospace;font-size:10px;color:rgba(107,71,245,.5);letter-spacing:.08em;margin-bottom:12px}
  .step-t{font-size:15px;font-weight:600;color:#EBEBEB;margin-bottom:8px}
  .step-d{font-size:12px;color:rgba(235,235,235,.35);line-height:1.65}

  /* CTA */
  .cta-inner{text-align:center;border:1px solid rgba(107,71,245,.18);border-radius:16px;padding:64px 48px;max-width:760px;width:100%;position:relative;overflow:hidden;background:radial-gradient(ellipse 80% 100% at 50% 110%,rgba(107,71,245,.08),transparent 70%)}
  .cta-inner::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:160px;height:1px;background:linear-gradient(90deg,transparent,rgba(107,71,245,.6),transparent)}
  .cta-h2{font-family:'Playfair Display',serif;font-size:clamp(28px,3.5vw,44px);font-weight:700;line-height:1.1;color:#EBEBEB;letter-spacing:-.025em;margin-bottom:14px}
  .cta-sub{font-size:14px;color:rgba(235,235,235,.35);margin-bottom:28px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.65}

  /* FOOTER */
  .footer-strip{border-top:1px solid rgba(255,255,255,.04);padding:24px 40px;display:flex;align-items:center;justify-content:space-between;max-width:1100px;margin:0 auto}
  .foot-l{font-size:11px;color:rgba(235,235,235,.15)}
  .foot-r{font-family:'DM Mono',monospace;font-size:9px;color:rgba(235,235,235,.1);letter-spacing:.06em}

  @media(max-width:900px){
    .moments-grid{grid-template-columns:1fr}
    .steps{grid-template-columns:1fr}
    .step{border-right:none;border-bottom:1px solid rgba(255,255,255,.06)}
    .step:last-child{border-bottom:none}
    .hero-split{flex-direction:column!important;padding:100px 24px 80px!important}
    .hero-split-right{width:100%!important;max-width:480px}
  }
  @media(max-width:640px){
    .nav{padding:0 20px}.nav-links{display:none}
    .sec-inner{padding:0 20px}
  }
`;

/* ─── RADAR BG ─── */
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
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ─── SCROLL ENTRY HOOK ─── */
function useSectionEntry() {
  const [entered, setEntered] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setEntered(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [entered, ref];
}

/* ─── FAQ ITEM ─── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: open ? 20 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '20px 0', textAlign: 'left' }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: '#EBEBEB', fontFamily: "'Inter',sans-serif" }}>{q}</span>
        <span style={{ color: 'rgba(235,235,235,.35)', fontSize: 20, lineHeight: 1, flexShrink: 0, marginLeft: 16, transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s ease', fontFamily: 'monospace', display: 'inline-block' }}>+</span>
      </button>
      {open && (
        <p style={{ fontSize: 14, color: 'rgba(235,235,235,.62)', lineHeight: 1.75, margin: 0, fontFamily: "'Inter',sans-serif" }}>{a}</p>
      )}
    </div>
  );
}

/* ─── DEMOS ─── */
const DEMOS = [
  {
    preMessage: {
      text: "New pitch deck in your inbox — Foundry AI, GPU scheduling layer, cold outreach this morning. Matches your AI infrastructure thesis. Want me to run it?",
      file: "FoundryAI_Deck.pdf",
    },
    query: "yes, run it",
    file: null,
    thinking: [
      { label: "Reading FoundryAI_Deck.pdf · 24 slides",       result: "GPU scheduling · targeting hyperscalers" },
      { label: "Scoring against your fund thesis",              result: "87 / 100 · AI infrastructure match" },
      { label: "Cross-referencing your pass library",           result: "3 comparable companies · all passed" },
      { label: "Checking portfolio conflicts + network",        result: "Clear · 1 warm path via Bessemer" },
    ],
    artifact: {
      company: "Foundry AI",
      meta: "GPU Scheduling Layer · Series A · Cold outreach",
      thesisFit: 87,
      tags: ["AI Infrastructure", "Series A", "Hardware layer"],
      sections: [
        {
          label: "COMPARABLE PASSES", status: "warn", statusText: "Flag",
          lines: [
            "3 GPU/infrastructure companies evaluated in the last 18 months — all passed",
            "Consistent pass reason across all three: no enterprise distribution motion",
            "⚠  Same signal here — no sales hire detected in the deck",
          ],
        },
        {
          label: "PORTFOLIO CONFLICTS", status: "clear", statusText: "Clear",
          lines: ["12 portfolio companies checked · no competitive overlap detected"],
        },
        {
          label: "NETWORK", status: "found", statusText: "1 path",
          lines: [
            "No direct warm intro path in your network",
            "→ Kevin Chen (Bessemer) has backed 2 Foundry team members",
          ],
        },
      ],
      verdict: "Strong thesis fit · watch for GTM motion before committing",
      actions: [
        { label: "Add to Watchlist", primary: true },
        { label: "Request meeting", primary: false },
        { label: "Pass", primary: false },
      ],
    },
  },
  {
    preMessage: null,
    query: "LP just introduced us to DataSync. Worth taking the meeting?",
    file: null,
    thinking: [
      { label: "Checking DataSync against your pipeline",          result: "Not in pipeline · no prior contact" },
      { label: "Scanning portfolio for competitive overlap",       result: "Potential conflict · checking Nexus" },
      { label: "Reading Nexus investor updates",                   result: "DataSync named as primary threat in Jan update" },
      { label: "Checking your Nexus board obligations",            result: "Board seat + pro-rata rights confirmed" },
    ],
    artifact: null,
    response: [
      { type: 'title',  text: "Before you take this meeting — DataSync competes directly with Nexus." },
      { type: 'spacer' },
      { type: 'label',  text: "Your Nexus position" },
      { type: 'body',   text: "Board seat and pro-rata rights since Series A, March 2023. This creates a direct conflict." },
      { type: 'spacer' },
      { type: 'label',  text: "What David already told you" },
      { type: 'body',   text: "Nexus January investor update: \"DataSync is our primary competitive threat in Q1.\" You received this email and didn't flag it." },
      { type: 'spacer' },
      { type: 'accent', text: "Want me to draft a note to David before you respond to the LP?" },
    ],
  },
];

/* ─── EVAL CARD ─── */
function EvalCard({ artifact }) {
  const statusStyle = {
    warn:  { bg: 'rgba(245,158,11,.1)',   border: 'rgba(245,158,11,.3)',   color: '#f59e0b' },
    clear: { bg: 'rgba(16,185,129,.1)',   border: 'rgba(16,185,129,.3)',   color: '#10b981' },
    found: { bg: 'rgba(107,71,245,.12)',  border: 'rgba(107,71,245,.38)',  color: '#A992FA' },
  };
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, overflow: 'hidden', background: 'rgba(255,255,255,.018)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.025)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#EBEBEB', marginBottom: 3 }}>{artifact.company}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,.32)', letterSpacing: '.04em' }}>{artifact.meta}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{artifact.thesisFit}</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(235,235,235,.28)', letterSpacing: '.07em', marginTop: 3 }}>THESIS FIT</div>
          </div>
        </div>
        <div style={{ height: 2.5, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 9 }}>
          <div style={{ height: '100%', width: `${artifact.thesisFit}%`, background: 'linear-gradient(90deg,#6B47F5,#10b981)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {artifact.tags.map(tag => (
            <span key={tag} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: '.06em', padding: '2px 8px', borderRadius: 100, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', color: 'rgba(16,185,129,.75)' }}>{tag}</span>
          ))}
        </div>
      </div>
      {artifact.sections.map((section, i) => {
        const ss = statusStyle[section.status];
        return (
          <div key={i} style={{ padding: '9px 16px', borderBottom: i < artifact.sections.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.28)', letterSpacing: '.08em' }}>{section.label}</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, padding: '2px 8px', borderRadius: 100, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color }}>{section.statusText}</span>
            </div>
            {section.lines.map((line, j) => (
              <div key={j} style={{ fontSize: 11.5, color: (line.startsWith('⚠') || line.startsWith('→')) ? 'rgba(235,235,235,.62)' : 'rgba(235,235,235,.36)', lineHeight: 1.55, marginBottom: j < section.lines.length - 1 ? 3 : 0 }}>{line}</div>
            ))}
          </div>
        );
      })}
      <div style={{ padding: '10px 16px', background: 'rgba(107,71,245,.04)', borderTop: '1px solid rgba(107,71,245,.1)' }}>
        <div style={{ fontSize: 12, color: '#A992FA', marginBottom: 9 }}>{artifact.verdict}</div>
        <div style={{ display: 'flex', gap: 7 }}>
          {artifact.actions.map((action, i) => (
            <div key={i} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: action.primary ? 500 : 400, cursor: 'pointer', background: action.primary ? 'rgba(107,71,245,.18)' : 'transparent', border: action.primary ? '1px solid rgba(107,71,245,.4)' : '1px solid rgba(255,255,255,.07)', color: action.primary ? '#A992FA' : 'rgba(235,235,235,.3)' }}>{action.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── REIDAR CHAT DEMO ─── */
function ReidarChat() {
  const [isActive, setIsActive] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: '55%', y: '60%' });
  const [cursorClick, setCursorClick] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputFile, setInputFile] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [preMessageVisible, setPreMessageVisible] = useState(false);
  const [thinkVisible, setThinkVisible] = useState(false);
  const [thinkActive, setThinkActive] = useState(-1);
  const [thinkDone, setThinkDone] = useState(0);
  const [responseLines, setResponseLines] = useState([]);
  const [responseComplete, setResponseComplete] = useState(false);
  const [artifactVisible, setArtifactVisible] = useState(false);

  const tsRef = useRef([]);
  const containerRef = useRef(null);
  const a = (ms, fn) => { const id = setTimeout(fn, ms); tsRef.current.push(id); };
  const clearAll = () => { tsRef.current.forEach(clearTimeout); tsRef.current = []; };

  // Activate when visible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      setIsActive(e.isIntersecting);
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const resetState = () => {
    setCursorVisible(false); setCursorPos({ x: '55%', y: '60%' }); setCursorClick(false);
    setInputText(''); setInputFile(false); setMessageSent(false);
    setPreMessageVisible(false); setThinkVisible(false); setThinkActive(-1); setThinkDone(0);
    setResponseLines([]); setResponseComplete(false); setArtifactVisible(false);
  };

  const runDemo = (idx) => {
    setDemoIdx(idx);
    const demo = DEMOS[idx];
    const q = demo.query;
    const hasPre = !!demo.preMessage;
    if (hasPre) a(350, () => setPreMessageVisible(true));
    const cursorStart = hasPre ? 1400 : 200;
    const inputMove   = hasPre ? 2000 : 700;
    const clickAt     = hasPre ? 2700 : 1500;
    const typeStart   = hasPre ? 2900 : 1700;
    const charMs      = hasPre ? 52   : 65;
    a(cursorStart, () => setCursorVisible(true));
    a(inputMove,   () => setCursorPos({ x: '50%', y: '95%' }));
    a(clickAt,     () => setCursorClick(true));
    a(clickAt + 150, () => setCursorClick(false));
    for (let i = 1; i <= q.length; i++) {
      ((ci) => a(typeStart + ci * charMs, () => setInputText(q.slice(0, ci))))(i);
    }
    const T = typeStart + q.length * charMs;
    if (demo.file) a(T + 260, () => setInputFile(true));
    const sendOff = demo.file ? 900 : 420;
    a(T + sendOff - 280, () => setCursorPos({ x: 'calc(50% + 309px)', y: '95%' }));
    a(T + sendOff,       () => setCursorClick(true));
    a(T + sendOff + 160, () => {
      setCursorClick(false); setMessageSent(true);
      setInputText(''); setInputFile(false); setCursorVisible(false);
    });
    const stepMs = hasPre ? 1600 : 1750;
    const thinkStart = T + sendOff + 600;
    a(thinkStart, () => setThinkVisible(true));
    demo.thinking.forEach((_, i) => {
      const s = thinkStart + 250 + i * stepMs;
      a(s, () => setThinkActive(i));
      a(s + stepMs - 350, () => {
        setThinkDone(prev => prev + 1);
        if (i === demo.thinking.length - 1) setThinkActive(-1);
      });
    });
    const respStart = thinkStart + 250 + demo.thinking.length * stepMs + 700;
    if (demo.artifact) {
      a(respStart, () => { setArtifactVisible(true); setResponseComplete(true); });
      const endTime = respStart + 6500;
      a(endTime, () => {
        clearAll(); resetState();
        a(600, () => runDemo((idx + 1) % DEMOS.length));
      });
      return;
    }
    demo.response.forEach((line, i) => {
      a(respStart + i * 460, () => setResponseLines(prev => [...prev, line]));
    });
    const endTime = respStart + demo.response.length * 460;
    a(endTime, () => setResponseComplete(true));
    a(endTime + 4500, () => {
      clearAll(); resetState();
      a(500, () => runDemo((idx + 1) % DEMOS.length));
    });
  };

  useEffect(() => {
    if (!isActive) { clearAll(); resetState(); return; }
    a(400, () => runDemo(0));
    return clearAll;
  }, [isActive]);

  const demo = DEMOS[demoIdx];

  const renderLine = (line, i) => {
    if (line.type === 'spacer') return <div key={i} style={{ height: 8 }} />;
    const base = { animation: 'fadeUp .22s ease both', lineHeight: 1.72 };
    if (line.type === 'title')  return <div key={i} style={{ ...base, fontSize: 14, fontWeight: 600, color: '#EBEBEB', marginBottom: 1 }}>{line.text}</div>;
    if (line.type === 'label')  return <div key={i} style={{ ...base, fontSize: 10.5, fontFamily: "'DM Mono',monospace", color: 'rgba(169,146,250,.72)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 1 }}>{line.text}</div>;
    if (line.type === 'accent') return <div key={i} style={{ ...base, fontSize: 14, color: '#A992FA', fontWeight: 500 }}>{line.text}</div>;
    return <div key={i} style={{ ...base, fontSize: 13.5, color: 'rgba(235,235,235,.68)' }}>{line.text}</div>;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#07070A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 40% at 50% 100%, rgba(107,71,245,.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      {/* Cursor */}
      <div style={{
        position: 'absolute', left: cursorPos.x, top: cursorPos.y, zIndex: 50,
        width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: '50%',
        background: cursorClick ? '#ffffff' : '#A992FA',
        boxShadow: cursorClick ? '0 0 0 3px rgba(255,255,255,.25), 0 0 20px 6px rgba(169,146,250,.7)' : '0 0 0 2px rgba(169,146,250,.3), 0 0 14px 4px rgba(107,71,245,.5)',
        opacity: cursorVisible ? 1 : 0,
        transform: `scale(${cursorClick ? 0.6 : 1})`,
        transition: 'left .85s cubic-bezier(.25,.46,.45,.94), top .85s cubic-bezier(.25,.46,.45,.94), opacity .3s ease, transform .12s ease, background .12s ease, box-shadow .12s ease',
        pointerEvents: 'none',
      }} />
      {/* Header */}
      <div style={{ height: 48, padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.3" fill="none"/><circle cx="7" cy="7" r="2" fill="#A992FA"/></svg>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: 'rgba(235,235,235,.38)', letterSpacing: '.07em' }}>REIDAR</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          {DEMOS.map((_, i) => (
            <div key={i} style={{ height: 3, borderRadius: 2, width: i === demoIdx ? 18 : 5, background: i === demoIdx ? '#6B47F5' : 'rgba(255,255,255,.1)', transition: 'width .4s ease, background .4s ease' }} />
          ))}
        </div>
      </div>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', position: 'relative', zIndex: 2, padding: '0 32px' }}>
        <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 16 }}>
          {/* Pre-message */}
          {demo.preMessage && (
            <div style={{ opacity: preMessageVisible ? 1 : 0, transform: preMessageVisible ? 'none' : 'translateY(10px)', transition: 'opacity .4s ease, transform .4s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(107,71,245,.18)', border: '1px solid rgba(107,71,245,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.4" fill="none"/><circle cx="7" cy="7" r="2.2" fill="#A992FA"/></svg>
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(169,146,250,.52)', letterSpacing: '.05em' }}>REIDAR</span>
              </div>
              <div style={{ paddingLeft: 38 }}>
                <div style={{ fontSize: 14, color: 'rgba(235,235,235,.82)', lineHeight: 1.6, marginBottom: 10 }}>{demo.preMessage.text}</div>
                {demo.preMessage.file && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'rgba(235,235,235,.48)', fontFamily: "'DM Mono',monospace" }}>
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><rect x=".5" y=".5" width="9" height="11" rx="1.5" stroke="rgba(235,235,235,.28)" strokeWidth="1"/><path d="M2 4h6M2 6.5h6M2 9h4" stroke="rgba(235,235,235,.2)" strokeWidth=".9" strokeLinecap="round"/></svg>
                    {demo.preMessage.file}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* User message */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, opacity: messageSent ? 1 : 0, transform: messageSent ? 'none' : 'translateY(10px)', transition: 'opacity .35s ease, transform .35s ease' }}>
            <div style={{ background: 'rgba(107,71,245,.12)', border: '1px solid rgba(107,71,245,.2)', borderRadius: '14px 14px 3px 14px', padding: '11px 15px', maxWidth: '65%', fontSize: 14, color: 'rgba(235,235,235,.9)', lineHeight: 1.55 }}>
              {demo.query}
            </div>
          </div>
          {/* Reidar analysis block */}
          <div style={{ opacity: thinkVisible ? 1 : 0, transform: thinkVisible ? 'none' : 'translateY(10px)', transition: 'opacity .4s ease, transform .4s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(107,71,245,.18)', border: '1px solid rgba(107,71,245,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.4" fill="none"/><circle cx="7" cy="7" r="2.2" fill="#A992FA"/></svg>
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(169,146,250,.52)', letterSpacing: '.05em' }}>REIDAR</span>
            </div>
            {/* Thinking steps */}
            <div style={{ paddingLeft: 38, display: 'flex', flexDirection: 'column', gap: 5, marginBottom: (responseLines.length || artifactVisible) ? 16 : 0 }}>
              {demo.thinking.map((step, i) => {
                const spinning = thinkActive === i;
                const done = i < thinkDone;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 22, opacity: (done || spinning) ? 1 : 0, transition: 'opacity .25s ease' }}>
                    <div style={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {done ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" fill="rgba(16,185,129,.12)" stroke="rgba(16,185,129,.45)" strokeWidth=".9"/><path d="M3.5 6L5 7.5L8.5 4" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : spinning ? (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(169,146,250,.15)', borderTopColor: '#A992FA', animation: 'spin .7s linear infinite' }} />
                      ) : null}
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, letterSpacing: '.02em', color: done ? 'rgba(235,235,235,.28)' : 'rgba(235,235,235,.55)' }}>{step.label}</span>
                    {done && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'rgba(16,185,129,.6)' }}>· {step.result}</span>}
                  </div>
                );
              })}
            </div>
            {artifactVisible && demo.artifact && (
              <div style={{ paddingLeft: 38, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)', animation: 'fadeUp .45s ease both' }}>
                <EvalCard artifact={demo.artifact} />
              </div>
            )}
            {responseLines.length > 0 && (
              <div style={{ paddingLeft: 38, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)' }}>
                {responseLines.map((line, i) => renderLine(line, i))}
                {!responseComplete && <span className="typewriter-cursor" style={{ color: '#A992FA' }}>|</span>}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Input bar */}
      <div style={{ padding: '10px 32px 18px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.033)', border: '1px solid rgba(255,255,255,.065)', borderRadius: 12, padding: '10px 14px' }}>
            {inputFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(107,71,245,.1)', border: '1px solid rgba(107,71,245,.17)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: 'rgba(169,146,250,.7)', fontFamily: "'DM Mono',monospace", flexShrink: 0, animation: 'fadeUp .2s ease both' }}>
                <svg width="9" height="11" viewBox="0 0 9 11" fill="none"><rect x=".5" y=".5" width="8" height="10" rx="1.5" stroke="rgba(169,146,250,.45)" strokeWidth=".9"/></svg>
                {demo.file}
              </div>
            )}
            <div style={{ flex: 1, fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: inputText ? '#EBEBEB' : 'rgba(235,235,235,.18)' }}>
              {inputText ? <>{inputText}<span className="typewriter-cursor" style={{ color: '#A992FA' }}>|</span></> : 'Ask anything about your portfolio...'}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: inputText ? '#6B47F5' : 'rgba(255,255,255,.04)', border: inputText ? 'none' : '1px solid rgba(255,255,255,.065)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: inputText ? '0 0 18px rgba(107,71,245,.4)' : 'none', transition: 'background .25s ease, box-shadow .25s ease' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke={inputText ? 'white' : 'rgba(235,235,235,.2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AMBIENT DEMO ─── */
const DEMO_EVENTS = [
  { id: 0, time: '08:47', label: 'Inbound from Synthos AI classified', surface: 'Gmail', surfaceColor: '#EA4335', detail: '87/100 thesis match · cold outreach · 3 comparable passes', hasMockup: true },
  { id: 1, time: '09:02', label: '11-agent research pipeline dispatched', surface: 'Dashboard', surfaceColor: '#6B47F5', detail: 'market sizing · founders · competitor profiles · mandate fit', hasMockup: true },
  { id: 2, time: '10:15', label: 'DataCorp posted VP Sales hire', surface: 'Slack', surfaceColor: '#4ade80', detail: 'traction signal · pipeline updated · brief appended', hasMockup: true },
  { id: 3, time: '11:33', label: 'Nexus (portfolio) in TechCrunch', surface: null, surfaceColor: null, detail: 'classified as noise · not surfaced · logged', hasMockup: false },
  { id: 4, time: '13:28', label: 'Pre-meeting brief injected into 2pm event', surface: 'Calendar', surfaceColor: '#4285F4', detail: '3 suggested questions · pass history · conflict check', hasMockup: true },
  { id: 5, time: '14:02', label: 'YC W25: 247 ingested, 8 mandate matches', surface: 'Dashboard', surfaceColor: '#6B47F5', detail: '8 ranked matches queued · top match: Corpora AI', hasMockup: true },
];

const DEMO_CYCLEABLES = [0, 1, 2, 4, 5];

const DEMO_HEX = (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
    <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="#A992FA" strokeWidth="1.4" fill="none"/>
    <circle cx="7" cy="7" r="2.2" fill="#A992FA"/>
  </svg>
);

function MockGmail() {
  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 420, display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif" }}>
      {/* Gmail top bar */}
      <div style={{ padding: '8px 14px', background: '#f6f8fc', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none"><rect width="22" height="16" rx="2" fill="#fff" stroke="#ddd" strokeWidth=".8"/><path d="M1 1l10 8L21 1" stroke="#EA4335" strokeWidth="1.6" fill="none"/></svg>
        </div>
        <div style={{ flex: 1, height: 28, background: '#eaf1fb', borderRadius: 20, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
          <span style={{ fontSize: 11, color: '#5f6368' }}>Search mail</span>
        </div>
      </div>
      {/* 3-pane body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left nav */}
        <div style={{ width: 150, background: '#f6f8fc', borderRight: '1px solid #e8eaed', padding: '8px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ margin: '0 8px 8px', padding: '8px 12px', background: '#c2e7ff', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#001d35', textAlign: 'center' }}>Compose</div>
          {[['Inbox','3'],['Starred',''],['Sent',''],['Drafts','2'],['All Mail','']].map(([lbl,cnt]) => (
            <div key={lbl} style={{ padding: '5px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 20px 20px 0', background: lbl === 'Inbox' ? '#d3e3fd' : 'transparent' }}>
              <span style={{ fontSize: 12, color: '#202124', fontWeight: lbl === 'Inbox' ? 600 : 400 }}>{lbl}</span>
              {cnt && <span style={{ fontSize: 11, color: '#1a73e8', fontWeight: 700 }}>{cnt}</span>}
            </div>
          ))}
        </div>
        {/* Email list */}
        <div style={{ width: 200, borderRight: '1px solid #e8eaed', overflow: 'hidden', flexShrink: 0 }}>
          {[
            { from: 'Alex Wu', subj: 'Synthos AI — quick intro', time: '8:47 AM', unread: true, active: true },
            { from: 'James K.', subj: 'IC notes — DataCorp', time: '7:32 AM', unread: false, active: false },
            { from: 'Reidar', subj: 'Weekly pipeline digest', time: 'Yesterday', unread: false, active: false },
            { from: 'Sara L.', subj: 'Re: Corpora follow-up', time: 'Mon', unread: false, active: false },
          ].map((e, i) => (
            <div key={i} style={{ padding: '8px 10px', borderBottom: '1px solid #f1f3f4', background: e.active ? '#e8f0fe' : '#fff', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: e.unread ? 700 : 500, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>{e.from}</span>
                <span style={{ fontSize: 10, color: '#5f6368', flexShrink: 0 }}>{e.time}</span>
              </div>
              <div style={{ fontSize: 10, color: e.unread ? '#202124' : '#5f6368', fontWeight: e.unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.subj}</div>
            </div>
          ))}
        </div>
        {/* Open email + Reidar panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Email body */}
          <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#202124', marginBottom: 4 }}>Synthos AI — quick intro</div>
            <div style={{ fontSize: 11, color: '#5f6368', marginBottom: 10 }}>Alex Wu &lt;alex@synthosai.com&gt; · to me</div>
            <div style={{ fontSize: 11, color: '#202124', lineHeight: 1.6, color: '#3c4043' }}>
              Hi — I'm building Synthos AI, clinical documentation automation for health systems. We're pre-seed, looking for a lead. Would love 20 minutes if there's fit.<br/><br/>
              — Alex
            </div>
          </div>
          {/* Reidar sidebar */}
          <div style={{ width: 168, background: '#fafafa', borderLeft: '1px solid #e8eaed', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{DEMO_HEX}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#202124' }}>Reidar</span>
            </div>
            <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {/* Score */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#10b981', lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>87</span>
                <span style={{ fontSize: 9, color: '#5f6368', fontFamily: "'DM Mono',monospace" }}>/100</span>
              </div>
              <div style={{ height: 4, background: '#e8eaed', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '87%', background: 'linear-gradient(90deg,#6B47F5,#10b981)', borderRadius: 2 }} />
              </div>
              <div style={{ padding: '6px 8px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 6 }}>
                <div style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: '#d97706', letterSpacing: '.06em', marginBottom: 3 }}>3 COMPARABLE PASSES</div>
                <div style={{ fontSize: 10, color: '#3c4043', lineHeight: 1.4 }}>Similar pattern: no enterprise distribution motion.</div>
              </div>
              <div style={{ padding: '6px 8px', background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 6 }}>
                <div style={{ fontSize: 8, fontFamily: "'DM Mono',monospace", color: '#059669', letterSpacing: '.06em', marginBottom: 3 }}>PORTFOLIO CLEAR</div>
                <div style={{ fontSize: 10, color: '#3c4043', lineHeight: 1.4 }}>12 portfolio companies checked.</div>
              </div>
              <button type="button" style={{ padding: '6px 0', borderRadius: 6, background: '#6B47F5', border: 'none', fontSize: 11, fontWeight: 600, color: '#fff', cursor: 'pointer', marginTop: 'auto' }}>Run pipeline →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockDashboardAgents() {
  const agents = [
    { done: true,  spin: false, label: 'market sizing · healthcare AI',         result: '$4.2B · 23% CAGR',   cite: 'Statista 2024' },
    { done: true,  spin: false, label: 'competitor profiles + pricing',          result: '6 found',             cite: 'LinkedIn / Crunchbase' },
    { done: true,  spin: false, label: 'customer sentiment mining',              result: 'gap found',           cite: 'G2 / Reddit' },
    { done: true,  spin: false, label: 'patent landscape',                       result: '0 conflicts',         cite: 'USPTO' },
    { done: false, spin: true,  label: 'founder backgrounds',                    result: 'running…',            cite: '' },
    { done: false, spin: true,  label: 'mandate fit · portfolio conflicts',      result: 'running…',            cite: '' },
    { done: false, spin: true,  label: 'regulatory risk · FDA classification',   result: 'running…',            cite: '' },
    { done: false, spin: false, label: 'GTM motion analysis',                    result: 'queued',              cite: '' },
    { done: false, spin: false, label: 'comparable exits · multiples',           result: 'queued',              cite: '' },
    { done: false, spin: false, label: 'positioning · onliness test',            result: 'queued',              cite: '' },
    { done: false, spin: false, label: 'investment memo draft',                  result: 'queued',              cite: '' },
  ];
  return (
    <div style={{ background: '#0a0a0f', borderRadius: 10, overflow: 'hidden', height: 420, display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ padding: '9px 14px', background: '#0d0d14', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>{DEMO_HEX}</div>
        {['Coverage','Pipeline','Research','Signals'].map(t => (
          <div key={t} style={{ padding: '3px 10px', borderRadius: 5, background: t === 'Research' ? 'rgba(107,71,245,.18)' : 'transparent', fontSize: 11, color: t === 'Research' ? '#A992FA' : 'rgba(235,235,235,.3)', cursor: 'default' }}>{t}</div>
        ))}
      </div>
      {/* Company header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0ff', marginBottom: 2 }}>Synthos AI</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.32)', letterSpacing: '.04em' }}>Clinical Documentation · Seed · Cold inbound</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#f59e0b', letterSpacing: '.06em' }}>RUNNING</span>
        </div>
      </div>
      {/* Agent list */}
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'hidden' }}>
        {agents.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {row.done ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" fill="rgba(16,185,129,.12)" stroke="rgba(16,185,129,.45)" strokeWidth=".9"/><path d="M3.5 6L5 7.5L8.5 4" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : row.spin ? (
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px solid rgba(169,146,250,.15)', borderTopColor: '#A992FA', animation: 'spin .7s linear infinite' }} />
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.08)' }} />
              )}
            </div>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: row.done ? 'rgba(235,235,235,.5)' : row.spin ? 'rgba(235,235,235,.45)' : 'rgba(235,235,235,.18)', flex: 1, letterSpacing: '.02em' }}>{row.label}</span>
            {row.done && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(16,185,129,.7)', marginRight: 4 }}>{row.result}</span>}
            {row.done && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: 'rgba(107,71,245,.45)' }}>{row.cite}</span>}
            {row.spin && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.22)' }}>{row.result}</span>}
            {!row.done && !row.spin && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.12)' }}>{row.result}</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', borderTop: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.18)' }}>4 of 11 complete · ~8 min remaining</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(107,71,245,.5)' }}>every claim sourced →</span>
      </div>
    </div>
  );
}

function MockSlack() {
  return (
    <div style={{ background: '#1a1d21', borderRadius: 10, overflow: 'hidden', height: 420, display: 'flex', fontFamily: "'Inter',sans-serif" }}>
      {/* Left sidebar */}
      <div style={{ width: 180, background: '#19171d', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8f8f8' }}>Acme Ventures</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2bac76' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>You're active</span>
          </div>
        </div>
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[['#deal-flow',true,2],['#portfolio','',0],['#signals','',0],['#general','',0],['#fundraising','',0]].map(([ch,active,badge]) => (
            <div key={ch} style={{ padding: '4px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: active ? 'rgba(255,255,255,.09)' : 'transparent', borderRadius: 4, margin: '0 4px' }}>
              <span style={{ fontSize: 12, color: active ? '#f8f8f8' : 'rgba(255,255,255,.45)' }}>{ch}</span>
              {badge > 0 && <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#e01e5a', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
            </div>
          ))}
        </div>
      </div>
      {/* Message area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f8f8f8' }}>#deal-flow</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>· 4 members</span>
        </div>
        <div style={{ flex: 1, padding: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}>
          {/* Older ghost message */}
          <div style={{ opacity: 0.3 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4a154b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: '#fff', fontWeight: 700 }}>JK</div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f8f8f8' }}>James K.</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>9:58 AM</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>Adding DataCorp to watching, let's check back in a quarter</div>
              </div>
            </div>
          </div>
          {/* Reidar bot message */}
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{DEMO_HEX}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f8f8f8' }}>Reidar</span>
                  <span style={{ padding: '1px 5px', background: 'rgba(107,71,245,.3)', borderRadius: 3, fontSize: 9, color: '#A992FA', fontWeight: 700 }}>APP</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>10:15 AM</span>
                </div>
                {/* Slack attachment card */}
                <div style={{ borderLeft: '3px solid #2bac76', padding: '8px 12px', background: 'rgba(255,255,255,.04)', borderRadius: '0 6px 6px 0' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#2bac76', letterSpacing: '.07em', marginBottom: 5 }}>TRACTION SIGNAL · DATACORP</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.55, marginBottom: 10 }}>
                    DataCorp just posted a VP Sales hire on LinkedIn — first enterprise sales motion. Pipeline brief updated. This aligns with what James flagged last quarter.
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button type="button" style={{ padding: '4px 10px', borderRadius: 4, background: '#6B47F5', border: 'none', fontSize: 11, color: '#fff', cursor: 'pointer' }}>View brief</button>
                    <button type="button" style={{ padding: '4px 10px', borderRadius: 4, background: 'transparent', border: '1px solid rgba(255,255,255,.15)', fontSize: 11, color: 'rgba(255,255,255,.45)', cursor: 'pointer' }}>Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,.05)', borderRadius: 7, fontSize: 11, color: 'rgba(255,255,255,.3)' }}>Message #deal-flow</div>
        </div>
      </div>
    </div>
  );
}

function MockCalendar() {
  const days = ['S','M','T','W','T','F','S'];
  const aprilGrid = [null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30];
  return (
    <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: 420, display: 'flex', flexDirection: 'column', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '8px 14px', background: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="1" y="2" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.3" fill="none"/><line x1="1" y1="7" x2="19" y2="7" stroke="#4285F4" strokeWidth="1.1"/><line x1="6" y1="1" x2="6" y2="4" stroke="#4285F4" strokeWidth="1.3" strokeLinecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="#4285F4" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#3c4043' }}>April 2026</span>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Mini calendar */}
        <div style={{ width: 180, padding: '10px', borderRight: '1px solid #e8eaed', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px 0', marginBottom: 8 }}>
            {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, color: '#5f6368', padding: '2px 0', fontWeight: 500 }}>{d}</div>)}
            {aprilGrid.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, padding: '3px 0', borderRadius: '50%', background: d === 12 ? '#1a73e8' : 'transparent', color: d === 12 ? '#fff' : d ? '#202124' : 'transparent', fontWeight: d === 12 ? 700 : 400 }}>{d || ''}</div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #e8eaed', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#202124', marginBottom: 4 }}>Today</div>
            {[
              { time: '10:00', title: 'Team standup', color: '#039be5' },
              { time: '14:00', title: 'Intro · Alex Wu', color: '#0f9d58', outline: true },
              { time: '16:30', title: 'LP call · Sequoia', color: '#4285F4' },
            ].map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 3, height: 28, borderRadius: 2, background: ev.outline ? 'transparent' : ev.color, flexShrink: 0, marginTop: 2, border: ev.outline ? `1.5px solid ${ev.color}` : 'none' }} />
                <div>
                  <div style={{ fontSize: 9, color: '#5f6368' }}>{ev.time}</div>
                  <div style={{ fontSize: 10, color: '#202124', fontWeight: ev.outline ? 600 : 400 }}>{ev.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Event detail */}
        <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 4 }}>Intro · Alex Wu</div>
          <div style={{ fontSize: 11, color: '#5f6368', marginBottom: 4 }}>Sunday, April 12 · 2:00 – 2:30 PM</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#1a73e8', borderRadius: 4, fontSize: 11, color: '#fff', marginBottom: 10 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect width="10" height="10" rx="2" fill="rgba(255,255,255,.25)"/><text x="2" y="8" fontSize="7" fill="white">▷</text></svg>
            Join Google Meet
          </div>
          <div style={{ fontSize: 11, color: '#3c4043', marginBottom: 10 }}>
            <span style={{ color: '#5f6368' }}>Guests:</span> alex@synthosai.com, you
          </div>
          {/* Reidar section */}
          <div style={{ padding: '9px 10px', background: 'rgba(107,71,245,.05)', border: '1px solid rgba(107,71,245,.2)', borderRadius: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{DEMO_HEX}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6' }}>Reidar pre-meeting brief</span>
            </div>
            <div style={{ padding: '5px 7px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 5, marginBottom: 7 }}>
              <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: '#d97706', letterSpacing: '.05em', marginBottom: 2 }}>3 COMPARABLE PASSES</div>
              <div style={{ fontSize: 10, color: '#3c4043', lineHeight: 1.4 }}>Each passed on GTM weakness. Probe for distribution plan.</div>
            </div>
            {[
              "You're targeting enterprise health systems — who is your first paying customer and how did you close them?",
              "Thomson Reuters is building natively here. What's your moat in 18 months?",
            ].map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'rgba(107,71,245,.6)', flexShrink: 0 }}>0{i+1}</span>
                <span style={{ fontSize: 10, color: '#3c4043', lineHeight: 1.45 }}>{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockDashboardMatches() {
  const companies = [
    { name: 'Corpora AI', score: 91, tag: 'TOP MATCH', tagColor: '#10b981', tagBg: 'rgba(16,185,129,.1)', desc: 'Legal doc automation · Seed · YC W25' },
    { name: 'FlowBase',   score: 84, tag: 'STRONG FIT', tagColor: '#6B47F5', tagBg: 'rgba(107,71,245,.1)', desc: 'Workflow intelligence · Pre-seed · YC W25' },
    { name: 'Meridian Health', score: 79, tag: 'POSSIBLE', tagColor: '#f59e0b', tagBg: 'rgba(245,158,11,.08)', desc: 'Clinical ops · Pre-seed · YC W25' },
    { name: 'Paragon Labs',  score: 76, tag: 'POSSIBLE', tagColor: '#f59e0b', tagBg: 'rgba(245,158,11,.08)', desc: 'Lab data APIs · Seed · YC W25' },
    { name: 'Vertex AI Ops', score: 72, tag: 'POSSIBLE', tagColor: '#f59e0b', tagBg: 'rgba(245,158,11,.08)', desc: 'MLOps tooling · Pre-seed · YC W25' },
  ];
  return (
    <div style={{ background: '#0a0a0f', borderRadius: 10, overflow: 'hidden', height: 420, display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ padding: '9px 14px', background: '#0d0d14', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>{DEMO_HEX}</div>
        {['Coverage','Pipeline','Research','Signals'].map(t => (
          <div key={t} style={{ padding: '3px 10px', borderRadius: 5, background: t === 'Coverage' ? 'rgba(107,71,245,.18)' : 'transparent', fontSize: 11, color: t === 'Coverage' ? '#A992FA' : 'rgba(235,235,235,.3)', cursor: 'default' }}>{t}</div>
        ))}
      </div>
      {/* Sub-header */}
      <div style={{ padding: '9px 14px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0ff' }}>New mandate matches</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.35)', letterSpacing: '.05em' }}>YC W25 · 247 INGESTED · 8 MATCHES</span>
          <span style={{ padding: '2px 7px', background: 'rgba(107,71,245,.15)', borderRadius: 10, fontSize: 9, color: '#A992FA', fontFamily: "'DM Mono',monospace" }}>sourced while away</span>
        </div>
      </div>
      {/* Company cards */}
      <div style={{ flex: 1, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
        {companies.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#0f0f1a', border: `1px solid ${i === 0 ? 'rgba(16,185,129,.2)' : '#1e1e2e'}`, borderRadius: 7 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: `rgba(${i===0?'16,185,129':i===1?'107,71,245':'245,158,11'},.12)`, border: `1px solid rgba(${i===0?'16,185,129':i===1?'107,71,245':'245,158,11'},.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: i===0?'#10b981':i===1?'#A992FA':'#f59e0b', fontFamily: "'DM Mono',monospace" }}>{c.score}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f0ff' }}>{c.name}</span>
                <span style={{ padding: '1px 6px', borderRadius: 4, background: c.tagBg, fontSize: 8, fontFamily: "'DM Mono',monospace", color: c.tagColor, letterSpacing: '.06em' }}>{c.tag}</span>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.32)', letterSpacing: '.03em' }}>{c.desc}</div>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(235,235,235,.25)', flexShrink: 0 }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEMO_MOCKUPS = {
  0: <MockGmail />,
  1: <MockDashboardAgents />,
  2: <MockSlack />,
  4: <MockCalendar />,
  5: <MockDashboardMatches />,
};

function DealTimeline() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [entered, setEntered] = useState(false);
  const sectionRef = useRef(null);
  const timerRef = useRef(null);
  const activeIdxRef = useRef(0);
  const CYCLE_MS = 4500;

  const goTo = (idx) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    setAnimKey(k => k + 1);
  };

  useEffect(() => {
    if (!entered) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      const pos = DEMO_CYCLEABLES.indexOf(activeIdxRef.current);
      const next = (pos + 1) % DEMO_CYCLEABLES.length;
      goTo(DEMO_CYCLEABLES[next]);
    }, CYCLE_MS);
    return () => clearInterval(timerRef.current);
  }, [entered]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setEntered(e.isIntersecting), { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const STATS = [
    { n: '11', label: 'agents dispatched' },
    { n: '247', label: 'companies ingested' },
    { n: '8', label: 'mandate matches' },
    { n: '1', label: 'signal suppressed' },
  ];

  return (
    <section id="demo" ref={sectionRef} style={{ padding: '80px 0 96px', background: '#07070A' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 12 }}>One deal. Six weeks.</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(24px,2.8vw,36px)', fontWeight: 600, lineHeight: 1.08, color: '#EBEBEB', letterSpacing: '-.02em', marginBottom: 14, maxWidth: 640 }}>
            Reidar works across your entire deal lifecycle.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(235,235,235,.38)', lineHeight: 1.7, maxWidth: 520 }}>
            From the moment a pitch lands in your inbox to the moment you walk into IC — across every surface, without being asked.
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 40, borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '14px 0', paddingLeft: i > 0 ? 24 : 0, borderLeft: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none', marginLeft: i > 0 ? 0 : 0 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: '#f0f0ff', lineHeight: 1, marginBottom: 4 }}>{s.n}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.32)', letterSpacing: '.07em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Two-panel layout */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          {/* Left: event feed */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DEMO_EVENTS.map((ev, i) => {
              const isActive = activeIdx === ev.id;
              const isNoise = ev.id === 3;
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    if (isNoise) return;
                    clearInterval(timerRef.current);
                    goTo(ev.id);
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isActive ? 'rgba(107,71,245,.35)' : 'rgba(255,255,255,.05)'}`,
                    background: isActive ? 'rgba(107,71,245,.08)' : 'transparent',
                    cursor: isNoise ? 'default' : 'pointer',
                    opacity: isNoise ? 0.38 : 1,
                    transition: 'border-color .25s ease, background .25s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.3)', letterSpacing: '.04em', flexShrink: 0 }}>{ev.time}</span>
                    {ev.surface && (
                      <span style={{ padding: '1px 6px', borderRadius: 4, background: `rgba(${ev.surfaceColor === '#EA4335' ? '234,67,53' : ev.surfaceColor === '#6B47F5' ? '107,71,245' : ev.surfaceColor === '#4ade80' ? '74,222,128' : '66,133,244'},.12)`, fontSize: 8, fontFamily: "'DM Mono',monospace", color: ev.surfaceColor, letterSpacing: '.05em' }}>{ev.surface}</span>
                    )}
                    {isNoise && <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,.05)', fontSize: 8, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.3)', letterSpacing: '.05em' }}>SUPPRESSED</span>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: isActive ? '#f0f0ff' : 'rgba(235,235,235,.55)', lineHeight: 1.4, marginBottom: 3 }}>{ev.label}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: isActive ? 'rgba(169,146,250,.6)' : 'rgba(235,235,235,.22)', letterSpacing: '.02em' }}>{ev.detail}</div>
                </div>
              );
            })}
          </div>

          {/* Right: mockup */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {DEMO_EVENTS[activeIdx] && DEMO_EVENTS[activeIdx].hasMockup ? (
              <div key={animKey} style={{ animation: 'fadeUp .35s ease both', boxShadow: '0 8px 48px rgba(0,0,0,.55)', borderRadius: 10 }}>
                {DEMO_MOCKUPS[activeIdx]}
              </div>
            ) : (
              <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,.3)', letterSpacing: '.08em', marginBottom: 8 }}>SIGNAL SUPPRESSED</div>
                  <div style={{ fontSize: 13, color: 'rgba(235,235,235,.4)' }}>Not every signal needs your attention.<br/>Reidar decides what does.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
/* ─── THREE MOMENTS ─── */
const MOMENTS = [
  { tag: "Before every meeting", h: "Walk in knowing everything your firm already knows.", p: "Reidar surfaces your prior contact history, original thesis notes, portfolio conflicts, and suggested angles — generated from your own past decisions, not generic market data." },
  { tag: "When a pitch comes in", h: "Every inbound evaluated before you open it.", p: "A warm intro hits your inbox. Reidar reads it, scores it against your mandate, and adds it to your pipeline — already ranked against your pattern of conviction." },
  { tag: "When a company comes back", h: "You passed 14 months ago. Something just changed.", p: "Reidar surfaces your original pass reason and shows you exactly what's different now. You're updating a position — the way a good investor actually thinks." },
];

function ThreeMoments() {
  const [isActive, setIsActive] = useState(false);
  const [entered, setEntered] = useState(false);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [allVisible, setAllVisible] = useState(false);
  const DURATION = 4000;
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setEntered(true); setIsActive(true); }
      else { setIsActive(false); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!entered) { setAllVisible(false); return; }
    const t = setTimeout(() => setAllVisible(true), 900);
    return () => clearTimeout(t);
  }, [entered]);

  useEffect(() => {
    if (!isActive || !allVisible) { cancelAnimationFrame(frameRef.current); return; }
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed >= DURATION) {
        startRef.current = null;
        setActive(a => (a + 1) % MOMENTS.length);
        setProgress(0);
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isActive, active, allVisible]);

  return (
    <div ref={ref} className="moments-grid">
      {MOMENTS.map((m, i) => (
        <div
          key={i}
          className={`moment-card${active === i ? ' moment-active' : ''}`}
          onClick={() => { if (entered) { setActive(i); setProgress(0); startRef.current = null; } }}
          style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(26px)', transition: `opacity .45s ${120 + i * 140}ms ease, transform .45s ${120 + i * 140}ms ease, background .25s ease` }}
        >
          <div className="moment-num">0{i + 1}</div>
          <div className="moment-tag">{m.tag}</div>
          <div className="moment-h">{m.h}</div>
          <div className="moment-p">{m.p}</div>
          <div className="moment-prog">
            <div className="moment-prog-bar" style={{ width: active === i ? `${progress}%` : '0%', transition: 'none' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── INTEGRATIONS ORBIT ─── */
const INTEGRATIONS = [
  { name: "Affinity",        desc: "Sync deal flow, relationship data, and pipeline from the most popular VC CRM", badge: "Coming soon", iconBg: "rgba(99,102,241,.15)",  iconBorder: "rgba(99,102,241,.4)" },
  { name: "Attio",           desc: "Import deal history, contact records, and pipeline stages from your Attio workspace", badge: "Coming soon", iconBg: "rgba(255,255,255,.08)", iconBorder: "rgba(255,255,255,.25)" },
  { name: "Gmail",           desc: "Inbound pitches auto-detected, founder emails captured, warm intros logged passively", badge: "Coming soon", iconBg: "rgba(234,67,53,.15)", iconBorder: "rgba(234,67,53,.4)" },
  { name: "Slack",           desc: "Deal discussions captured, weekly briefs delivered, ask Reidar anything in-channel", badge: "Coming soon", iconBg: "rgba(224,30,90,.15)", iconBorder: "rgba(224,30,90,.4)" },
  { name: "Google Calendar", desc: "Founder meetings auto-detected, pre-call briefs generated, context logged after", badge: "Coming soon", iconBg: "rgba(66,133,244,.15)", iconBorder: "rgba(66,133,244,.4)" },
  { name: "Granola",         desc: "Meeting notes and transcripts flow in automatically — no manual upload needed", badge: "Coming soon", iconBg: "rgba(245,158,11,.15)", iconBorder: "rgba(245,158,11,.4)" },
  { name: "Fireflies",       desc: "Call transcripts from every founder meeting auto-imported and linked to records", badge: "Coming soon", iconBg: "rgba(74,222,128,.15)", iconBorder: "rgba(74,222,128,.4)" },
  { name: "Crunchbase",      desc: "Company profiles, funding history, and investor data enriched automatically", badge: "Coming soon", iconBg: "rgba(2,136,209,.15)",  iconBorder: "rgba(2,136,209,.4)" },
  { name: "PitchBook",       desc: "Deep company data, valuations, and comparable transactions pulled into research", badge: "Coming soon", iconBg: "rgba(0,51,102,.15)",  iconBorder: "rgba(0,51,102,.4)" },
  { name: "Harmonic",        desc: "Early-stage company signals and founder data enriching your coverage feed", badge: "Coming soon", iconBg: "rgba(168,85,247,.15)", iconBorder: "rgba(168,85,247,.4)" },
  { name: "LinkedIn",        desc: "Founder backgrounds, team signals, and network connections surfaced inline", badge: "Coming soon", iconBg: "rgba(0,119,181,.15)",  iconBorder: "rgba(0,119,181,.4)" },
  { name: "Notion",          desc: "Push investment memos and company briefs directly to your team workspace", badge: "Coming soon", iconBg: "rgba(255,255,255,.08)", iconBorder: "rgba(255,255,255,.2)" },
];

const ORBIT_SVGS = [
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l4 7H8l4-7zm0 20l-4-7h8l-4 7zM2 12l4-4v8L2 12zm20 0l-4 4V8l4 4z" fill="#6366f1"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#ffffff"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#E01E5A"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="#4285F4"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="#f59e0b" strokeWidth="1.8" fill="none"/><line x1="8" y1="8" x2="16" y2="8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="16" x2="13" y2="16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" fill="#4ade80"/><path d="M5 10a7 7 0 0014 0" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" fill="none"/><line x1="12" y1="17" x2="12" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="22" x2="16" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="12" width="5" height="8" rx="1" fill="#0288D1"/><rect x="9.5" y="7" width="5" height="13" rx="1" fill="#0288D1"/><rect x="17" y="4" width="5" height="16" rx="1" fill="#0288D1"/><line x1="2" y1="23" x2="22" y2="23" stroke="#0288D1" strokeWidth="1.5"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#336699" strokeWidth="1.8" fill="none"/><line x1="7" y1="12" x2="17" y2="12" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="8" x2="17" y2="8" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="16" x2="13" y2="16" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12 Q6 4 12 12 Q18 20 22 12" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M2 12 Q6 16 12 12 Q18 8 22 12" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 3h4.5l9 13.5V3H21v18h-4.5L7.5 7.5V21H4V3z" fill="#ffffff"/></svg>,
];

function IntegrationsOrbit() {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const innerAngle = useRef(0);
  const outerAngle = useRef(0);
  const pausedRef = useRef(false);
  const [selected, setSelected] = useState(null);
  const [iconPositions, setIconPositions] = useState({});

  const R_INNER = 110;
  const R_OUTER = 185;
  const INNER_SPD = (Math.PI * 2) / (22 * 60);
  const OUTER_SPD = (Math.PI * 2) / (30 * 60);
  const INNER = [0, 2, 3, 4, 5, 7];
  const OUTER = [1, 6, 8, 9, 10, 11];
  const CENTER = 210;

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const inn = c.querySelectorAll('[data-inner]');
    const out = c.querySelectorAll('[data-outer]');
    const go = () => {
      if (!pausedRef.current) {
        innerAngle.current += INNER_SPD;
        outerAngle.current += OUTER_SPD;
      }
      inn.forEach((el, i) => {
        const a = innerAngle.current + (i / INNER.length) * Math.PI * 2 - Math.PI / 2;
        el.style.transform = `translate(${Math.cos(a) * R_INNER}px,${Math.sin(a) * R_INNER}px)`;
      });
      out.forEach((el, i) => {
        const a = outerAngle.current + (i / OUTER.length) * Math.PI * 2 - Math.PI / 2;
        el.style.transform = `translate(${Math.cos(a) * R_OUTER}px,${Math.sin(a) * R_OUTER}px)`;
      });
      frameRef.current = requestAnimationFrame(go);
    };
    frameRef.current = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const capturePositions = () => {
    const pos = {};
    INNER.forEach((idx, i) => {
      const a = innerAngle.current + (i / INNER.length) * Math.PI * 2 - Math.PI / 2;
      pos[idx] = { x: CENTER + Math.cos(a) * R_INNER, y: CENTER + Math.sin(a) * R_INNER };
    });
    OUTER.forEach((idx, i) => {
      const a = outerAngle.current + (i / OUTER.length) * Math.PI * 2 - Math.PI / 2;
      pos[idx] = { x: CENTER + Math.cos(a) * R_OUTER, y: CENTER + Math.sin(a) * R_OUTER };
    });
    return pos;
  };

  const handleSelect = (idx) => {
    if (selected === idx) { setSelected(null); pausedRef.current = false; }
    else { setSelected(idx); pausedRef.current = true; setIconPositions(capturePositions()); }
  };

  const selInt = selected !== null ? INTEGRATIONS[selected] : null;
  const selPos = selected !== null ? iconPositions[selected] : null;
  const iconBgSelected = (bg) => typeof bg === 'string' ? bg.replace(/[\d.]+\)$/, '0.3)') : bg;

  const icon = (idx, ring) => {
    const int = INTEGRATIONS[idx];
    const isSel = selected === idx;
    const dataProps = ring === 'inner' ? { 'data-inner': '' } : { 'data-outer': '' };
    return (
      <div key={int.name} {...dataProps} style={{ position: 'absolute', top: 'calc(50% - 22px)', left: 'calc(50% - 22px)', width: 44, height: 44, zIndex: 3 }} onClick={() => handleSelect(idx)}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: isSel ? iconBgSelected(int.iconBg) : int.iconBg, border: `1px solid ${isSel ? int.iconBorder : 'rgba(255,255,255,.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transform: isSel ? 'scale(1.18)' : 'none', transition: 'transform .25s, border-color .25s, box-shadow .25s, background .25s', boxShadow: isSel ? `0 0 20px ${String(int.iconBorder).replace(/[\d.]+\)$/, '0.5)')}` : 'none' }}>{ORBIT_SVGS[idx]}</div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
      <div ref={containerRef} style={{ position: 'relative', width: 420, height: 420, flexShrink: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4 }}>
          {selPos && <line x1={CENTER} y1={CENTER} x2={selPos.x} y2={selPos.y} stroke="rgba(107,71,245,0.5)" strokeWidth="1" strokeDasharray="4 4" />}
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: R_INNER * 2, height: R_INNER * 2, marginTop: -R_INNER, marginLeft: -R_INNER, borderRadius: '50%', border: '1px solid rgba(107,71,245,.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: R_OUTER * 2, height: R_OUTER * 2, marginTop: -R_OUTER, marginLeft: -R_OUTER, borderRadius: '50%', border: '1px solid rgba(107,71,245,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: 13, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, animation: 'glowPulse 3s ease-in-out infinite' }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="7" cy="7" r="2" fill="white" /></svg>
        </div>
        {INNER.map((i) => icon(i, 'inner'))}
        {OUTER.map((i) => icon(i, 'outer'))}
      </div>
      <div style={{ width: selected !== null ? 260 : 0, opacity: selected !== null ? 1 : 0, overflow: 'hidden', transition: 'width .3s cubic-bezier(.4,0,.2,1), opacity .25s ease', flexShrink: 0, marginLeft: selected !== null ? 24 : 0 }}>
        {selInt && (
          <div style={{ background: 'rgba(13,13,20,.9)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '20px 20px', width: 260, animation: 'panelIn .2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: selInt.iconBg, border: `1px solid ${selInt.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ORBIT_SVGS[selected]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#EBEBEB' }}>{selInt.name}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: '.06em', color: 'rgba(107,71,245,.7)', marginTop: 2 }}>{selInt.badge}</div>
              </div>
              <button type="button" onClick={() => { setSelected(null); pausedRef.current = false; }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(235,235,235,.25)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 14 }} />
            <div style={{ fontSize: 12, color: 'rgba(235,235,235,.62)', lineHeight: 1.6 }}>{selInt.desc}</div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(107,71,245,.5)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.2)', letterSpacing: '.06em' }}>On the roadmap</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── THESIS SECTION ─── */
/* ─── PROBLEM SECTION ─── */
const COMPETITOR_CARDS = [
  { name: "Harmonic",             tag: "Data infrastructure",        desc: "50M+ company profiles. Best-in-class data. Goes silent the moment you close the tab." },
  { name: "Affinity",             tag: "Relationship CRM",           desc: "Knows everyone you've met. Doesn't know why any of them matter to your thesis." },
  { name: "PitchBook",            tag: "Market intelligence",        desc: "$12K–$100K per year to answer questions you remembered to ask." },
  { name: "Spreadsheets + memory", tag: "What everyone actually uses", desc: "Free, flexible, and completely unable to tell you what you already know." },
];

function ProblemSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition: `opacity .55s ${d}ms ease, transform .55s ${d}ms ease` });
  return (
    <section id="problem" ref={ref} style={{ padding: '120px 0', borderTop: '1px solid rgba(255,255,255,.04)' }}>
      <div className="sec-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 80, alignItems: 'start' }}>
          {/* Left col */}
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.12em', color:'#A992FA', textTransform:'uppercase', marginBottom:20, ...T(0) }}>The problem</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,2.8vw,40px)', fontWeight:600, color:'#EBEBEB', lineHeight:1.15, letterSpacing:'-.02em', marginBottom:28, ...T(80) }}>
              The tools that exist today wait for you to show up.
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                "Harmonic surfaces companies when you search. Affinity logs relationships when you update it. PitchBook answers questions when you ask. None of them watch. None of them remember. None of them work when you're not looking.",
                "The investment process is a continuous conversation — across emails, meetings, calls, and decisions made over years. The intelligence that matters most isn't in any database. It's in how your firm reasons: why you passed, what would change your mind, which founders fit your pattern, which markets you believe in before anyone else does.",
                "That reasoning has never been captured. Until now.",
              ].map((p, i) => (
                <p key={i} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, color:'rgba(235,235,235,.55)', lineHeight:1.75, margin:0, ...T(160 + i * 60) }}>{p}</p>
              ))}
            </div>
          </div>
          {/* Right col */}
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
              {COMPETITOR_CARDS.map((c, i) => (
                <div key={i} style={{ background:'#0C0C10', border:'1px solid rgba(255,255,255,.06)', borderRadius:10, padding:20, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(14px)', transition: `opacity .45s ${100 + i * 100}ms ease, transform .45s ${100 + i * 100}ms ease` }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#EBEBEB', marginBottom:4 }}>{c.name}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,.28)', letterSpacing:'.04em', marginBottom:10 }}>{c.tag}</div>
                  <p style={{ fontSize:12, color:'rgba(235,235,235,.62)', lineHeight:1.6, margin:0 }}>{c.desc}</p>
                </div>
              ))}
            </div>
            {/* Reidar contrast row */}
            <div style={{ borderTop:'1px solid rgba(107,71,245,.2)', paddingTop:16, display:'flex', alignItems:'flex-start', gap:10, opacity: entered ? 1 : 0, transition:'opacity .55s 500ms ease' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#6B47F5', flexShrink:0, marginTop:4 }} />
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(235,235,235,.6)', lineHeight:1.65, margin:0 }}>
                Reidar watches your workflow, deploys research automatically, and surfaces intelligence the moment it's relevant — without being asked.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── MOMENTS SECTION ─── */
function MomentsSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(18px)', transition: `opacity .5s ${d}ms ease, transform .5s ${d}ms ease` });
  return (
    <section id="moments" ref={ref} style={{ padding: '96px 0' }}>
      <div className="sec-inner">
        <div className="s-tag" style={T(0)}>What it does</div>
        <h2 className="s-h2" style={T(80)}>Three moments where <em>Reidar changes the outcome.</em></h2>
        <p className="s-p" style={T(160)}>Not a dashboard you open. A layer that's already working.</p>
        <ThreeMoments />
      </div>
    </section>
  );
}

/* ─── HOW SECTION ─── */
const STEPS = [
  { n: "01", t: "Connect", d: "Link Gmail, Google Calendar, and your existing tools in five minutes. No data import project. No setup call. Reidar reads how you already work and starts building context immediately." },
  { n: "02", t: "Capture", d: "Every founder meeting, inbound pitch, pass decision, and follow-up email feeds the intelligence layer — passively. No logging. No forms. No behavior change required." },
  { n: "03", t: "Compound", d: "After 30 days, Reidar knows your patterns. After 90 days, it surfaces connections you wouldn't have made yourself. The private intelligence layer that gets sharper with every decision you make." },
];

function HowSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(18px)', transition: `opacity .5s ${d}ms ease, transform .5s ${d}ms ease` });
  return (
    <section id="how" ref={ref} style={{ padding: '96px 0' }}>
      <div className="sec-inner">
        <div className="s-tag" style={T(0)}>How it works</div>
        <h2 className="s-h2" style={T(80)}>Connect once. <em>Compound forever.</em></h2>
        <p className="s-p" style={T(160)}>No onboarding workflow. No data import project. Reidar starts learning from the moment you connect.</p>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.n} style={{ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(18px)', transition: `opacity .5s ${120 + i * 140}ms ease, transform .5s ${120 + i * 140}ms ease` }}>
              <div className="step-n">{s.n}</div>
              <div className="step-t">{s.t}</div>
              <div className="step-d">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── USE CASES SECTION ─── */
const USE_CASES = [
  {
    label: "SOURCING",
    h3: "Deal flow that matches how you actually invest.",
    body: "Reidar sources nightly across YC, ProductHunt, and the open web — scored against your mandate before you see a single result. Every morning: a ranked list of companies worth your attention. The ones that aren't never reach you.",
  },
  {
    label: "EVALUATION",
    h3: "From inbound pitch to structured memo in minutes.",
    body: "A deck lands in your inbox. Reidar reads it, scores it against your thesis, checks your pass history for comparable companies, flags portfolio conflicts, and generates a structured investment brief — before you've opened the email.",
  },
  {
    label: "INSTITUTIONAL MEMORY",
    h3: "Every decision your firm has ever made. Remembered.",
    body: "Every pass reason, every conviction note, every partner objection — captured from your normal workflow and embedded into a private intelligence layer that compounds over time. When a company comes back, Reidar shows you exactly what you thought last time and what has changed.",
  },
];

function UseCasesSection() {
  const [entered, ref] = useSectionEntry();
  return (
    <section id="use-cases" ref={ref} style={{ padding: '96px 0' }}>
      <div className="sec-inner">
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 14, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(16px)', transition: 'opacity .5s ease, transform .5s ease' }}>Use cases</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {USE_CASES.map((c, i) => (
            <div key={i} style={{ padding: '28px 24px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition: `opacity .5s ${80 + i * 120}ms ease, transform .5s ${80 + i * 120}ms ease` }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: '.1em', color: 'rgba(107,71,245,.6)', textTransform: 'uppercase', marginBottom: 14 }}>{c.label}</div>
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 600, color: '#EBEBEB', letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 12 }}>{c.h3}</h3>
              <p style={{ fontSize: 13, color: 'rgba(235,235,235,.62)', lineHeight: 1.72 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── TWO POOL DIAGRAM ─── */
const POOL1_SOURCES = [
  { name: 'YC / HN / ProductHunt',  desc: 'Startup launches, founder profiles' },
  { name: 'Brave Search',            desc: 'Live web research, news signals' },
  { name: 'Funding rounds',          desc: 'Rounds, investors, valuations' },
  { name: 'RSS feeds · 13 sources',  desc: 'TechCrunch, WSJ, VentureBeat' },
  { name: 'Company profiles',        desc: 'Founders, team, sector tags' },
];
const POOL2_SOURCES = [
  { name: 'Pass reasons',         desc: 'Why your firm said no, and what would change it' },
  { name: 'Partner objections',   desc: 'IC patterns, defensibility concerns' },
  { name: 'Meeting transcripts',  desc: 'Granola, Otter, Fathom — extracted signals' },
  { name: 'Personal conviction',  desc: 'Your lens, separate from the firm\'s' },
  { name: 'Score overrides',      desc: 'Every correction trains the stack' },
];

const FLOW_LINE_LEFT  = [
  { dots: ['#7F77DD','#6B47F5','#A992FA'] },
  { dots: ['#A992FA','#7F77DD','#6B47F5'] },
  { dots: ['#6B47F5','#A992FA','#7F77DD'] },
];
const FLOW_LINE_RIGHT = [
  { dots: ['#1D9E75','#10b981','#5DCAA5'] },
  { dots: ['#10b981','#5DCAA5','#1D9E75'] },
  { dots: ['#5DCAA5','#1D9E75','#10b981'] },
];

function FlowLines({ lines, dir }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-around', alignSelf:'stretch', paddingTop:8 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ position:'relative', height:1, background:'rgba(255,255,255,0.06)', overflow:'visible', margin:'20px 0' }}>
          {line.dots.map((color, di) => (
            <span key={di} style={{
              position:'absolute', top:-2, width:5, height:5, borderRadius:'50%', background:color,
              animation:`${dir === 'left' ? 'flowLeft' : 'flowRight'} 2s ease-in-out infinite`,
              animationDelay:`${di * 0.7}s`,
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

const AGENT_PILLS = [
  { label:'market research',   status:'done',    dotColor:'#A992FA', dotDelay:'0s',   opacity:1 },
  { label:'competitive intel', status:'done',    dotColor:'#A992FA', dotDelay:'0.3s', opacity:1 },
  { label:'founder assessment',status:'running', dotColor:'#D97706', dotDelay:'0.6s', opacity:1 },
  { label:'pool 2 retrieval',  status:'queued',  dotColor:'rgba(255,255,255,0.2)', dotDelay:'0s', opacity:0.4 },
];

const DIAG_HEX = (
  <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
    <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="7" cy="7" r="2.2" fill="white"/>
  </svg>
);

function TwoPoolDiagram() {
  return (
    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'28px 24px 20px', overflow:'hidden', position:'relative' }}>
      {/* Top label */}
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(107,71,245,0.5)', textAlign:'center', marginBottom:20 }}>
        How Reidar generates intelligence
      </div>

      {/* Column headers */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 52px 196px 52px 1fr', gap:0, marginBottom:8 }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(107,71,245,0.5)', textAlign:'center', paddingBottom:8 }}>Pool 1 — Global</div>
        <div />
        <div />
        <div />
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(16,185,129,0.5)', textAlign:'center', paddingBottom:8 }}>Pool 2 — Your firm</div>
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 52px 196px 52px 1fr', gap:0, alignItems:'start' }}>

        {/* Col 1 — Pool 1 sources */}
        <div style={{ display:'flex', flexDirection:'column', gap:7, paddingRight:6 }}>
          {POOL1_SOURCES.map((s) => (
            <div key={s.name} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'9px 12px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'rgba(107,71,245,0.4)' }} />
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.55)', letterSpacing:'0.03em' }}>{s.name}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'rgba(235,235,235,0.25)', marginTop:3, lineHeight:1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Col 2 — Left flow lines */}
        <FlowLines lines={FLOW_LINE_LEFT} dir="left" />

        {/* Col 3 — Center */}
        <div style={{ display:'flex', flexDirection:'column' }}>
          {/* Pool 1 badge */}
          <div style={{ width:'100%', padding:'4px 10px', background:'rgba(107,71,245,0.06)', border:'1px solid rgba(107,71,245,0.15)', borderRadius:3, textAlign:'center', fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(107,71,245,0.6)', marginBottom:6 }}>
            Market context
          </div>

          {/* Reidar core card */}
          <div style={{ background:'#0C0C14', border:'1px solid rgba(107,71,245,0.3)', borderRadius:12, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:24, height:24, borderRadius:6, background:'#6B47F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{DIAG_HEX}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:500, color:'#EBEBEB', letterSpacing:'0.04em' }}>Reidar</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'rgba(169,146,250,0.5)', marginTop:1 }}>Generating brief...</div>
              </div>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'pulse 2s ease-in-out infinite', flexShrink:0 }} />
            </div>
            {/* Agent pills */}
            <div style={{ padding:'10px 12px' }}>
              {AGENT_PILLS.map((pill) => (
                <div key={pill.label} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:5, background:'rgba(107,71,245,0.08)', border:'1px solid rgba(107,71,245,0.15)', marginBottom:5, opacity:pill.opacity }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:pill.dotColor, display:'inline-block', flexShrink:0, animation:`pulseDot 1.8s ease-in-out infinite`, animationDelay:pill.dotDelay }} />
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(169,146,250,0.7)', letterSpacing:'0.03em', flex:1 }}>{pill.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'rgba(169,146,250,0.3)', marginLeft:'auto' }}>{pill.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pool 2 badge */}
          <div style={{ width:'100%', padding:'4px 10px', background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:3, textAlign:'center', fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(16,185,129,0.6)', marginTop:6, marginBottom:8 }}>
            Firm reasoning
          </div>

          {/* Output label */}
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(235,235,235,0.2)', textAlign:'center', marginBottom:6 }}>
            Surfaces to
          </div>

          {/* Output pills */}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {[
              { dot:'#4ade80', name:'Slack',     action:'brief ready' },
              { dot:'#4285F4', name:'Calendar',  action:'pre-meeting' },
              { dot:'#A992FA', name:'Dashboard', action:'full brief'  },
            ].map((o) => (
              <div key={o.name} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:6 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:o.dot, display:'inline-block', flexShrink:0 }} />
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.45)' }}>{o.name}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'rgba(235,235,235,0.2)', marginLeft:'auto' }}>{o.action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 4 — Right flow lines */}
        <FlowLines lines={FLOW_LINE_RIGHT} dir="right" />

        {/* Col 5 — Pool 2 sources */}
        <div style={{ display:'flex', flexDirection:'column', gap:7, paddingLeft:6 }}>
          {POOL2_SOURCES.map((s) => (
            <div key={s.name} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'9px 12px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2, background:'rgba(16,185,129,0.4)' }} />
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.55)', letterSpacing:'0.03em' }}>{s.name}</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:'rgba(235,235,235,0.25)', marginTop:3, lineHeight:1.4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(107,71,245,0.4)' }}>Pool 1 — shared across all firms · never the moat</span>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(16,185,129,0.4)' }}>Pool 2 — private to your firm · the moat</span>
      </div>
    </div>
  );
}

/* ─── REASONING LAYER SECTION ─── */
function ReasoningLayerSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition: `opacity .55s ${d}ms ease, transform .55s ${d}ms ease` });
  return (
    <section ref={ref} style={{ padding:'120px 0', borderTop:'1px solid rgba(255,255,255,.04)' }}>
      <div className="sec-inner">
        {/* Centered header */}
        <div style={{ maxWidth:640, margin:'0 auto', textAlign:'center', marginBottom:56 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.12em', color:'#A992FA', textTransform:'uppercase', marginBottom:16, ...T(0) }}>What makes Reidar different</div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,3vw,44px)', fontWeight:600, color:'#EBEBEB', lineHeight:1.1, letterSpacing:'-.02em', marginBottom:20, ...T(80) }}>Not a database.<br />A reasoning layer.</h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, color:'rgba(235,235,235,.68)', lineHeight:1.7, margin:0, ...T(160) }}>Other tools store what happened. Reidar structures how you thought about it — and retrieves that reasoning at the moment it matters again.</p>
        </div>

        {/* Architecture diagram — full width, no cards below */}
        <div style={{ ...T(200) }}>
          <TwoPoolDiagram />
        </div>

        {/* Three-column plain-language callout */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, marginTop:24, background:'rgba(255,255,255,0.04)', borderRadius:10, overflow:'hidden', ...T(280) }}>
          {/* Pool 1 */}
          <div style={{ background:'#07070A', padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(107,71,245,0.5)', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(107,71,245,0.6)' }}>Pool 1 — Shared</span>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(235,235,235,.4)', lineHeight:1.65, margin:0 }}>Market context — companies, rounds, signals from public sources. Every firm starts here. Not the moat.</p>
          </div>
          {/* RAG layer */}
          <div style={{ background:'#07070A', padding:'20px 24px', borderLeft:'1px solid rgba(255,255,255,0.04)', borderRight:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <span style={{ width:8, height:8, borderRadius:2, background:'rgba(235,235,235,0.15)', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(235,235,235,.25)' }}>At query time</span>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(235,235,235,.4)', lineHeight:1.65, margin:0 }}>Both pools are retrieved and weighted. Pool 2 heavily. Every output reflects your firm's specific reasoning — not a generic model's view of the market.</p>
          </div>
          {/* Pool 2 */}
          <div style={{ background:'#07070A', padding:'20px 24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'rgba(16,185,129,0.6)', display:'inline-block', flexShrink:0 }} />
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(16,185,129,0.6)' }}>Pool 2 — Yours alone</span>
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(235,235,235,.4)', lineHeight:1.65, margin:0 }}>Every pass reason, IC objection, conviction override — embedded and retrieved. Scoped to your firm. This is the moat. Gets more valuable with every decision.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PROACTIVE INTELLIGENCE SECTION ─── */
const INSIGHT_CARDS = [
  {
    dot: '#D97706', type: 'Thesis drift', typeColor: '#D97706', time: '2 hours ago',
    title: 'Your mandate may be filtering out a category you actually believe in.',
    text: 'You\'ve passed on <strong>14 clinical AI companies</strong> in 18 months. Consistent reason: no enterprise GTM. But <strong>3 are now at Series B</strong> with the same profile.',
    action: 'Review passes →',
  },
  {
    dot: '#ef4444', type: 'Pipeline health', typeColor: '#ef4444', time: 'Yesterday',
    title: '8 deals stalled in first_call for 45+ days.',
    text: 'Your historical close rate from this stage after 6 weeks is <strong>4%</strong>. These deals are unlikely to move without intervention.',
    action: 'See stalled deals →',
  },
  {
    dot: '#A992FA', type: 'Market signal', typeColor: '#A992FA', time: '3 days ago',
    title: '4 Tier 1 funds published clinical AI thesis pieces this quarter.',
    text: 'The window in your most active sector may be closing. <strong>$2.1B deployed</strong> in the last 90 days by funds with deeper pockets.',
    action: 'See funding activity →',
  },
  {
    dot: '#10b981', type: 'Pattern match', typeColor: '#10b981', time: '1 week ago',
    title: 'Your last 3 investments diverge from your highest-conviction pattern.',
    text: 'Your top 6 outcomes came from <strong>technical domain experts with prior exits</strong>. Your last 3 investments were first-time founders.',
    action: 'See pattern analysis →',
  },
];

const PANELS = [
  {
    title: 'Thesis drift analysis', sub: 'Clinical AI · 18-month lookback', iconColor: '#D97706',
    stats: [
      { label: 'Companies passed',       value: '14',             valueColor: 'rgba(235,235,235,0.6)' },
      { label: 'Consistent pass reason', value: 'No enterprise GTM', valueColor: '#D97706' },
      { label: 'Now at Series B',        value: '3 companies',    valueColor: '#10b981' },
      { label: 'Avg. time to Series B',  value: '14 months',      valueColor: 'rgba(235,235,235,0.6)' },
    ],
    bars: [
      { label: 'Pass rate in clinical AI', pct: 87, color: '#D97706' },
      { label: 'Sector share of pipeline', pct: 34, color: '#6B47F5' },
    ],
    noteSender: 'Reidar · thesis analysis',
    noteText: 'Your pass rate in clinical AI is <strong>87%</strong> — highest of any sector you track. But 3 passed companies have since raised Series B rounds with the same profile you flagged. The GTM gap may be closing faster than your mandate assumes. Worth revisiting your clinical AI criteria.',
  },
  {
    title: 'Pipeline health report', sub: 'first_call stage · 45+ days stalled', iconColor: '#ef4444',
    stats: [
      { label: 'Stalled deals',                      value: '8',       valueColor: '#ef4444' },
      { label: 'Avg. days in first_call',             value: '61 days', valueColor: 'rgba(235,235,235,0.6)' },
      { label: 'Historical close rate (6wk+)',         value: '4%',      valueColor: '#ef4444' },
      { label: 'Deals with no recent activity',        value: '5 of 8',  valueColor: '#D97706' },
    ],
    bars: [
      { label: 'Expected close rate at this stage', pct: 4,  color: '#ef4444' },
      { label: 'Deals worth reviewing now',          pct: 62, color: '#D97706' },
    ],
    noteSender: 'Reidar · pipeline analysis',
    noteText: 'Based on your historical pattern, deals that stay in first_call beyond 6 weeks almost never close. <strong>5 of these 8</strong> have had no email, call, or calendar activity in over 3 weeks. Recommend either reactivating with a specific ask or moving to passed to keep your pipeline signal clean.',
  },
  {
    title: 'Market compression signal', sub: 'Clinical AI · Q1 2026 activity', iconColor: '#A992FA',
    stats: [
      { label: 'Tier 1 thesis pieces published', value: '4 this quarter', valueColor: '#A992FA' },
      { label: 'Capital deployed (90 days)',      value: '$2.1B',          valueColor: 'rgba(235,235,235,0.6)' },
      { label: 'Avg. seed valuation change',      value: '+34% YoY',       valueColor: '#D97706' },
      { label: 'Your pipeline companies in sector', value: '6 active',     valueColor: 'rgba(235,235,235,0.6)' },
    ],
    bars: [
      { label: 'Sector crowding index', pct: 78, color: '#A992FA' },
    ],
    noteSender: 'Reidar · market analysis',
    noteText: 'When Tier 1 funds publish thesis pieces, seed valuations in that sector typically inflate within 2 quarters. <strong>4 funds</strong> have now staked a public position in clinical AI. Your 6 active pipeline companies are likely to see competitive term sheets. Moving faster on your highest-conviction deal may be worth considering.',
  },
  {
    title: 'Investment pattern analysis', sub: 'Personal conviction patterns · all time', iconColor: '#10b981',
    stats: [
      { label: 'Top pattern: technical domain expert', value: '6 investments',   valueColor: '#10b981' },
      { label: 'Outcome rate (top pattern)',            value: '4 of 6 strong',   valueColor: '#10b981' },
      { label: 'Last 3 investments',                   value: 'First-time founders', valueColor: '#D97706' },
      { label: 'Outcome rate (divergent pattern)',      value: '1 of 3 strong',   valueColor: 'rgba(235,235,235,0.4)' },
    ],
    bars: [
      { label: 'Technical domain expert outcome rate', pct: 67, color: '#10b981' },
      { label: 'First-time founder outcome rate',      pct: 33, color: '#D97706' },
    ],
    noteSender: 'Reidar · pattern analysis',
    noteText: 'This isn\'t a rule — it\'s a pattern from your own history. Your last 3 investments diverge from the founder profile where you\'ve had the strongest outcomes. Worth being deliberate about whether the thesis has shifted or whether this is drift. <strong>No recommendation</strong> — just surfacing what the data shows.',
  },
];

const PANEL_HEX = (color) => (
  <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
    <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="7" cy="7" r="2.2" fill={color}/>
  </svg>
);

function ProactiveIntelligenceSection() {
  const [activeInsight, setActiveInsight] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition: `opacity .55s ${d}ms ease, transform .55s ${d}ms ease` });

  const panel = PANELS[activeInsight];
  const card  = INSIGHT_CARDS[activeInsight];

  return (
    <section ref={ref} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '120px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* Header */}
        <div style={{ maxWidth: 640, marginBottom: 48 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(107,71,245,0.55)', marginBottom:14, ...T(0) }}>
            Proactive intelligence
          </div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(32px,3.5vw,44px)', fontWeight:600, color:'#EBEBEB', lineHeight:1.1, letterSpacing:'-0.02em', marginBottom:16, ...T(80) }}>
            Reidar tells you what <span style={{ color:'#A992FA' }}>you didn't think to ask.</span>
          </h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, color:'rgba(235,235,235,0.45)', lineHeight:1.7, maxWidth:520, margin:'0 0 0', ...T(160) }}>
            Reidar watches your entire deal flow and surfaces patterns you'd never notice manually — thesis drift, stalled pipeline, market compression, conviction patterns. Not because you asked. Because it noticed.
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

          {/* LEFT — insight feed */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {INSIGHT_CARDS.map((c, idx) => {
              const isActive = activeInsight === idx;
              return (
                <div
                  key={idx}
                  onClick={() => { setActiveInsight(idx); setAnimKey(k => k + 1); }}
                  style={{
                    background: '#0C0C10',
                    border: `1px solid ${isActive ? 'rgba(107,71,245,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 10, overflow:'hidden', cursor:'pointer',
                    transition:'border-color 0.2s ease',
                    opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)',
                    transition2: `border-color 0.2s ease, opacity .55s ${120 + idx * 80}ms ease, transform .55s ${120 + idx * 80}ms ease`,
                  }}
                >
                  {/* Header row */}
                  <div style={{ padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, display:'inline-block', flexShrink:0 }} />
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'0.08em', color:c.typeColor }}>{c.type}</span>
                    </div>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,0.2)' }}>{c.time}</span>
                  </div>
                  {/* Body */}
                  <div style={{ padding:'12px 14px' }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color:'rgba(235,235,235,0.8)', marginBottom:6, lineHeight:1.4 }}>{c.title}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(235,235,235,0.45)', lineHeight:1.65, marginBottom:10 }} dangerouslySetInnerHTML={{ __html: c.text.replace(/<strong>/g, '<strong style="color:rgba(235,235,235,0.7);font-weight:500">') }} />
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(107,71,245,0.6)', letterSpacing:'0.04em' }}>{c.action}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — detail panel */}
          <div key={animKey} style={{ background:'#0C0C10', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden', minHeight:340, animation:'insightFadeIn 0.25s ease both' }}>
            {/* Panel header */}
            <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'rgba(107,71,245,0.12)', border:'1px solid rgba(107,71,245,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {PANEL_HEX(panel.iconColor)}
              </div>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500, color:'#EBEBEB' }}>{panel.title}</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,0.3)', marginTop:2 }}>{panel.sub}</div>
              </div>
            </div>
            {/* Panel body */}
            <div style={{ padding:16 }}>
              {/* Stat rows */}
              {panel.stats.map((s, si) => (
                <div key={si} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom: si < panel.stats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(235,235,235,0.4)' }}>{s.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:s.valueColor }}>{s.value}</span>
                </div>
              ))}
              {/* Bar rows */}
              <div style={{ marginTop:14 }}>
                {panel.bars.map((b, bi) => (
                  <div key={bi}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,0.3)' }}>{b.label}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,0.3)' }}>{b.pct}%</span>
                    </div>
                    <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:10 }}>
                      <div style={{ height:'100%', width:`${b.pct}%`, background:b.color, borderRadius:2 }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Reidar note */}
              <div style={{ marginTop:14, padding:'10px 12px', background:'rgba(107,71,245,0.06)', border:'1px solid rgba(107,71,245,0.15)', borderRadius:7 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'#A992FA', marginBottom:5, letterSpacing:'0.04em' }}>{panel.noteSender}</div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:'rgba(235,235,235,0.55)', lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: panel.noteText.replace(/<strong>/g, '<strong style="color:rgba(235,235,235,0.75);font-weight:500">') }} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── INTEGRATIONS SECTION ─── */
function IntegrationsSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(16px)', transition: `opacity .5s ${d}ms ease, transform .5s ${d}ms ease` });
  return (
    <section id="integrations" ref={ref} style={{ padding: '96px 0' }}>
      <div className="sec-inner" style={{ textAlign: 'center' }}>
        <div className="s-tag" style={{ ...T(0), display: 'inline-block' }}>Integrations</div>
        <h2 className="s-h2" style={{ maxWidth: 500, margin: '0 auto 12px', ...T(80) }}>Plugs into your <em>existing workflow.</em></h2>
        <p className="s-p" style={{ margin: '0 auto', textAlign: 'center', ...T(160) }}>Gmail, Google Calendar, Slack, and your existing CRM. Reidar absorbs context from every surface your team already uses — without changing how you work.</p>
        <div style={{ ...T(260), display: 'flex', justifyContent: 'center', marginTop: 36 }}><IntegrationsOrbit /></div>
        <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(235,235,235,.15)', fontFamily: "'Space Mono',monospace", letterSpacing: '.04em', ...T(320) }}>More integrations on the roadmap.</p>
      </div>
    </section>
  );
}

/* ─── FAQ SECTION ─── */
const FAQS = [
  {
    q: "How is Reidar different from Harmonic or Affinity?",
    a: "Harmonic is a database — it surfaces companies when you search. Affinity is a CRM — it logs relationships when you update it. Reidar is neither. It watches your workflow continuously, deploys research automatically from trigger events, and surfaces intelligence that reflects how your specific firm reasons. You don't go to Reidar. Reidar comes to you.",
  },
  {
    q: "What does 'ambient' mean in practice?",
    a: "It means Reidar works in the surfaces you already use — Slack, email, calendar — rather than requiring you to open a new dashboard. A pitch email triggers a triage signal in Slack before you've opened it. A calendar invite triggers a pre-meeting brief 30 minutes before the call. A Granola transcript triggers signal extraction automatically. No manual logging required.",
  },
  {
    q: "What's the individual intelligence layer?",
    a: "Every person at a fund reasons differently. Reidar maintains a separate model for each team member — your personal thesis, your conviction patterns, your sector focus. A brief generated for you reflects your lens on a deal, not just the firm's collective view. The more you use Reidar, the more precisely it understands how you specifically think.",
  },
  {
    q: "How does Reidar get smarter over time?",
    a: "Every pass reason, IC objection, score override, and conviction shift is processed into a structured reasoning signal and embedded. Reidar retrieves those signals before generating any output — brief, memo, or IC prep. After 12 months, your firm has a structured record of how it reasons that compounds in a way no generic tool can replicate.",
  },
  {
    q: "What does setup look like?",
    a: "You connect Gmail, Slack, and calendar. You describe your investment mandate in plain English — stage, sector, geography, check size, what you explicitly exclude. Reidar starts working immediately: sourcing companies, triaging inbound, and building your reasoning layer from the first interaction. Most firms are fully configured in under an hour.",
  },
  {
    q: "Is this built for large funds?",
    a: "No. Reidar is built for emerging fund managers and solo GPs — the tier that existing tools completely ignore. No analyst headcount, real sourcing pain, can't afford a $100K PitchBook contract. Large funds have the resources to build their own internal agent stacks. Reidar gives emerging funds the same capability on day one.",
  },
];

function FaqSection() {
  const [entered, ref] = useSectionEntry();
  return (
    <section id="faq" ref={ref} style={{ padding: '96px 0' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 48px' }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 36, textAlign: 'center', opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(14px)', transition: 'opacity .5s ease, transform .5s ease' }}>FAQ</div>
        <div style={{ opacity: entered ? 1 : 0, transition: 'opacity .5s .1s ease' }}>
          {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA SECTION ─── */
function CtaSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(22px)', transition: `opacity .6s ${d}ms ease, transform .6s ${d}ms ease` });
  return (
    <section id="cta" ref={ref} style={{ padding: '160px 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center', padding: '0 24px' }}>
        {/* Testimonial quote */}
        <div style={{ borderLeft:'2px solid #6B47F5', paddingLeft:20, marginBottom:56, textAlign:'left', ...T(0) }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, color:'rgba(235,235,235,.6)', lineHeight:1.7, fontStyle:'italic', margin:0 }}>
            "I opened Slack on a Tuesday morning and Reidar had already triaged 6 inbound pitches, flagged a portfolio signal, and drafted a pre-meeting brief for my 10am. I hadn't touched my laptop yet."
          </p>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,.25)', marginTop:10, margin:'10px 0 0' }}>
            — Early access GP, $85M fund
          </p>
        </div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(30px,3.5vw,48px)', fontWeight:600, color:'#EBEBEB', lineHeight:1.1, letterSpacing:'-.02em', marginBottom:20, ...T(80) }}>
          Your firm's intelligence layer.<br />Compounding from day one.
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, color:'rgba(235,235,235,.68)', lineHeight:1.7, marginBottom:40, ...T(80) }}>
          Set up in under an hour. No analyst required. Gets smarter with every decision your firm makes.
        </p>
        <button className="btn-lg" style={{ ...T(160) }} onClick={() => window.location.href = SIGN_UP_URL}>Request early access →</button>
        <p style={{ marginTop: 20, fontFamily:"'DM Mono',monospace", fontSize:11, color:'rgba(235,235,235,.25)', letterSpacing:'.04em', ...T(220) }}>
          Currently accepting a small number of emerging fund managers for early access.
        </p>
      </div>
    </section>
  );
}

/* ─── CONSTANTS ─── */
const TICKER_ITEMS = [
  "JUDGMENT THAT COMPOUNDS","PASSIVE CONTEXT CAPTURE","ZERO MANUAL LOGGING","FIRM-SPECIFIC INTELLIGENCE",
  "PRE-MEETING BRIEFS","PASS REASON MEMORY","SOURCING WITH YOUR LENS","WORKFLOW INTEGRATION",
  "CONTEXT THAT TRAVELS","NEVER EVALUATE COLD","BUILT AROUND HOW YOU WORK","THE EDGE IS YOURS ALONE",
  "DECISION MEMORY","PATTERN RECOGNITION","CAPTURES YOUR ALPHA","IRREPLICABLE OVER TIME",
];

const HERO_PHRASES = [
  "Never evaluate a company cold again.",
  "Your pass reasons remembered. Forever.",
  "Every inbound scored before you open it.",
  "The scout that never sleeps.",
  "Your edge, compounding from day one.",
];

/* ─── CAPABILITIES SECTION ─── */
const CAPABILITY_CARDS = [
  {
    num: '01', title: 'Sourcing Signal',
    body: '60-second triage on every inbound — before you open the email. Pattern-matches against mandate, Pool 2 history, and portfolio conflicts. No web research. Pure signal.',
    trigger: 'email_received · company_sourced', agentCount: '1 agent', calibration: 'calibrated',
    sections: [
      { label: 'WHAT IT CHECKS', type: 'list', items: [
        'Stage match against fund focus_stages',
        'Sector exclusions — touches excluded_sectors?',
        'Geography — HQ in focus_geographies?',
        'Business model exclusions',
        'Portfolio conflicts from firm pipeline',
        'Pool 2 prior encounter check — has this firm seen this before?',
      ]},
      { label: 'SIGNAL OUTPUT', type: 'text', text: 'GO: passes hard filters, run vc-diligence-brief. WATCH: specific condition would change signal either way — not a hedge. PASS: fails hard filter or clearly outside mandate. Second encounter triggers delta analysis. "Insufficient information to triage" is a valid output.' },
    ],
    keyOutput: 'Signal card in Slack — before you open the email',
  },
  {
    num: '02', title: 'Market Research',
    body: 'Three parallel agents. Market sizing, timing signals, and investment landscape. Every claim sourced, dated, and confidence-rated. Conflicting figures reported as a range — never averaged.',
    trigger: 'diligence pipeline · direct', agentCount: '3 agents', calibration: 'baseline',
    sections: [
      { label: 'THREE RESEARCH AGENTS', type: 'list', items: [
        'M1: Market sizing — TAM/SAM/SOM, growth rate, unit economics benchmarks',
        'M2: Timing signals — regulatory, infrastructure, and behavioral tailwinds',
        'M3: Investment landscape — VC activity, M&A, tier 1 fund thesis signals',
      ]},
      { label: 'SOURCE QUALITY', type: 'text', text: 'Tier 1 (Gartner, IDC, McKinsey, SEC filings) / Tier 2 (TechCrunch, WSJ, Bloomberg) / Tier 3 (blogs, vendor reports). If estimates vary by more than 3× across sources, the full range is reported with source credibility explained. Tier 3 data is never presented as Tier 1.' },
    ],
    keyOutput: 'market-research.md with confidence dashboard and data gaps',
  },
  {
    num: '03', title: 'Competitive Intelligence',
    body: 'Six agents across three waves. Competitor profiles, pricing, customer sentiment mining, GTM analysis, and strategic signals — from an investor\'s perspective, not a founder\'s.',
    trigger: 'diligence pipeline · direct', agentCount: '6 agents', calibration: 'baseline',
    sections: [
      { label: 'SIX AGENTS · THREE WAVES', type: 'list', items: [
        'Wave 1 — C1: competitor deep-dives + C2: pricing intelligence',
        'Wave 2 — C3: review mining (G2, Capterra, Reddit) + C4: forum/community mining',
        'Wave 3 — C5: GTM analysis + C6: strategic signals (hiring patterns, funding, M&A)',
      ]},
      { label: 'INVESTMENT LENS', type: 'list', items: [
        'Moat type — network effect / data / switching cost / brand / none',
        'Moat durability — durable / moderate / temporary',
        'Build vs. buy risk — would an incumbent build this if the market is proven?',
        'Window assessment — open / closing / closed',
      ]},
    ],
    keyOutput: 'competitive-intelligence.md + individual battle cards per competitor',
  },
  {
    num: '04', title: 'Founder Assessment',
    body: 'Three research agents on career history, public presence, and team composition. Cross-references your personal conviction patterns from Pool 2. Acqui-hire is not an exit.',
    trigger: 'diligence pipeline · direct', agentCount: '3 agents', calibration: 'calibrated',
    sections: [
      { label: 'THREE RESEARCH AGENTS', type: 'list', items: [
        'F1: Career history, prior outcomes (acqui-hire ≠ exit), domain expertise',
        'F2: Public presence, press interviews, reference network',
        'F3: Team composition, co-working history, advisory board quality',
      ]},
      { label: 'PERSONAL PATTERN MATCHING', type: 'text', text: 'Cross-references conviction_patterns from Pool 2 — surfaces whether this founder profile matches your historical backing pattern. "You have backed 6 founders with this profile. 4 had strong outcomes." Patterns include: technical_domain_expert, prior_exit, first_time_founder, repeat_founder.' },
    ],
    keyOutput: 'founder-assessment.md with pattern match rating and hard questions for first call',
  },
  {
    num: '05', title: 'Positioning Assessment',
    body: 'Dunford 5+1 framework adapted for investment evaluation. Not whether their messaging is compelling — whether the underlying position is real and can be held over time.',
    trigger: 'diligence pipeline · direct', agentCount: '1 agent', calibration: 'baseline',
    sections: [
      { label: 'DUNFORD 5+1 FRAMEWORK', type: 'list', items: [
        'Competitive alternatives — what customers use if this company didn\'t exist',
        'Unique attributes with durability rating: Durable / Temporary / Unverified',
        'Value translation — what each unique attribute enables for the customer',
        'Best-fit customer — specific behavioral definition, not demographic',
        'Market category strategy: head-to-head / subcategory / category creation',
      ]},
      { label: 'THREE STRESS TESTS', type: 'list', items: [
        'Onliness Test — Convincing / Stretch / Cannot be stated',
        'Mental Ladder Test — is the rung available, or does a competitor own it?',
        'Incumbent Response Test — what survives a well-funded attack in 18 months?',
      ]},
    ],
    keyOutput: 'positioning-assessment.md with moat type, moat durability, and positioning strength rating',
  },
  {
    num: '06', title: 'Data Room Analysis',
    body: 'Four parallel agents. Every claim extracted, cross-referenced, and verified. Discrepancies and contradictions surface prominently — never buried. Missing documents are findings.',
    trigger: 'data_room event', agentCount: '4 agents', calibration: 'calibrated',
    sections: [
      { label: 'FOUR ANALYSIS AGENTS', type: 'list', items: [
        'DR1: Financial model — ARR, growth, unit economics, projection assumptions',
        'DR2: Claims register — every factual claim extracted from every document',
        'DR3: Consistency checker — cross-references all claims against each other and all prior research',
        'DR4: Cap table and legal — ownership, option pool, liquidation preferences, IP flags',
      ]},
      { label: 'VERIFICATION SYSTEM', type: 'text', text: 'Every claim receives one of five statuses: VERIFIED · CONSISTENT · UNVERIFIED · DISCREPANCY · CONTRADICTION. Discrepancies and contradictions surface at the top of the output — never in a footnote. Inconsistencies are never rationalized.' },
    ],
    keyOutput: 'dataroom-analysis.md with claims register, discrepancy report, and follow-up questions',
  },
  {
    num: '07', title: 'Diligence Brief',
    body: 'The synthesis layer. Orchestrates all prior skills, loads Pool 2 firm and member context, and produces a structured brief with three-tier fit scoring and a clear conviction signal.',
    trigger: 'any pipeline company', agentCount: 'orchestrator', calibration: 'calibrated',
    sections: [
      { label: 'WHAT IT ORCHESTRATES', type: 'list', items: [
        'Dispatches all prior skills if not already completed',
        'Loads firm-level Pool 2: pass patterns, comparable deals, partner objections',
        'Loads member-level Pool 2: personal conviction patterns, sector focus',
        'Mandatory research gate before synthesis — pauses to confirm findings align with GP\'s read',
      ]},
      { label: 'THREE-TIER FIT SCORING', type: 'list', items: [
        'Fund fit — hard filters: stage / check size / geography / exclusions',
        'Member fit — personal pattern match against conviction history',
        'Overall signal — 1–5 conviction score with specific next action',
      ]},
    ],
    keyOutput: 'Full diligence brief with fit score, comparable passes from firm history, and 3 suggested questions for first call',
  },
  {
    num: '08', title: 'IC Preparation',
    body: 'Runs when a deal advances to IC. Maps likely objections to the partners most likely to raise them, based on firm reasoning history from Pool 2. Real answers — not rehearsed deflection.',
    trigger: 'pipeline → ic_review', agentCount: '1 agent', calibration: 'calibrated',
    sections: [
      { label: 'POOL 2 OBJECTION MAPPING', type: 'text', text: 'Loads prior IC discussion signals from firm history. Maps likely objections to the specific partners most likely to raise them — based on their historical patterns from Pool 2. Prepares honest responses with evidence from all prior research. If a partner\'s objection is valid, it\'s acknowledged — not deflected.' },
      { label: 'DECISION FRAMEWORK', type: 'list', items: [
        'What we know — high confidence findings with source',
        'What we believe — medium confidence assessments',
        'What we don\'t know — explicit unknowns after all research',
        'What would make us yes / what would make us pass',
      ]},
    ],
    keyOutput: 'ic-prep.md with objection responses, bull cases in Dunford format, and open items before close',
  },
  {
    num: '09', title: 'Meeting Recap',
    body: 'Processes every Granola, Otter, or Fathom transcript automatically. Extracts conviction delta, founder signals, open questions, and suggested follow-up. The transcript is raw material — the output is structured reasoning for Pool 2.',
    trigger: 'transcript_ingested', agentCount: '1 agent', calibration: 'calibrated',
    sections: [
      { label: 'WHAT IT EXTRACTS', type: 'list', items: [
        'Conviction delta — increased / decreased / unchanged / mixed',
        'Founder signals — how they handled hard questions, what they volunteered',
        'Product and traction signals mentioned in the call',
        'Open questions blocking next step',
        'Suggested follow-up action with timeline',
      ]},
      { label: 'POOL 2 OUTPUT', type: 'text', text: 'Every meeting produces structured reasoning signals written to Pool 2 automatically. Future briefs reference what was said in this call — without you having to remember or re-enter it. The transcript disappears. The intelligence stays.' },
    ],
    keyOutput: 'meetings/[company]-[date].md + reasoning signals written to Pool 2 automatically',
  },
  {
    num: '10', title: 'Portfolio Monitor',
    body: 'Watches every portfolio and pipeline company for funding rounds, leadership changes, press coverage, and hiring signals. Surfaces what matters. Suppresses what doesn\'t. Triggers second encounter alerts the moment a passed company resolves your original concern.',
    trigger: 'scheduled · signal_detected', agentCount: '2 agents', calibration: 'calibrated',
    sections: [
      { label: 'FOUR COMPANY TIERS', type: 'list', items: [
        'Tier 1 Portfolio — every signal, immediate notification',
        'Tier 2 Active pipeline — signals affecting the investment decision',
        'Tier 3 Watching — major signals only: funding, leadership, product launch',
        'Tier 4 Passed — monitors for the exact condition that would reverse the pass',
      ]},
      { label: 'SECOND ENCOUNTER DETECTION', type: 'text', text: 'When a Tier 4 company hits the condition you originally passed on — "no enterprise GTM" → hires VP Sales from Salesforce — Reidar surfaces it immediately with the delta: what you said then, what changed now. The pass history is the context. The signal is the trigger.' },
    ],
    keyOutput: 'Immediate Slack notification + second encounter brief triggered automatically',
  },
  {
    num: '11', title: 'Weekly Brief',
    body: 'Every Monday morning — a mandate-specific brief covering what moved in your thesis areas, which sectors are getting crowded, 2-3 standout companies from the week, and one conviction call. Not a news digest. An analyst memo written for your specific fund.',
    trigger: 'scheduled · monday 8am', agentCount: '4 agents', calibration: 'calibrated',
    sections: [
      { label: 'FIVE SECTIONS EVERY MONDAY', type: 'list', items: [
        'The week in your thesis areas — synthesized view, not a news list',
        'Sector crowding signals — which windows are opening or closing',
        '2-3 standout companies — mandate-filtered, sourcing signal run before inclusion',
        'Your pipeline this week — Pool 2 context on active deals and second encounters',
        'One conviction call — not hedged, one position, one reason',
      ]},
      { label: 'MANDATE-FILTERED', type: 'text', text: 'Every section filtered through your thesis. Generic market news that doesn\'t connect to your mandate doesn\'t appear. A slow week is reported as a slow week — no manufactured significance. The brief is for this fund, not any fund.' },
    ],
    keyOutput: 'Slack summary + full brief in dashboard · Every Monday 8am',
  },
];

function CapabilitiesSection() {
  const [expandedCard, setExpandedCard] = useState(null);
  const [entered, ref] = useSectionEntry();

  return (
    <section ref={ref} style={{ padding: '120px 0', borderTop: '1px solid rgba(255,255,255,.04)' }}>
      <div className="sec-inner">
        {/* Header */}
        <div style={{ maxWidth: 640, marginBottom: 64 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:'.12em', color:'#A992FA', textTransform:'uppercase', marginBottom:16, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition:'opacity .55s ease, transform .55s ease' }}>
            Sub-agents
          </div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,3vw,44px)', fontWeight:600, color:'#EBEBEB', lineHeight:1.1, letterSpacing:'-.02em', marginBottom:20, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition:'opacity .55s 80ms ease, transform .55s 80ms ease' }}>
            Eleven sub-agents. One analyst.<br />Across your entire workflow.
          </h2>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, color:'rgba(235,235,235,.68)', lineHeight:1.75, margin:0, opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition:'opacity .55s 160ms ease, transform .55s 160ms ease' }}>
            Reidar isn't a tool you go to. When a trigger fires — an inbound lands, a transcript arrives, a calendar invite appears — it deploys the right sub-agent automatically. Every sub-agent knows your mandate, learns from every decision, and gets smarter without being configured.
          </p>
        </div>

        {/* Cards grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {CAPABILITY_CARDS.map((card, idx) => {
            const isExp = expandedCard === idx;
            return (
              <div
                key={idx}
                onClick={() => setExpandedCard(prev => prev === idx ? null : idx)}
                style={{
                  background: '#0C0C10',
                  border: `1px solid ${isExp ? 'rgba(107,71,245,0.25)' : 'rgba(255,255,255,.06)'}`,
                  borderRadius: 10, padding: 20, position: 'relative', cursor: 'pointer',
                  opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)',
                  transition: `border-color 0.3s ease, opacity .55s ${100 + idx * 60}ms ease, transform .55s ${100 + idx * 60}ms ease`,
                }}
              >
                {/* Chevron */}
                <svg viewBox="0 0 12 12" width="12" height="12" fill="none" style={{ position:'absolute', top:16, right:16, color: isExp ? '#A992FA' : 'rgba(235,235,235,0.2)', transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.3s ease, color 0.3s ease' }}>
                  <polyline points="2,4 6,8 10,4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>

                {/* Card header */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12, paddingRight:24 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(107,71,245,.5)', letterSpacing:'.08em', flexShrink:0, marginTop:2 }}>{card.num}</span>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:600, color: isExp ? '#EBEBEB' : 'rgba(235,235,235,.75)', transition:'color 0.2s ease' }}>{card.title}</div>
                </div>

                {/* Body */}
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(235,235,235,.62)', lineHeight:1.65, margin:'0 0 14px', paddingLeft:30 }}>{card.body}</p>

                {/* Bottom row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:30 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'.06em', color:'rgba(107,71,245,.55)', background:'rgba(107,71,245,.08)', border:'1px solid rgba(107,71,245,.15)', borderRadius:4, padding:'3px 8px' }}>{card.trigger}</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:"'DM Mono',monospace", fontSize:9, color: card.calibration === 'calibrated' ? 'rgba(16,185,129,0.6)' : 'rgba(235,235,235,0.2)' }}>
                    <span style={{ width:4, height:4, borderRadius:'50%', background: card.calibration === 'calibrated' ? '#10b981' : 'rgba(255,255,255,0.15)', flexShrink:0, display:'inline-block' }} />
                    {card.calibration === 'calibrated' ? 'firm-calibrated' : 'generic baseline'}
                  </span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:'rgba(235,235,235,.2)' }}>{card.agentCount}</span>
                </div>

                {/* Expanded panel */}
                <div style={{ maxHeight: isExp ? '600px' : '0px', opacity: isExp ? 1 : 0, overflow:'hidden', transition:'max-height 0.3s ease, opacity 0.3s ease' }}>
                  <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:16, marginTop:16 }}>
                    {card.sections.map((sec, si) => (
                      <div key={si} style={{ marginBottom: si < card.sections.length - 1 ? 16 : 0 }}>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(235,235,235,.25)', marginBottom:8 }}>{sec.label}</div>
                        {sec.type === 'list' ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {sec.items.map((item, ii) => (
                              <div key={ii} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                                <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(107,71,245,.6)', flexShrink:0, marginTop:5 }} />
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'rgba(235,235,235,.62)', lineHeight:1.55 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:'rgba(235,235,235,.5)', lineHeight:1.65, margin:0 }}>{sec.text}</p>
                        )}
                      </div>
                    ))}
                    {/* Key output */}
                    <div style={{ marginTop:16, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.04)', display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(235,235,235,.2)', flexShrink:0, marginTop:1 }}>KEY OUTPUT</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'#A992FA', lineHeight:1.5 }}>{card.keyOutput}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compounding progression strip */}
        <div style={{ margin:'48px 0 0', padding:28, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(107,71,245,0.5)', marginBottom:20, textAlign:'center' }}>
            THE SAME AGENT. THREE DIFFERENT MOMENTS.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto 1fr', gap:16, alignItems:'start' }}>
            {/* Column 1 — Day one */}
            <div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, padding:'3px 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:3, color:'rgba(235,235,235,0.4)' }}>Day one</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color:'rgba(235,235,235,0.4)' }}>Generic baseline</span>
              </div>
              {['Founder assessment: generic signals','IC prep: standard objection categories','Pass patterns: no history yet'].map((row) => (
                <div key={row} style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.25)', padding:'7px 10px', background:'rgba(255,255,255,0.02)', borderRadius:5, marginBottom:7 }}>{row}</div>
              ))}
            </div>
            {/* Arrow 1→2 */}
            <div style={{ alignSelf:'center', fontFamily:"'DM Mono',monospace", fontSize:16, color:'rgba(107,71,245,0.3)', justifySelf:'center' }}>→</div>
            {/* Column 2 — Month three */}
            <div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, padding:'3px 8px', background:'rgba(217,119,6,0.1)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:3, color:'#D97706' }}>Month 3</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color:'rgba(235,235,235,0.55)' }}>Calibrating</span>
              </div>
              {['Founder assessment: learns your pattern','IC prep: tracks 2 partner tendencies','Pass patterns: 47 signals captured'].map((row) => (
                <div key={row} style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.45)', padding:'7px 10px', background:'rgba(255,255,255,0.02)', borderRadius:5, marginBottom:7 }}>{row}</div>
              ))}
            </div>
            {/* Arrow 2→3 */}
            <div style={{ alignSelf:'center', fontFamily:"'DM Mono',monospace", fontSize:16, color:'rgba(107,71,245,0.3)', justifySelf:'center' }}>→</div>
            {/* Column 3 — Month twelve */}
            <div>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, padding:'3px 8px', background:'rgba(107,71,245,0.1)', border:'1px solid rgba(107,71,245,0.2)', borderRadius:3, color:'#A992FA' }}>Month 12</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:500, color:'#EBEBEB' }}>Firm-calibrated</span>
              </div>
              {['Founder assessment: knows your top 3 conviction patterns by outcome rate','IC prep: Maria always challenges defensibility · James flags market size','Pass patterns: 312 signals · surfaces second encounters automatically'].map((row) => (
                <div key={row} style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.65)', padding:'7px 10px', background:'rgba(255,255,255,0.02)', borderLeft:'2px solid #6B47F5', borderRadius:5, marginBottom:7 }}>{row}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Callout line */}
        <div style={{ textAlign:'center', padding:'32px 0 0' }}>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:'rgba(235,235,235,.52)', lineHeight:1.7, margin:0 }}>
            Eleven sub-agents from day one.{' '}
            <span
              style={{ color:'#A992FA', textDecoration:'underline', textDecorationColor:'rgba(169,146,250,0.35)', cursor:'pointer' }}
              onClick={() => window.location.href = SIGN_UP_URL}
            >Need one we haven't built? Tell us what the workflow demands.</span>
          </p>
          <p style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'rgba(107,71,245,.45)', marginTop:8 }}>
            The agents are the delivery mechanism. Pool 2 is the moat. It compounds with every decision you make.
          </p>
        </div>

        {/* Surfaces row */}
        <div style={{ marginTop:40 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'rgba(235,235,235,.2)', textAlign:'center', marginBottom:16 }}>
            Your team lives where you already work
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
            {[
              { label:'Slack',            color:'#E01E5A', rgb:'224,30,90' },
              { label:'Gmail',            color:'#EA4335', rgb:'234,67,53' },
              { label:'Google Calendar',  color:'#4285F4', rgb:'66,133,244' },
              { label:'Browser Extension',color:'#A992FA', rgb:'169,146,250' },
            ].map((s) => (
              <span key={s.label} style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:s.color, background:`rgba(${s.rgb},.08)`, border:`1px solid rgba(${s.rgb},.2)`, borderRadius:20, padding:'5px 14px', letterSpacing:'.06em' }}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HERO TEAM ─── */
const HERO_TEAM = [
  { num:'01', name:'Sourcing Signal',    status:'active'  },
  { num:'02', name:'Market Research',    status:'active'  },
  { num:'03', name:'Competitive Intel',  status:'standby' },
  { num:'04', name:'Founder Assessment', status:'active'  },
  { num:'05', name:'Positioning',        status:'standby' },
  { num:'06', name:'Data Room',          status:'standby' },
  { num:'07', name:'Diligence Brief',    status:'running' },
  { num:'08', name:'IC Preparation',     status:'standby' },
  { num:'09', name:'Meeting Recap',      status:'running' },
  { num:'10', name:'Portfolio Monitor',  status:'standby' },
  { num:'11', name:'Weekly Brief',       status:'standby' },
];

/* ─── HERO FEED ─── */
const FEED_ENTRIES = [
  { time: "08:47:23", event: "Inbound — Synthos AI",          status: "triaged",    color: "rgba(235,235,235,0.55)", agent: "01" },
  { time: "08:47:24", event: "Thesis match: 87/100",          status: "scored",     color: "#10b981",                agent: "01" },
  { time: "08:47:31", event: "11 sub-agents dispatched",      status: "running",    color: "#A992FA",                agent: null },
  { time: "08:51:14", event: "Comparable passes: 3 found",    status: "flagged",    color: "#D97706",                agent: "07" },
  { time: "08:52:03", event: "Market research complete",      status: "done",       color: "#10b981",                agent: "02" },
  { time: "08:52:44", event: "Founder backgrounds complete",  status: "done",       color: "#10b981",                agent: "04" },
  { time: "08:53:01", event: "Brief → #deal-flow",            status: "delivered",  color: "#10b981",                agent: "07" },
  { time: "09:12:05", event: "Calendar: Synthos call 30min",  status: "detected",   color: "#A992FA",                agent: "10" },
  { time: "09:12:06", event: "Pre-meeting brief generating",  status: "running",    color: "#A992FA",                agent: "07" },
  { time: "09:14:33", event: "Brief → Slack",                 status: "delivered",  color: "#10b981",                agent: "07" },
  { time: "11:30:00", event: "Transcript received — Granola", status: "processing", color: "#A992FA",                agent: "09" },
  { time: "11:30:04", event: "Signals extracted: 7",          status: "done",       color: "#10b981",                agent: "09" },
];

const STATUS_STYLES = {
  triaged:    { background: "rgba(235,235,235,0.08)", color: "rgba(235,235,235,0.3)" },
  scored:     { background: "rgba(16,185,129,0.1)",   color: "#10b981" },
  running:    { background: "rgba(107,71,245,0.12)",  color: "#A992FA" },
  flagged:    { background: "rgba(217,119,6,0.1)",    color: "#D97706" },
  done:       { background: "rgba(16,185,129,0.1)",   color: "#10b981" },
  delivered:  { background: "rgba(16,185,129,0.08)",  color: "#10b981" },
  detected:   { background: "rgba(107,71,245,0.12)",  color: "#A992FA" },
  processing: { background: "rgba(107,71,245,0.12)",  color: "#A992FA" },
};

function HeroFeed() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    let timer;
    let count = 0;
    const tick = () => {
      count += 1;
      setVisibleCount(count);
      if (count < FEED_ENTRIES.length) {
        timer = setTimeout(tick, 280);
      } else {
        timer = setTimeout(() => {
          setVisibleCount(0);
          setCycle(c => c + 1);
        }, 3000);
      }
    };
    timer = setTimeout(tick, 280);
    return () => clearTimeout(timer);
  }, [cycle]);
  return (
    <>
      {FEED_ENTRIES.map((entry, i) => {
        const s = STATUS_STYLES[entry.status] || STATUS_STYLES.triaged;
        return (
          <div key={i} style={{
            padding: '7px 18px',
            display: 'grid', gridTemplateColumns: '70px 20px 1fr auto',
            alignItems: 'center', gap: 10,
            borderBottom: i < FEED_ENTRIES.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
            opacity: i < visibleCount ? 1 : 0,
            transform: i < visibleCount ? 'none' : 'translateY(4px)',
            transition: 'opacity 200ms ease, transform 200ms ease',
          }}>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.2)', letterSpacing:'0.04em' }}>{entry.time}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color: entry.agent ? 'rgba(107,71,245,0.5)' : 'transparent', textAlign:'center' }}>{entry.agent ?? '·'}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:entry.color }}>{entry.event}</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:'0.06em', padding:'2px 6px', borderRadius:3, whiteSpace:'nowrap', background:s.background, color:s.color }}>{entry.status}</span>
          </div>
        );
      })}
    </>
  );
}

/* ─── MAIN ─── */
export default function LandingPage() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    document.title = "Reidar — The AI Agent Stack for Venture Capital";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', "Reidar sources, researches, and surfaces intelligence across your entire deal workflow — without being asked. The AI agent stack built around how your firm actually thinks.");
  }, []);

  const NavMark = () => (
    <div className="nav-mark-wrap">
      <div className="nav-mark-ring" />
      <div className="nav-mark-ring delay" />
      <div className="nav-mark">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
          <circle cx="7" cy="7" r="2" fill="white"/>
        </svg>
      </div>
    </div>
  );

  return (
    <>
      <style>{FONTS + STYLES}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <NavMark />
          <span className="nav-name">Reidar</span>
        </a>
        <div className="nav-links">
          <a href="/how-it-works" className="nav-a">How it works</a>
          <a href="/pricing" className="nav-a">Pricing</a>
        </div>
        <div className="nav-right">
          {isSignedIn ? (
            <><button className="btn-pri" onClick={() => window.location.href = APP_URL}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
          ) : (
            <><button className="btn-ghost" onClick={() => window.location.href = SIGN_IN_URL}>Sign in</button><button className="btn-pri" onClick={() => window.location.href = SIGN_UP_URL}>Join the waitlist</button></>
          )}
        </div>
      </nav>

      {/* ── 01 HERO ── */}
      <section id="hero" className="hero-wrap">
        <RadarBg />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 65% at 50% 48%,transparent 28%,rgba(7,7,10,.55) 58%,#07070A 88%)', pointerEvents: 'none', zIndex: 1 }} />
        {/* Split layout */}
        <div className="hero-split" style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', justifyContent:'space-between', gap:60, maxWidth:1200, margin:'0 auto', padding:'140px 48px 120px', width:'100%' }}>

          {/* LEFT */}
          <div style={{ flex:1, maxWidth:540 }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, textTransform:'uppercase', letterSpacing:'0.12em', color:'#A992FA', marginBottom:24 }}>
              Built for emerging fund managers.
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:600, lineHeight:1.08, letterSpacing:'-0.03em', marginBottom:24 }}>
              <span style={{ fontSize:'clamp(38px,4.5vw,56px)', color:'#EBEBEB', display:'block' }}>The AI analyst for venture capital.</span>
              <span style={{ fontSize:'clamp(24px,2.8vw,36px)', color:'#A992FA', display:'block', marginTop:8 }}>Your firm's intelligence layer,<br />compounding from day one.</span>
            </h1>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, color:'rgba(235,235,235,0.68)', lineHeight:1.75, marginBottom:36, maxWidth:460 }}>
              Sourcing, researching, and surfacing intelligence across your entire workflow — without being asked. Built around how your firm actually thinks.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button style={{ background:'#6B47F5', color:'white', padding:'13px 26px', borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:500, border:'none', cursor:'pointer', boxShadow:'0 0 24px rgba(107,71,245,0.4)', transition:'background .15s' }} onClick={() => window.location.href = SIGN_UP_URL}>
                Get early access →
              </button>
              <button style={{ background:'transparent', color:'rgba(235,235,235,0.45)', padding:'13px 26px', borderRadius:8, fontFamily:"'DM Sans',sans-serif", fontSize:15, border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', transition:'all .15s' }} onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior:'smooth' })}>
                See it in action ↓
              </button>
            </div>
            <p style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.22)', marginTop:28 }}>
              Used by emerging fund managers · No credit card required · Set up in under an hour
            </p>
          </div>

          {/* RIGHT */}
          <div className="hero-split-right" style={{ width:460, flexShrink:0, position:'relative' }}>
            {/* Glow */}
            <div style={{ position:'absolute', width:300, height:300, background:'rgba(107,71,245,0.12)', borderRadius:'50%', filter:'blur(60px)', top:-60, right:-60, pointerEvents:'none', zIndex:0 }} />
            <div style={{ background:'rgba(7,7,10,0.8)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden', position:'relative', zIndex:1, backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>
              {/* Header */}
              <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)' }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:'#6B47F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg viewBox="0 0 14 14" width="9" height="9" fill="none"><path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5"/></svg>
                  </div>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:'rgba(235,235,235,0.5)', letterSpacing:'0.06em' }}>Reidar</span>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#10b981' }}>11 sub-agents active</span>
                </div>
              </div>

              {/* Team roster */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(235,235,235,0.2)', marginBottom:9 }}>SUB-AGENTS</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                  {HERO_TEAM.map((agent) => {
                    const dotColor = agent.status === 'active' ? '#10b981' : agent.status === 'running' ? '#A992FA' : 'rgba(255,255,255,0.12)';
                    const nameColor = agent.status === 'standby' ? 'rgba(235,235,235,0.28)' : agent.status === 'running' ? 'rgba(169,146,250,0.8)' : 'rgba(235,235,235,0.6)';
                    return (
                      <div key={agent.num} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 8px', background:'rgba(255,255,255,0.02)', borderRadius:5 }}>
                        <span style={{ width:5, height:5, borderRadius:'50%', background:dotColor, flexShrink:0, display:'inline-block', animation: agent.status !== 'standby' ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:'rgba(107,71,245,0.45)', flexShrink:0 }}>{agent.num}</span>
                        <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:nameColor, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{agent.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live feed */}
              <div style={{ padding:'4px 0' }}>
                <div style={{ padding:'6px 18px 4px', fontFamily:"'DM Mono',monospace", fontSize:8, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(235,235,235,0.2)' }}>LIVE</div>
                <HeroFeed />
              </div>

              {/* Footer */}
              <div style={{ padding:'10px 18px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(107,71,245,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(235,235,235,0.2)' }}>11 sub-agents</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'rgba(107,71,245,0.5)' }}>0 manual actions required</span>
              </div>
            </div>
          </div>

        </div>
        {/* Ticker */}
        <div className="ticker" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
          <div className="ticker-inner">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <div className="tick-item" key={i}><span className="tick-dot" />{t}<span className="tick-sep">◆</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 DEMO ── */}
      <DealTimeline />

      {/* ── 04 CAPABILITIES ── */}
      <CapabilitiesSection />

      {/* ── 05 PROBLEM ── */}
      <ProblemSection />

      {/* ── 05 REASONING LAYER ── */}
      <ReasoningLayerSection />

      {/* ── 06 PROACTIVE INTELLIGENCE ── */}
      <ProactiveIntelligenceSection />

      {/* ── 07 INTEGRATIONS ── */}
      <IntegrationsSection />

      {/* ── 08 FAQ ── */}
      <FaqSection />

      {/* ── 09 CTA ── */}
      <CtaSection />

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,.04)', marginTop: 48 }}>
        <div className="footer-strip">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span className="foot-l">© 2026 Reidar. The intelligence layer for venture capital.</span>
            <a href="/how-it-works" style={{ fontSize: 11, color: 'rgba(235,235,235,.2)', textDecoration: 'none' }}>How it works</a>
            <a href="/pricing" style={{ fontSize: 11, color: 'rgba(235,235,235,.2)', textDecoration: 'none' }}>Pricing</a>
          </div>
          <div className="foot-r">POWERED BY CLAUDE · ANTHROPIC</div>
        </div>
      </div>
    </>
  );
}
