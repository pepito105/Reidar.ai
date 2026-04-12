import { useState, useEffect, useRef } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";

const APP_URL = "/app";
const SIGN_IN_URL = "/sign-in";
const SIGN_UP_URL = "/sign-up";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

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
  .s-h2 { font-family:'Playfair Display',serif;font-size:clamp(26px,3.2vw,40px);font-weight:700;line-height:1.1;color:#EBEBEB;letter-spacing:-.01em;margin-bottom:14px }
  .s-h2 em { font-style:normal;color:rgba(235,235,235,.28) }
  .s-p { font-size:15px;font-weight:300;color:rgba(235,235,235,.42);line-height:1.72;max-width:520px }

  /* HERO */
  .hero-wrap{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding-top:56px}
  .hero-content{position:relative;z-index:2;padding:0 24px;max-width:720px;text-align:center;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:100px;border:1px solid rgba(107,71,245,.4);background:rgba(107,71,245,.1);font-family:'DM Mono',monospace;font-size:10px;color:#A992FA;letter-spacing:.06em;margin-bottom:24px;animation:fadeUp .5s .05s both}
  .badge-dot{width:5px;height:5px;border-radius:50%;background:#6B47F5;animation:pulse 2s infinite}
  .hero-h1{font-family:'Playfair Display',serif;font-size:clamp(32px,4.5vw,58px);font-weight:700;line-height:1.1;color:#EBEBEB;letter-spacing:-.02em;margin-bottom:20px;animation:fadeUp .55s .13s both}
  .hero-sub{font-size:16px;font-weight:300;color:rgba(235,235,235,.45);line-height:1.72;max-width:540px;margin:0 auto 20px;animation:fadeUp .55s .2s both}
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
  .moment-h{font-size:14px;font-weight:600;color:rgba(235,235,235,.5);margin-bottom:9px;line-height:1.3}
  .moment-active .moment-h{color:#EBEBEB}
  .moment-p{font-size:11px;color:rgba(235,235,235,.28);line-height:1.65}
  .moment-active .moment-p{color:rgba(235,235,235,.45)}
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
        <p style={{ fontSize: 14, color: 'rgba(235,235,235,.45)', lineHeight: 1.75, margin: 0, fontFamily: "'Inter',sans-serif" }}>{a}</p>
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
            <div style={{ fontSize: 12, color: 'rgba(235,235,235,.42)', lineHeight: 1.6 }}>{selInt.desc}</div>
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
const THESIS_CARDS = [
  { name: "Signal platforms",          t: "Same signals, zero differentiation.",      c: "When every fund gets the same alert at the same time, the signal is noise. Knowing isn't the edge. Knowing what it means for your specific thesis is." },
  { name: "Startup databases",         t: "Broad data, shared by everyone.",          c: "Fifty million profiles, and none of them remember that you saw this company eight months ago and passed because the unit economics didn't work." },
  { name: "CRM tools",                 t: "Tracks relationships. Not judgment.",       c: "They know who you emailed. They don't know what you thought, what pattern you recognized, or what would change your mind." },
  { name: "AI intelligence platforms", t: "Reasons backward. Not forward.",           c: "They're powerful if you have decades of documents to ingest. But the most valuable intelligence isn't what you've already decided — it's what you're deciding right now. Reidar captures it as it happens." },
];

function ThesisSection() {
  const [entered, ref] = useSectionEntry();
  const T = (d) => ({ opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(20px)', transition: `opacity .55s ${d}ms ease, transform .55s ${d}ms ease` });
  return (
    <section id="problem" ref={ref} style={{ padding: '96px 0' }}>
      <div className="sec-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div className="s-tag" style={T(0)}>The problem</div>
            <h2 className="s-h2" style={T(80)}>Every intelligence tool has the same <em>structural problem.</em></h2>
            <p className="s-p" style={T(160)}>Databases, signal platforms, CRM tools, market intelligence feeds — they all reason backward. They ingest what already exists and wait for a query. The more widely adopted they become, the less edge any single investor gets from using them.<br /><br />Reidar works differently. It captures the intelligence your firm is building right now — from every meeting, every pass decision, every email thread — and surfaces it at the moment it matters. The edge it builds belongs to you alone.</p>
            <div className="thesis-pull" style={{ marginTop: 24, ...T(240) }}>
              <div className="thesis-pull-q">"Our CRM tracks who we know. Nothing tracks how we think — or what we decided, and why."</div>
              <div className="thesis-pull-src">— RECURRING FEEDBACK FROM EMERGING FUND GPS</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {THESIS_CARDS.map((c, i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, cursor: 'default', opacity: entered ? 1 : 0, transform: entered ? 'none' : 'translateY(14px)', transition: `opacity .45s ${120 + i * 140}ms ease, transform .45s ${120 + i * 140}ms ease, background .2s ease` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,71,245,.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
              >
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.25)', letterSpacing: '.07em', marginBottom: 5 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(235,235,235,.55)', lineHeight: 1.55 }}><strong style={{ color: '#EBEBEB', fontWeight: 500 }}>{c.t}</strong> {c.c}</div>
              </div>
            ))}
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
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: '#EBEBEB', letterSpacing: '-.01em', lineHeight: 1.25, marginBottom: 12 }}>{c.h3}</h3>
              <p style={{ fontSize: 13, color: 'rgba(235,235,235,.42)', lineHeight: 1.72 }}>{c.body}</p>
            </div>
          ))}
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
    q: "What is an AI investment associate?",
    a: "An AI investment associate is software that performs the research, sourcing, and analytical work typically done by a junior VC analyst — autonomously and continuously. Reidar sources companies from the open web, scores them against a firm's investment mandate, generates investment memos, monitors pipeline companies for signals, and surfaces institutional memory at the moment it's needed. Unlike a database or search tool, it works without being asked.",
  },
  {
    q: "How is Reidar different from Harmonic or PitchBook?",
    a: "Harmonic and PitchBook are databases — you query them, they return results. Reidar is an active system that works on your behalf continuously. It sources proactively, scores against your specific mandate rather than a generic filter, generates investment memos rather than data exports, and builds a private intelligence layer from your firm's own decisions and interactions. The difference is the direction: they tell you what exists. Reidar tells you what matters for how you specifically invest.",
  },
  {
    q: "How is Reidar different from Affinity?",
    a: "Affinity is a relationship intelligence CRM — it manages pipeline and tracks who you know. Reidar is a sourcing and intelligence tool — it finds companies you don't know yet and captures the reasoning behind every decision your firm makes. Affinity is the address book. Reidar is the scout and the memory. Many investors use both.",
  },
  {
    q: "Is Reidar only for small VC funds?",
    a: "No. Reidar is built for any investor who evaluates companies — solo GPs, analysts at established funds, and partners at any stage. The core value is the same regardless of fund size: capturing how an investor reasons about investments and surfacing that intelligence at the right moment. We focus on emerging fund managers first because they feel the pain most acutely — lean teams, no dedicated analyst headcount, and the highest cost of losing institutional knowledge.",
  },
  {
    q: "How does Reidar build institutional memory?",
    a: "Reidar connects to Gmail and Google Calendar and passively observes your deal workflow — inbound pitches, founder meetings, follow-up emails, pass decisions. It extracts structured reasoning signals from these interactions: partner objections, conviction triggers, pass reasons, open questions. These signals are embedded into a private vector database scoped to your firm. When you evaluate a similar company later, Reidar retrieves the relevant prior reasoning and injects it into its analysis — without you having to remember or re-enter anything.",
  },
  {
    q: "What does setup look like?",
    a: "Connect Gmail and Google Calendar, define your investment mandate in plain English, set your stage and sector focus, and optionally import a list of companies you've previously evaluated. First sourcing run starts immediately. Most investors are fully configured in under 10 minutes.",
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
    <section id="cta" ref={ref} style={{ padding: '96px 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="cta-inner" style={T(0)}>
        <h2 className="cta-h2" style={T(60)}>Your firm's edge.<br />Captured from day one.</h2>
        <p className="cta-sub" style={T(140)}>No extra work. No manual logging. No behavior change. Connect your inbox and calendar, define your mandate, and Reidar starts building the intelligence layer your firm has always needed — from the work you're already doing.</p>
        <button className="btn-lg" style={T(220)} onClick={() => window.location.href = SIGN_UP_URL}>Join the waitlist →</button>
        <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(235,235,235,.2)', fontFamily: "'DM Mono',monospace", letterSpacing: '.04em', ...T(280) }}>Free during early access. Founding firm rate locked at launch.</p>
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

/* ─── MAIN ─── */
export default function LandingPage() {
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroDisplayed, setHeroDisplayed] = useState('');
  const [heroPhase, setHeroPhase] = useState('typing');
  const { isSignedIn } = useAuth();

  useEffect(() => {
    document.title = "Reidar — The Intelligence Layer for Venture Capital";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', "Reidar captures how your firm reasons about investments — from every meeting, email, and decision — and surfaces that intelligence at the moment it matters. The AI associate built for venture capital.");
  }, []);

  // Typewriter
  useEffect(() => {
    const phrase = HERO_PHRASES[heroIdx];
    if (heroPhase === 'typing') {
      if (heroDisplayed.length < phrase.length) {
        const t = setTimeout(() => setHeroDisplayed(phrase.slice(0, heroDisplayed.length + 1)), 80);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setHeroPhase('pause'), 2200);
        return () => clearTimeout(t);
      }
    } else if (heroPhase === 'pause') {
      const t = setTimeout(() => setHeroPhase('erasing'), 200);
      return () => clearTimeout(t);
    } else if (heroPhase === 'erasing') {
      if (heroDisplayed.length > 0) {
        const t = setTimeout(() => setHeroDisplayed(d => d.slice(0, -1)), 38);
        return () => clearTimeout(t);
      } else {
        setHeroIdx(i => (i + 1) % HERO_PHRASES.length);
        setHeroPhase('typing');
      }
    }
  }, [heroDisplayed, heroPhase, heroIdx]);

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
        <div className="hero-content">
          <div className="badge"><div className="badge-dot" />The intelligence layer for VC</div>
          <h1 className="hero-h1">The Intelligence Layer<br />for Venture Capital</h1>
          <p className="hero-sub">Every investor builds a proprietary lens over years of decisions. Reidar captures it, structures it, and surfaces it at the moment it matters — automatically, from the work you're already doing.</p>
          <div className="hero-phrase">
            <span style={{ color: '#A992FA' }}>{heroDisplayed}</span><span className="typewriter-cursor" style={{ color: '#A992FA' }}>|</span>
          </div>
          <div className="hero-cta">
            <button className="btn-lg" onClick={() => window.location.href = SIGN_UP_URL}>Join the waitlist →</button>
            <button className="btn-out" onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })}>
              See how it works
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
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

      {/* ── 02 SOCIAL PROOF ── */}
      <section id="proof" style={{ borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', padding: '20px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <span style={{ fontSize: 12, color: 'rgba(235,235,235,.28)', fontStyle: 'italic' }}>Trusted by investors across North America and Europe</span>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
            {[
              "200+ companies evaluated weekly",
              "Pre-seed through Series B",
              "Gmail · Calendar · Slack",
            ].map((s, i) => (
              <span key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(235,235,235,.22)', letterSpacing: '.06em' }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 DEMO ── */}
      <section id="demo" style={{ padding: '96px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 14 }}>See it in action</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(26px,3.2vw,40px)', fontWeight: 700, lineHeight: 1.1, color: '#EBEBEB', letterSpacing: '-.01em', marginBottom: 0 }}>Your AI associate, <span style={{ color: 'rgba(235,235,235,.28)' }}>working in the background</span></h2>
          </div>
          <div style={{ height: 560, border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
            <ReidarChat />
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(235,235,235,.25)', marginTop: 20, fontStyle: 'italic' }}>
            Reidar surfaces the right context at the right moment — without being asked.
          </p>
        </div>
      </section>

      {/* ── 04 PROBLEM ── */}
      <ThesisSection />

      {/* ── 05 THREE MOMENTS ── */}
      <MomentsSection />

      {/* ── 06 HOW IT WORKS ── */}
      <HowSection />

      {/* ── 07 USE CASES ── */}
      <UseCasesSection />

      {/* ── 08 INTEGRATIONS ── */}
      <IntegrationsSection />

      {/* ── 09 FAQ ── */}
      <FaqSection />

      {/* ── 10 CTA ── */}
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
