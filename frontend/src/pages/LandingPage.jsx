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

  .sr { opacity:0; transform:translateY(22px); transition:opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1); }
  .sr.show { opacity:1 !important; transform:none !important; }
  .d1{transition-delay:.07s}.d2{transition-delay:.14s}.d3{transition-delay:.21s}.d4{transition-delay:.28s}

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes ticker  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes mockIn  { from{opacity:0;transform:translateY(8px) scale(.99)} to{opacity:1;transform:none} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
  .typewriter-cursor{display:inline;animation:blink 1s step-end infinite}
  .typing-dots{display:flex;gap:4px;align-items:center;padding:10px 13px}
  .typing-dots span{width:5px;height:5px;border-radius:50%;background:rgba(235,235,235,.4);animation:pulse 1.2s ease-in-out infinite}
  .typing-dots span:nth-child(2){animation-delay:.15s}
  .typing-dots span:nth-child(3){animation-delay:.3s}
  @keyframes progbar { from{width:0%} to{width:100%} }
  @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
  @keyframes slideRight { 0%{transform:translateX(0);opacity:1} 100%{transform:translateX(160px);opacity:0} }
  @keyframes fadeIn { 0%{opacity:0;transform:translateY(-8px)} 100%{opacity:1;transform:translateY(0)} }

  /* NAV */
  .nav { position:relative;z-index:200;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,7,10,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px); }
  .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
  .nav-links{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:4px}
  .nav-mark-wrap{position:relative;width:26px;height:26px}
  .nav-mark-ring{position:absolute;inset:0;width:26px;height:26px;border-radius:7px;border:1px solid rgba(107,71,245,.5);animation:radarPing 2s ease-out infinite}
  .nav-mark-ring.nav-mark-ring-delay{animation-delay:1s}
  .nav-mark{position:relative;z-index:1;width:26px;height:26px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(107,71,245,.5),0 0 16px rgba(107,71,245,.25)}
  .nav-name{font-size:15px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em}
  .nav-a{font-size:13px;color:rgba(235,235,235,.42);text-decoration:none;padding:5px 10px;border-radius:6px;transition:all .15s}
  .nav-a:hover{color:#EBEBEB;background:rgba(255,255,255,.05)}
  .nav-right{display:flex;align-items:center;gap:8px}
  .btn-ghost{font:13px/1 'Inter',sans-serif;color:rgba(235,235,235,.6);background:transparent;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:7px;cursor:pointer;transition:all .15s}
  .btn-ghost:hover{border-color:rgba(255,255,255,.22);color:#EBEBEB}
  .btn-pri{font:13px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;transition:all .15s;box-shadow:0 0 18px rgba(107,71,245,.3)}
  .btn-pri:hover{background:#7D5CF7;box-shadow:0 0 28px rgba(107,71,245,.5)}

  /* HERO */
  .hero-wrap{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}
  .hero-canvas{position:absolute;inset:0;pointer-events:none;z-index:0}
  .hero-fade{position:absolute;inset:0;background:radial-gradient(ellipse 68% 62% at 50% 46%,transparent 25%,#07070A 100%);pointer-events:none;z-index:1}
  .hero-content{position:relative;z-index:2;padding:112px 24px 80px;max-width:680px;margin:0 auto}
  .badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:100px;border:1px solid rgba(107,71,245,.4);background:rgba(107,71,245,.1);font-family:'DM Mono',monospace;font-size:10px;color:#A992FA;letter-spacing:.06em;margin-bottom:24px;animation:fadeUp .5s .05s both}
  .badge-dot{width:5px;height:5px;border-radius:50%;background:#6B47F5;animation:pulse 2s infinite}
  .hero-h1{font-family:'Playfair Display',serif;font-size:clamp(36px,5vw,62px);font-weight:700;line-height:1.1;color:#EBEBEB;letter-spacing:-.02em;margin-bottom:20px;animation:fadeUp .55s .13s both}
  .hero-h1 .acc{color:#A992FA}
  .hero-sub{font-size:17px;font-weight:300;color:rgba(235,235,235,.48);line-height:1.7;max-width:460px;margin:0 auto 34px;animation:fadeUp .55s .2s both}
  .hero-cta{display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:52px;animation:fadeUp .55s .27s both}
  .btn-lg{font:15px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:0 0 24px rgba(107,71,245,.4)}
  .btn-lg:hover{background:#7D5CF7;transform:translateY(-1px);box-shadow:0 0 36px rgba(107,71,245,.55)}
  .btn-out{font:14px/1 'Inter',sans-serif;color:rgba(235,235,235,.5);background:transparent;border:1px solid rgba(255,255,255,.1);padding:11px 20px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s}
  .btn-out:hover{color:#EBEBEB;border-color:rgba(255,255,255,.2)}
  .hero-stats{display:flex;gap:36px;justify-content:center;padding-top:28px;border-top:1px solid rgba(255,255,255,.06);animation:fadeUp .55s .33s both}
  .stat-n{font-size:20px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em}
  .stat-l{font-size:11px;color:rgba(235,235,235,.3);margin-top:3px}

  /* TICKER */
  .ticker{overflow:hidden;border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);padding:11px 0}
  .ticker-inner{display:flex;animation:ticker 32s linear infinite;width:max-content}
  .ticker:hover .ticker-inner{animation-play-state:paused}
  .tick-item{display:flex;align-items:center;gap:10px;padding:0 32px;white-space:nowrap;font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.2);letter-spacing:.08em}
  .tick-sep{color:rgba(107,71,245,.4);font-size:8px}
  .dyn-tick-dot{width:6px;height:6px;border-radius:50%;background:#00ff88;animation:pulse 2s ease-in-out infinite;flex-shrink:0}

  /* LAYOUT */
  .wrap{max-width:1160px;margin:0 auto;padding:0 40px}
  .sec{padding:96px 0}
  .s-tag{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.12em;color:#6B47F5;text-transform:uppercase;margin-bottom:14px}
  .s-h2{font-family:'Playfair Display',serif;font-size:34px;font-weight:700;line-height:1.15;color:#EBEBEB;letter-spacing:-.01em;margin-bottom:14px}
  .s-h2 em{font-style:normal;color:rgba(235,235,235,.28)}
  .s-p{font-size:15px;font-weight:300;color:rgba(235,235,235,.42);line-height:1.72;max-width:500px}
  .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);margin:0 40px}

  /* HOW IT WORKS */
  .steps{display:grid;grid-template-columns:repeat(6,1fr);gap:0;margin-top:44px;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden}
  .step{padding:26px 20px;background:rgba(255,255,255,.014);border-right:1px solid rgba(255,255,255,.06);transition:background .2s}
  .step:last-child{border-right:none}
  .step:hover{background:rgba(107,71,245,.06)}
  .step-n{font-family:'DM Mono',monospace;font-size:10px;color:rgba(107,71,245,.55);letter-spacing:.08em;margin-bottom:12px}
  .step-t{font-size:13px;font-weight:500;color:#EBEBEB;margin-bottom:5px}
  .step-d{font-size:11px;color:rgba(235,235,235,.36);line-height:1.55}

  /* COMPETITORS */
  .comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid rgba(255,255,255,.06);border-radius:12px;overflow:hidden;margin-top:44px}
  .comp-cell{padding:30px;background:rgba(255,255,255,.014);border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);transition:background .2s,box-shadow .2s}
  .comp-cell:hover{background:rgba(107,71,245,.06);box-shadow:inset 3px 0 0 rgba(107,71,245,.35)}
  .comp-cell:nth-child(2n){border-right:none}
  .comp-cell:nth-last-child(-n+2){border-bottom:none}
  .comp-name{font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.26);letter-spacing:.07em;margin-bottom:8px}
  .comp-text{font-size:13px;color:rgba(235,235,235,.52);line-height:1.6}
  .comp-text strong{color:#EBEBEB;font-weight:500}

  /* PRODUCT PREVIEW */
  .prod-shell{display:grid;grid-template-columns:220px 1fr;gap:0;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;margin-top:44px;min-height:520px}
  .prod-tabs{border-right:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.012);display:flex;flex-direction:column;padding:8px}
  .prod-tab{padding:12px 14px;border-radius:8px;cursor:pointer;transition:all .18s;border:1px solid transparent;margin-bottom:2px}
  .prod-tab:hover{background:rgba(255,255,255,.04)}
  .prod-tab.active{background:rgba(107,71,245,.12);border-color:rgba(107,71,245,.25)}
  .prod-tab-num{font-family:'DM Mono',monospace;font-size:9px;color:rgba(107,71,245,.45);letter-spacing:.1em;margin-bottom:4px}
  .prod-tab-name{font-size:13px;font-weight:500;color:rgba(235,235,235,.5);transition:color .15s}
  .prod-tab.active .prod-tab-name{color:#EBEBEB}
  .prod-tab-desc{font-size:11px;color:rgba(235,235,235,.28);margin-top:3px;line-height:1.45;display:none}
  .prod-tab.active .prod-tab-desc{display:block;color:rgba(235,235,235,.38)}
  .prod-progress{height:2px;background:rgba(107,71,245,.15);border-radius:1px;margin-top:8px;overflow:hidden;display:none}
  .prod-tab.active .prod-progress{display:block}
  .prod-progress-bar{height:100%;background:#6B47F5;border-radius:1px}

  .prod-view{background:#0C0C10;position:relative;overflow:hidden;display:flex;flex-direction:column}
  .prod-chrome{height:36px;background:#111116;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;padding:0 14px;gap:6px;flex-shrink:0}
  .chrome-dot{width:9px;height:9px;border-radius:50%}
  .chrome-bar{flex:1;margin:0 10px;height:22px;background:rgba(255,255,255,.04);border-radius:5px;display:flex;align-items:center;padding:0 10px}
  .chrome-url{font-family:'DM Mono',monospace;font-size:9px;color:rgba(235,235,235,.2);letter-spacing:.04em}
  .prod-content{flex:1;overflow:hidden;animation:mockIn .28s ease both}

  /* QUOTE */
  .quote{text-align:center;padding:80px 40px;max-width:760px;margin:0 auto}
  .qmark{font-size:60px;font-weight:600;color:rgba(107,71,245,.2);line-height:.5;margin-bottom:20px;font-family:'DM Mono',monospace}
  .qtext{font-family:'Playfair Display',serif;font-size:24px;font-style:italic;font-weight:400;color:rgba(235,235,235,.6);line-height:1.45;letter-spacing:0}
  .qsrc{margin-top:22px;font-family:'Space Mono',monospace;font-size:10px;color:rgba(235,235,235,.22);letter-spacing:.08em}

  /* MEET REIDAR */
  .meet-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(255,255,255,.06);border-radius:12px;overflow:hidden;margin-top:44px}
  .meet-trait{padding:28px 24px;background:#07070A;transition:background .2s}
  .meet-trait:hover{background:rgba(107,71,245,.06)}
  .meet-trait-icon{font-family:'Space Mono',monospace;font-size:10px;color:rgba(107,71,245,.55);letter-spacing:.08em;margin-bottom:12px}
  .meet-trait-t{font-size:14px;font-weight:500;color:#EBEBEB;margin-bottom:6px}
  .meet-trait-d{font-size:12px;color:rgba(235,235,235,.4);line-height:1.6}

  /* INTEGRATIONS */
  .int-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:40px}
  .int-tile{display:flex;align-items:flex-start;gap:14px;padding:20px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:10px;transition:border-color .2s,background .2s}
  .int-tile:hover{background:rgba(107,71,245,.04);border-color:rgba(107,71,245,.2)}

  /* CTA */
  .cta-wrap{margin:0 40px 96px;border:1px solid rgba(107,71,245,.18);border-radius:14px;padding:72px;text-align:center;position:relative;overflow:hidden;background:radial-gradient(ellipse 70% 100% at 50% 100%,rgba(107,71,245,.07),transparent 70%)}
  .cta-wrap::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:160px;height:1px;background:linear-gradient(90deg,transparent,rgba(107,71,245,.6),transparent)}
  .cta-h2{font-size:38px;font-weight:600;line-height:1.1;color:#EBEBEB;letter-spacing:-.025em;margin-bottom:14px}
  .cta-sub{font-size:14px;color:rgba(235,235,235,.38);margin-bottom:30px}

  /* FOOTER */
  .footer{border-top:1px solid rgba(255,255,255,.05);padding:24px 40px;display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:0 auto}
  .foot-l{font-size:12px;color:rgba(235,235,235,.2)}
  .foot-r{font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.15);letter-spacing:.06em}

  @media(max-width:900px){
    .prod-shell{grid-template-columns:1fr;min-height:auto}
    .prod-tabs{flex-direction:row;flex-wrap:wrap;border-right:none;border-bottom:1px solid rgba(255,255,255,.06);padding:8px}
    .prod-tab{flex:1;min-width:80px}
    .prod-tab-desc{display:none!important}
    .steps{grid-template-columns:repeat(3,1fr)}
    .step{border-bottom:1px solid rgba(255,255,255,.06)}
    .int-grid{grid-template-columns:repeat(2,1fr)}
  }
  @media(max-width:640px){
    .nav{padding:0 20px}.nav-links{display:none}
    .wrap{padding:0 20px}
    .steps{grid-template-columns:repeat(2,1fr)}
    .comp-grid{grid-template-columns:1fr}.comp-cell:nth-child(2n){border-right:none}
    .meet-grid{grid-template-columns:1fr}
    .int-grid{grid-template-columns:1fr}
    .cta-wrap{margin:0 20px 72px;padding:48px 24px}
    .footer{flex-direction:column;gap:12px;text-align:center;padding:24px}
  }

  /* MEET REIDAR — DYNAMIC TAB LAYOUT */
  @keyframes dyn-panel-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes dyn-fade-in{from{opacity:0}to{opacity:1}}
  @keyframes dyn-slide-down{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes dyn-center-glow{0%,100%{box-shadow:0 0 0 1px rgba(107,71,245,.45),0 0 8px rgba(107,71,245,.1)}50%{box-shadow:0 0 0 1px rgba(107,71,245,.7),0 0 32px rgba(107,71,245,.45)}}
  .dyn-shell{display:flex;border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden;margin-top:44px;min-height:340px}
  .dyn-tabs{width:260px;flex-shrink:0;border-right:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.012);display:flex;flex-direction:column;padding:8px}
  .dyn-tab{padding:14px 16px;border-radius:8px;cursor:pointer;transition:background .18s,border-color .18s;border-left:2px solid transparent;margin-bottom:2px}
  .dyn-tab:hover{background:rgba(255,255,255,.04)}
  .dyn-tab.dyn-active{background:rgba(107,71,245,.1);border-left-color:#6B47F5}
  .dyn-tab-tag{font-family:'DM Mono',monospace;font-size:9px;color:rgba(107,71,245,.4);letter-spacing:.1em;margin-bottom:6px}
  .dyn-tab.dyn-active .dyn-tab-tag{color:#A992FA}
  .dyn-tab-title{font-size:13px;font-weight:500;color:rgba(235,235,235,.38);transition:color .15s;line-height:1.3}
  .dyn-tab.dyn-active .dyn-tab-title{color:#EBEBEB}
  .dyn-tab-prog{height:2px;background:rgba(107,71,245,.12);border-radius:1px;margin-top:10px;overflow:hidden;display:none}
  .dyn-tab.dyn-active .dyn-tab-prog{display:block}
  .dyn-tab-prog-bar{height:100%;background:#6B47F5;border-radius:1px}
  .dyn-panel{flex:1;background:#0C0C10;overflow:hidden;position:relative}
  .dyn-panel-inner{padding:32px;height:100%;animation:dyn-panel-in .15s ease both}
  @media(max-width:900px){
    .dyn-shell{flex-direction:column}
    .dyn-tabs{width:auto;border-right:none;border-bottom:1px solid rgba(255,255,255,.07);flex-direction:row;flex-wrap:wrap}
    .dyn-tab{flex:1;min-width:120px;border-left:none;border-bottom:2px solid transparent}
    .dyn-tab.dyn-active{background:rgba(107,71,245,.1);border-left-color:transparent;border-bottom-color:#6B47F5}
  }
  @media(max-width:640px){
    .dyn-tabs{flex-direction:column}
    .dyn-tab{min-width:auto;border-bottom:none;border-left:2px solid transparent}
    .dyn-tab.dyn-active{border-left-color:#6B47F5;border-bottom-color:transparent}
  }
`;

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
      const cx = W * .5, cy = H * .46, R = Math.min(W, H) * .4;
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
  return <canvas ref={ref} className="hero-canvas" />;
}

/* ─── SCROLL REVEAL ─── */
function useScrollReveal() {
  useEffect(() => {
    const check = () => {
      document.querySelectorAll(".sr:not(.show)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 50) el.classList.add("show");
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
}

/* ─── MOCK UI SCREENS ─── */

const FitBadge = ({ level }) => {
  const styles = {
    "Top Match":   { bg: "rgba(34,197,94,.12)",  color: "#4ade80", border: "rgba(34,197,94,.2)" },
    "Strong Fit":  { bg: "rgba(99,102,241,.14)", color: "#818cf8", border: "rgba(99,102,241,.25)" },
    "Possible Fit":{ bg: "rgba(234,179,8,.1)",   color: "#facc15", border: "rgba(234,179,8,.18)" },
  };
  const s = styles[level] || styles["Possible Fit"];
  return (
    <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}`, letterSpacing: ".06em", whiteSpace: "nowrap" }}>
      {level}
    </span>
  );
};

const Tag = ({ label }) => (
  <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", padding: "2px 6px", borderRadius: 3, background: "rgba(255,255,255,.05)", color: "rgba(235,235,235,.35)", border: "1px solid rgba(255,255,255,.07)" }}>
    {label}
  </span>
);

const COMPANIES = [
  { name: "Synthos", stage: "seed", one_liner: "AI agents replacing clinical admin workflows end-to-end", fit: "Top Match", ai: 5, sector: "HealthTech" },
  { name: "Waymark AI", stage: "pre-seed", one_liner: "AI-native contract intelligence for regulated industries", fit: "Top Match", ai: 5, sector: "LegalTech" },
  { name: "Corpora", stage: "seed", one_liner: "Autonomous compliance documentation for financial services", fit: "Strong Fit", ai: 4, sector: "FinTech" },
  { name: "Atheneum", stage: "pre-seed", one_liner: "AI tutor personalised to institutional curriculum standards", fit: "Strong Fit", ai: 4, sector: "EdTech" },
  { name: "Nexora", stage: "series-a", one_liner: "Autonomous procurement intelligence for enterprise supply chains", fit: "Possible Fit", ai: 3, sector: "B2B SaaS" },
];

function MockCoverage() {
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Reset on remount
    setSelected(null);
    setAnalyzing(false);
    setStage(null);
    setDone(false);

    // Step 1: select a card after 1.2s
    const t1 = setTimeout(() => setSelected(1), 1200);

    // Step 2: auto-trigger deploy after 2.8s
    const t2 = setTimeout(() => {
      setAnalyzing(true);
      const stages = [
        'Visiting company website...',
        'Evaluating thesis fit...',
        'Running investment analysis...',
        'Generating investment brief...',
      ];
      let i = 0;
      setStage(stages[0]);
      const iv = setInterval(() => {
        i++;
        if (i < stages.length) {
          setStage(stages[i]);
        } else {
          clearInterval(iv);
          setAnalyzing(false);
          setDone(true);
          setStage(null);
        }
      }, 1400);
    }, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const co = selected !== null ? (COMPANIES[selected] || COMPANIES[0]) : null;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: company list */}
      <div style={{ width: 175, borderRight: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '10px 12px 6px', fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.25)', letterSpacing: '.08em' }}>COVERAGE · 34</div>
        {COMPANIES.map((c, i) => (
          <div key={i} onClick={() => { setSelected(i); setDone(false); setAnalyzing(false); setStage(null); }}
            style={{
              padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.04)',
              background: selected === i ? 'rgba(107,71,245,.12)' : 'transparent',
              borderLeft: selected === i ? '2px solid #6B47F5' : '2px solid transparent',
              transition: 'all .2s'
            }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: selected === i ? '#EBEBEB' : 'rgba(235,235,235,.55)', marginBottom: 3 }}>{c.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(235,235,235,.28)', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sector}</div>
            <FitBadge level={c.fit} />
          </div>
        ))}
      </div>

      {/* Right: detail panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {selected === null ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(235,235,235,.2)' }}>Select a company to view details</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#EBEBEB' }}>{co.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(235,235,235,.4)', marginTop: 2 }}>{co.one_liner}</div>
              </div>
              <FitBadge level={co.fit} />
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <Tag label={co.stage} /><Tag label={co.sector} />
            </div>

            {/* Deploy agents block */}
            <div style={{ background: 'rgba(107,71,245,.06)', border: '1px solid rgba(107,71,245,.15)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: 'rgba(235,235,235,.4)', marginBottom: 10, lineHeight: 1.5 }}>Deploy research agents for a full investment analysis — scored against your mandate and your personal evaluation patterns.</div>
              {!analyzing && !done && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>⚡ Deploy Research Agents</div>
                  <div style={{ fontSize: 11, color: 'rgba(235,235,235,.4)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', padding: '7px 12px', borderRadius: 6, cursor: 'pointer' }}>+ Add focus</div>
                </div>
              )}
              {analyzing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 600 }}>{stage}</span>
                </div>
              )}
              {done && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#4ade80' }}>✓</span>
                  <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>Analysis complete</span>
                </div>
              )}
            </div>

            {/* Results or locked placeholders */}
            {done ? (
              <>
                <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '12px 14px', animation: 'fadeIn .5s ease' }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'rgba(107,71,245,.7)', letterSpacing: '.1em', marginBottom: 10 }}>THESIS FIT REASONING</div>
                  {[
                    { t: 'Matches your pattern — you\'ve backed 3 technical founders in regulated verticals', c: '#A992FA' },
                    { t: 'AI-native architecture: LLM-first, no legacy layer', c: '#4ade80' },
                    { t: 'Regulated vertical: HIPAA-compliant clinical workflows', c: '#4ade80' },
                    { t: 'B2B SaaS: per-seat enterprise contracts', c: '#facc15' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: r.c, fontSize: 11, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 11, color: 'rgba(235,235,235,.55)', lineHeight: 1.5 }}>{r.t}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 8, padding: '12px 14px', animation: 'fadeIn .7s ease' }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'rgba(74,222,128,.7)', letterSpacing: '.1em', marginBottom: 6 }}>RECOMMENDED NEXT STEP</div>
                  <div style={{ fontSize: 11, color: 'rgba(235,235,235,.6)', lineHeight: 1.5 }}>Request warm intro via <strong style={{ color: '#EBEBEB' }}>Index Ventures</strong>. Move to outreach within 7 days.</div>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['THESIS FIT REASONING', 'COMPARABLE COMPANIES', 'KEY RISKS'].map(label => (
                  <div key={label} style={{ background: '#0d0d18', border: '1px solid #1e1e30', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#6366f1', marginBottom: 8 }}>{label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[80, 65, 75].map((w, i) => <div key={i} style={{ height: 8, background: '#2a2a4a', borderRadius: 3, width: `${w}%` }} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MockMemo() {
  const co = COMPANIES[0];
  return (
    <div style={{ padding: "16px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "rgba(107,71,245,.08)", border: "1px solid rgba(107,71,245,.18)", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#EBEBEB", letterSpacing: "-.02em" }}>{co.name}</div>
            <div style={{ fontSize: 12, color: "rgba(235,235,235,.45)", marginTop: 3 }}>{co.one_liner}</div>
          </div>
          <FitBadge level={co.fit} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <Tag label={co.stage} /><Tag label={co.sector} /><Tag label="$2.4M raised" />
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.7)", letterSpacing: ".1em", marginBottom: 12 }}>THESIS FIT REASONING</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { point: "Pattern match: aligns with your track record of backing technical founders in regulated B2B", conf: "Investor-specific", color: "#A992FA" },
            { point: "AI-native architecture: LLM-first product with no legacy layer", conf: "High confidence", color: "#4ade80" },
            { point: "Regulated vertical: clinical documentation in HIPAA environment", conf: "High confidence", color: "#4ade80" },
            { point: "B2B SaaS model: per-seat pricing, enterprise contracts", conf: "Medium confidence", color: "#facc15" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: r.color, fontSize: 12, marginTop: 1, flexShrink: 0 }}>•</span>
              <div>
                <span style={{ fontSize: 12, color: "rgba(235,235,235,.65)", lineHeight: 1.5 }}>{r.point} </span>
                <span style={{ fontSize: 10, color: r.color, fontFamily: "'DM Mono',monospace" }}>— {r.conf}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.12)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(239,68,68,.6)", letterSpacing: ".1em", marginBottom: 8 }}>KEY RISKS</div>
          <div style={{ fontSize: 11, color: "rgba(235,235,235,.5)", lineHeight: 1.5 }}>EHR integration dependency — Likelihood: High, Impact: Major</div>
        </div>
        <div style={{ background: "rgba(74,222,128,.04)", border: "1px solid rgba(74,222,128,.1)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(74,222,128,.6)", letterSpacing: ".1em", marginBottom: 8 }}>BULL CASE</div>
          <div style={{ fontSize: 11, color: "rgba(235,235,235,.5)", lineHeight: 1.5 }}>If ambient AI becomes standard of care, Synthos owns the clinical workflow layer</div>
        </div>
      </div>

      <div style={{ background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.15)", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(74,222,128,.7)", letterSpacing: ".1em", marginBottom: 8 }}>RECOMMENDED NEXT STEP</div>
        <div style={{ fontSize: 12, color: "rgba(235,235,235,.65)", lineHeight: 1.6 }}>
          Request a warm intro via <span style={{ color: "#EBEBEB", fontWeight: 500 }}>Index Ventures</span> (co-investor in 3 portfolio companies). Strong thesis fit — move to outreach within 7 days before Series A closes.
        </div>
      </div>
    </div>
  );
}

function MockPipeline() {
  const [movingCard, setMovingCard] = useState(false);
  const [movedCard, setMovedCard] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setMovingCard(true), 2000);
    const t2 = setTimeout(() => { setMovingCard(false); setMovedCard(true); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const watchingCards = movedCard
    ? [{ name: 'Atheneum', fit: 'Strong Fit', days: '2d ago' }, { name: 'Tessera', fit: 'Strong Fit', days: '1w ago' }]
    : [{ name: 'Atheneum', fit: 'Strong Fit', days: '2d ago' }, { name: 'Nexora', fit: 'Possible Fit', days: '5d ago' }, { name: 'Tessera', fit: 'Strong Fit', days: '1w ago' }];

  const outreachCards = movedCard
    ? [{ name: 'Nexora', fit: 'Possible Fit', days: 'Just now', highlight: true }, { name: 'Corpora', fit: 'Strong Fit', days: '1d ago' }, { name: 'Lumina AI', fit: 'Top Match', days: '3d ago' }]
    : [{ name: 'Corpora', fit: 'Strong Fit', days: '1d ago' }, { name: 'Lumina AI', fit: 'Top Match', days: '3d ago' }];

  const cols = [
    { label: 'Watching', count: movedCard ? 2 : 3, color: 'rgba(235,235,235,.2)', cards: watchingCards },
    { label: 'Outreach', count: movedCard ? 3 : 2, color: '#818cf8', cards: outreachCards },
    { label: 'Diligence', count: 2, color: '#6B47F5', cards: [{ name: 'Synthos', fit: 'Top Match', days: 'Today' }] },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', gap: 10, height: '100%', overflowX: 'auto' }}>
      {movingCard && (
        <div style={{
          position: 'absolute', top: 80, left: 190, zIndex: 10,
          background: 'rgba(107,71,245,.15)', border: '1px solid rgba(107,71,245,.4)',
          borderRadius: 7, padding: '10px 12px', width: 140,
          boxShadow: '0 8px 32px rgba(107,71,245,.3)',
          animation: 'slideRight 1.2s ease-in-out forwards',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#EBEBEB', marginBottom: 5 }}>Nexora</div>
          <FitBadge level="Possible Fit" />
        </div>
      )}
      {cols.map(col => (
        <div key={col.label} style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: col.color }}>{col.label}</span>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.25)', background: 'rgba(255,255,255,.04)', padding: '1px 5px', borderRadius: 3 }}>{col.count}</span>
          </div>
          {col.cards.map((card, i) => (
            <div key={card.name + i} style={{
              background: card.highlight ? 'rgba(107,71,245,.1)' : 'rgba(255,255,255,.04)',
              border: card.highlight ? '1px solid rgba(107,71,245,.3)' : '1px solid rgba(255,255,255,.07)',
              borderRadius: 7, padding: '10px 12px', cursor: 'pointer',
              transition: 'all .4s ease',
              animation: card.highlight ? 'fadeIn .5s ease' : 'none'
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#EBEBEB', marginBottom: 5 }}>{card.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FitBadge level={card.fit} />
                <span style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: card.highlight ? '#a5b4fc' : 'rgba(235,235,235,.22)' }}>{card.days}</span>
              </div>
            </div>
          ))}
          <div style={{ height: 36, border: '1px dashed rgba(255,255,255,.06)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,.1)' }}>+</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockMarketMap() {
  const sectors = [
    { label: "HealthTech", count: 11, pct: 88 },
    { label: "LegalTech", count: 9, pct: 72 },
    { label: "FinTech", count: 7, pct: 56 },
    { label: "B2B SaaS", count: 5, pct: 40 },
    { label: "EdTech", count: 2, pct: 16 },
  ];
  const stages = [
    { label: "Pre-seed", val: 38, color: "#6B47F5" },
    { label: "Seed", val: 44, color: "#818cf8" },
    { label: "Series A", val: 18, color: "#A992FA" },
  ];
  return (
    <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, height: "100%", overflowY: "auto" }}>
      {/* Top sectors */}
      <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "14px" }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.7)", letterSpacing: ".1em", marginBottom: 14 }}>TOP SECTORS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sectors.map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(235,235,235,.6)" }}>{s.label}</span>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.35)" }}>{s.count}</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,.05)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: "linear-gradient(90deg,#6B47F5,#A992FA)", borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Stage distribution */}
      <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "14px" }}>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.7)", letterSpacing: ".1em", marginBottom: 14 }}>STAGE DISTRIBUTION</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stages.map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(235,235,235,.6)" }}>{s.label}</span>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: s.color }}>{s.val}%</span>
              </div>
              <div style={{ height: 14, background: "rgba(255,255,255,.04)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.val}%`, background: s.color, opacity: .7, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["34", "total companies"], ["12", "this week"], ["68%", "top match rate"], ["4.1", "avg AI score"]].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#EBEBEB", letterSpacing: "-.02em" }}>{n}</div>
              <div style={{ fontSize: 9, color: "rgba(235,235,235,.3)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockSignals() {
  return (
    <div style={{ padding: "20px", overflowY: "auto", height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#EBEBEB" }}>Weekly Brief</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", marginTop: 3 }}>Failup Ventures · Week of Mar 10</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["7d", "14d", "30d"].map(d => (
            <div key={d} style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", padding: "3px 8px", borderRadius: 4, background: d === "7d" ? "rgba(107,71,245,.2)" : "rgba(255,255,255,.04)", color: d === "7d" ? "#A992FA" : "rgba(235,235,235,.3)", border: `1px solid ${d === "7d" ? "rgba(107,71,245,.3)" : "rgba(255,255,255,.07)"}`, cursor: "pointer" }}>{d}</div>
          ))}
        </div>
      </div>
      {[
        { title: "What's moving", body: "Clinical AI automation is heating up — 6 new companies sourced this week targeting hospital admin workflows. Strong signal that the back-office of healthcare is reaching AI-native tipping point." },
        { title: "Highest conviction", body: "Synthos (seed, HealthTech). AI agents replacing clinical documentation end-to-end. 5/5 AI score, $2.4M raised, Andreessen partner advising. Move fast — Series A process reportedly beginning." },
        { title: "Whitespace spotted", body: "No strong player yet in AI-native compliance for Nordic financial services. 4 companies in FinTech this week but none with regulatory depth for EU market." },
      ].map((s, i) => (
        <div key={i} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.65)", letterSpacing: ".1em", marginBottom: 8 }}>{s.title.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: "rgba(235,235,235,.55)", lineHeight: 1.65 }}>{s.body}</div>
        </div>
      ))}
    </div>
  );
}

const CHAT_MSGS = [
  { role: "user", text: "What came in this week that fits our HealthTech thesis?" },
  { role: "ai", text: "6 new companies matched your HealthTech mandate this week. The strongest signal is Synthos — AI agents replacing clinical documentation workflows end-to-end. Top Match, 5/5 AI score. I'd also flag Meridian Health AI (seed, autonomous prior auth) — Strong Fit and moving fast." },
  { role: "user", text: "Find me companies similar to Synthos" },
  { role: "ai", text: "3 comparable companies in your coverage: Scribe Health (pre-seed, ambient clinical documentation), Abridge (Series B, comparable but later stage), and Heliix (pre-seed, surgical workflow automation). Synthos has the strongest mandate fit of the group." },
];
const TYPE_MS = 45;
const THINKING_MS = 2500;
const PAUSE_AFTER_FIRST_RESPONSE_MS = 2000;

function MockChat() {
  // 0 = typing Q1 | 1 = thinking dots (user1 shown) | 2 = ai1 fades in, pause 2s | 3 = typing Q2 | 4 = thinking dots (user2 shown) | 5 = ai2 fades in → 6 = reset
  const [step, setStep] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (step !== 0 && step !== 3) return;
    const text = step === 0 ? CHAT_MSGS[0].text : CHAT_MSGS[2].text;
    const len = text.length;
    const interval = setInterval(() => {
      setCharIndex((c) => {
        if (c >= len) {
          if (step === 0) setStep(1);
          else setStep(4);
          return c;
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step === 1) {
      const t = setTimeout(() => { setCharIndex(0); setStep(2); }, THINKING_MS);
      return () => clearTimeout(t);
    }
    if (step === 2) {
      const t = setTimeout(() => setStep(3), PAUSE_AFTER_FIRST_RESPONSE_MS);
      return () => clearTimeout(t);
    }
    if (step === 4) {
      const t = setTimeout(() => { setCharIndex(0); setStep(5); }, THINKING_MS);
      return () => clearTimeout(t);
    }
    if (step === 5) {
      const t = setTimeout(() => setStep(6), 1200);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (step === 6) {
      setStep(0);
      setCharIndex(0);
    }
  }, [step]);

  const bubbleStyle = (role) => ({
    maxWidth: "80%", padding: "10px 13px", borderRadius: role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
    background: role === "user" ? "rgba(107,71,245,.25)" : "rgba(255,255,255,.05)",
    border: `1px solid ${role === "user" ? "rgba(107,71,245,.35)" : "rgba(255,255,255,.08)"}`,
    fontSize: 12, color: "rgba(235,235,235,.75)", lineHeight: 1.6,
  });
  const typingBubbleStyle = {
    maxWidth: "80%", padding: "10px 13px", borderRadius: "10px 10px 10px 2px",
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
  };

  const showThinking1 = step === 1;
  const showThinking2 = step === 4;
  const visibleUserCount = step === 0 ? 0 : step >= 1 ? 1 : 0;
  const visibleUserCount2 = step >= 4 ? 2 : step >= 2 ? 1 : 0;
  const visibleAi1 = step >= 2;
  const visibleAi2 = step >= 5;
  const inputText = step === 0 ? CHAT_MSGS[0].text.slice(0, charIndex) : step === 3 ? CHAT_MSGS[2].text.slice(0, charIndex) : "";

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, justifyContent: "flex-end", overflowY: "auto" }}>
        {visibleUserCount >= 1 && (
          <div style={{ display: "flex", justifyContent: "flex-end", animation: "mockIn .25s ease both" }}>
            <div style={bubbleStyle("user")}>{CHAT_MSGS[0].text}</div>
          </div>
        )}
        {showThinking1 && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "mockIn .2s ease both" }}>
            <div style={typingBubbleStyle} className="typing-dots"><span /><span /><span /></div>
          </div>
        )}
        {visibleAi1 && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "mockIn .25s ease both" }}>
            <div style={bubbleStyle("ai")}>{CHAT_MSGS[1].text}</div>
          </div>
        )}
        {visibleUserCount2 >= 2 && (
          <div style={{ display: "flex", justifyContent: "flex-end", animation: "mockIn .25s ease both" }}>
            <div style={bubbleStyle("user")}>{CHAT_MSGS[2].text}</div>
          </div>
        )}
        {showThinking2 && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "mockIn .2s ease both" }}>
            <div style={typingBubbleStyle} className="typing-dots"><span /><span /><span /></div>
          </div>
        )}
        {visibleAi2 && (
          <div style={{ display: "flex", justifyContent: "flex-start", animation: "mockIn .25s ease both" }}>
            <div style={bubbleStyle("ai")}>{CHAT_MSGS[3].text}</div>
          </div>
        )}
      </div>
      {/* Input: typewriter here */}
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, minHeight: 34, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, display: "flex", alignItems: "center", padding: "0 12px" }}>
          {inputText ? (
            <span style={{ fontSize: 11, color: "rgba(235,235,235,.75)", fontFamily: "'DM Mono',monospace" }}>
              {inputText}<span className="typewriter-cursor">|</span>
            </span>
          ) : (
            <>
              <span style={{ fontSize: 11, color: "rgba(235,235,235,.2)", fontFamily: "'DM Mono',monospace" }}>Ask your AI analyst...</span>
              <span style={{ width: 1, height: 12, background: "#6B47F5", marginLeft: 4, animation: "blink 1s infinite" }} />
            </>
          )}
        </div>
        <div style={{ width: 34, height: 34, background: "#6B47F5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M6 1l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
  );
}

/* ─── PRODUCT PREVIEW SHELL ─── */
const TABS = [
  { n: "01", name: "Coverage",    desc: "Your mandate-filtered deal feed",      url: "reidar.ai/coverage",  Component: MockCoverage },
  { n: "02", name: "Memos",       desc: "AI investment memos per company",       url: "reidar.ai/memo",      Component: MockMemo },
  { n: "03", name: "Pipeline",    desc: "Kanban deal tracking",                  url: "reidar.ai/pipeline",  Component: MockPipeline },
  { n: "04", name: "Market Map",  desc: "Sector & stage intelligence",           url: "reidar.ai/market",    Component: MockMarketMap },
  { n: "05", name: "Hot Signals", desc: "Weekly AI brief for your firm",         url: "reidar.ai/signals",   Component: MockSignals },
  { n: "06", name: "AI Analyst",  desc: "Chat with your full database",          url: "reidar.ai/chat",      Component: MockChat },
  { n: "07", name: "Autopilot",  desc: "What Reidar did while you slept",        url: "reidar.ai/autopilot", Component: MockAutopilot },
];

const CYCLE_MS = 5000;
const COVERAGE_TAB_INDEX = 0;
const COVERAGE_CYCLE_MS = 14000;
const AI_ANALYST_TAB_INDEX = 5;
const AI_ANALYST_CYCLE_MS = 12000;

function ProductPreview() {
  const [active, setActive] = useState(0);
  const [key, setKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const progRef = useRef(null);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  const startRef = useRef(Date.now());

  const cycleMs = active === AI_ANALYST_TAB_INDEX ? AI_ANALYST_CYCLE_MS : active === COVERAGE_TAB_INDEX ? COVERAGE_CYCLE_MS : CYCLE_MS;

  // auto-cycle
  useEffect(() => {
    if (paused) return;
    startRef.current = Date.now();
    setProgress(0);
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(100, (elapsed / cycleMs) * 100));
    }, 50);
    const timeout = setTimeout(() => {
      setActive(a => (a + 1) % TABS.length);
      setKey(k => k + 1);
    }, cycleMs);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [active, paused, cycleMs]);

  const select = (i) => {
    setActive(i);
    setKey(k => k + 1);
    setProgress(0);
    startRef.current = Date.now();
    setPaused(false);
  };

  const { Component, url } = TABS[active];

  return (
    <div className="prod-shell" style={isMobile ? { minHeight: 400, overflow: 'hidden' } : {}} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Tabs */}
      <div className="prod-tabs">
        {TABS.map((t, i) => (
          <div key={i} className={`prod-tab${active === i ? " active" : ""}`} onClick={() => select(i)}>
            <div className="prod-tab-num">{t.n}</div>
            <div className="prod-tab-name">{t.name}</div>
            <div className="prod-tab-desc">{t.desc}</div>
            <div className="prod-progress">
              <div className="prod-progress-bar" style={{ width: active === i ? `${progress}%` : "0%" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Viewport */}
      <div className="prod-view">
        <div className="prod-chrome">
          <div className="chrome-dot" style={{ background: "#FF5F57" }} />
          <div className="chrome-dot" style={{ background: "#FFBD2E" }} />
          <div className="chrome-dot" style={{ background: "#28C840" }} />
          <div className="chrome-bar">
            <span className="chrome-url">{url}</span>
          </div>
        </div>
        <div className="prod-content" key={key}>
          <Component />
        </div>
      </div>
    </div>
  );
}

/* ─── CONSTANTS ─── */
const TICKER_ITEMS = ["INVESTOR-SPECIFIC SCORING","DECISION MEMORY","PATTERN RECOGNITION","JUDGMENT THAT COMPOUNDS","CONTEXT THAT TRAVELS WITH YOU","NEVER LOSE A DEAL AGAIN","CAPTURES YOUR ALPHA","FIRM-AWARE FILTERING","PERSONAL AI ASSOCIATE","SMARTER EVERY INTERACTION","BUILT FOR YOUR MIND","LEARNS FROM YOUR MEETINGS","ZERO MANUAL LOGGING","PASSIVE CONTEXT CAPTURE","WORKS WHILE YOU WORK"];
const STEPS = [
  { n:"01", t:"Learns your mandate",      d:"Reidar ingests your firm's thesis, portfolio, and stage focus. Upload past deals, connect your CRM, or start from scratch." },
  { n:"02", t:"Builds your profile",      d:"Tell it how you evaluate. What patterns you trust. What you've passed on and why. Every investor at the firm gets their own lens." },
  { n:"03", t:"Sources with your lens",   d:"Nightly sourcing filtered through your firm's mandate AND your personal evaluation patterns. Different partners see different companies." },
  { n:"04", t:"Captures every decision",  d:"You don't log anything. Reidar captures context from meetings you take, emails you send, deals you advance, and notes you write. Every interaction with your workflow feeds back in — automatically." },
  { n:"05", t:"Resurfaces at the right moment", d:"Company you passed on just hit a milestone? Reidar remembers why you passed — from the notes you took in that meeting 8 months ago — and shows you exactly what changed." },
  { n:"06", t:"Coaches your internal pitch", d:"Before you bring a deal to IC, Reidar tells you what objections to expect based on your firm's decision history." },
];
const COMPS = [
  { name:"Signal platforms",    t:"Same signals, every user.",    c:"When a thousand firms get the same funding alert at the same time, the signal is noise. The edge isn't knowing — it's knowing what it means for you specifically." },
  { name:"Startup databases",   t:"Broad but generic.",           c:"50 million company profiles, and none of them remember that you saw this company eight months ago and passed because the unit economics didn't work." },
  { name:"CRM tools",           t:"Track relationships, not judgment.", c:"They know who you emailed. They don't know what you thought, what pattern you recognized, or why you had conviction. The context that matters most never gets captured." },
  { name:"Market intelligence", t:"Shared views, shared blind spots.", c:"If your sourcing strategy is the same tool everyone else uses, your sourcing strategy isn't a strategy. It's a subscription." },
];

const INTEGRATIONS = [
  {
    name: "Affinity",
    desc: "Sync deal flow, relationship data, and pipeline activity from the most popular VC CRM",
    badge: "Coming soon",
    iconBg: "rgba(99,102,241,.15)",
    iconBorder: "rgba(99,102,241,.4)",
  },
  {
    name: "Attio",
    desc: "Import deal history, contact records, and pipeline stages from your Attio workspace",
    badge: "Coming soon",
    iconBg: "rgba(255,255,255,.08)",
    iconBorder: "rgba(255,255,255,.25)",
  },
  {
    name: "Gmail",
    desc: "Inbound pitches auto-detected, founder emails captured, warm intros logged — all passively",
    badge: "Coming soon",
    iconBg: "rgba(234,67,53,.15)",
    iconBorder: "rgba(234,67,53,.4)",
  },
  {
    name: "Slack",
    desc: "Deal discussions captured, weekly briefs delivered, and ask Reidar anything in-channel",
    badge: "Coming soon",
    iconBg: "rgba(224,30,90,.15)",
    iconBorder: "rgba(224,30,90,.4)",
  },
  {
    name: "Google Calendar",
    desc: "Founder meetings detected automatically, pre-call briefs generated, context logged after",
    badge: "Coming soon",
    iconBg: "rgba(66,133,244,.15)",
    iconBorder: "rgba(66,133,244,.4)",
  },
  {
    name: "Granola",
    desc: "Meeting notes and founder call transcripts flow in automatically — no manual upload needed",
    badge: "Coming soon",
    iconBg: "rgba(245,158,11,.15)",
    iconBorder: "rgba(245,158,11,.4)",
  },
  {
    name: "Fireflies",
    desc: "Call transcripts from every founder meeting auto-imported and linked to company records",
    badge: "Coming soon",
    iconBg: "rgba(74,222,128,.15)",
    iconBorder: "rgba(74,222,128,.4)",
  },
  {
    name: "Crunchbase",
    desc: "Company profiles, funding history, and investor data enriched automatically",
    badge: "Coming soon",
    iconBg: "rgba(2,136,209,.15)",
    iconBorder: "rgba(2,136,209,.4)",
  },
  {
    name: "PitchBook",
    desc: "Deep company data, valuations, and comparable transactions pulled into your research",
    badge: "Coming soon",
    iconBg: "rgba(0,51,102,.15)",
    iconBorder: "rgba(0,51,102,.4)",
  },
  {
    name: "Harmonic",
    desc: "Early-stage company signals and founder data enriching your coverage feed",
    badge: "Coming soon",
    iconBg: "rgba(168,85,247,.15)",
    iconBorder: "rgba(168,85,247,.4)",
  },
  {
    name: "LinkedIn",
    desc: "Founder backgrounds, team signals, and network connections surfaced inline",
    badge: "Coming soon",
    iconBg: "rgba(0,119,181,.15)",
    iconBorder: "rgba(0,119,181,.4)",
  },
  {
    name: "Notion",
    desc: "Push investment memos and company briefs directly to your team workspace",
    badge: "Coming soon",
    iconBg: "rgba(255,255,255,.08)",
    iconBorder: "rgba(255,255,255,.2)",
  },
];

const ORBIT_SVGS = [
  /* Affinity */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l4 7H8l4-7zm0 20l-4-7h8l-4 7zM2 12l4-4v8L2 12zm20 0l-4 4V8l4 4z" fill="#6366f1"/></svg>,
  /* Attio */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#ffffff"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#ffffff"/></svg>,
  /* Gmail */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>,
  /* Slack */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#E01E5A"/></svg>,
  /* Google Calendar */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="#4285F4"/></svg>,
  /* Granola */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="#f59e0b" strokeWidth="1.8" fill="none"/><line x1="8" y1="8" x2="16" y2="8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="16" x2="13" y2="16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  /* Fireflies */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" fill="#4ade80"/><path d="M5 10a7 7 0 0014 0" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" fill="none"/><line x1="12" y1="17" x2="12" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/><line x1="8" y1="22" x2="16" y2="22" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  /* Crunchbase */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="12" width="5" height="8" rx="1" fill="#0288D1"/><rect x="9.5" y="7" width="5" height="13" rx="1" fill="#0288D1"/><rect x="17" y="4" width="5" height="16" rx="1" fill="#0288D1"/><line x1="2" y1="23" x2="22" y2="23" stroke="#0288D1" strokeWidth="1.5"/></svg>,
  /* PitchBook */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="#336699" strokeWidth="1.8" fill="none"/><line x1="7" y1="12" x2="17" y2="12" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="8" x2="17" y2="8" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/><line x1="7" y1="16" x2="13" y2="16" stroke="#336699" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  /* Harmonic */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12 Q6 4 12 12 Q18 20 22 12" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M2 12 Q6 16 12 12 Q18 8 22 12" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5"/></svg>,
  /* LinkedIn */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/></svg>,
  /* Notion */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 3h4.5l9 13.5V3H21v18h-4.5L7.5 7.5V21H4V3z" fill="#ffffff"/></svg>,
];

const HERO_PHRASES = [
  "Learns how you think.",
  "Remembers what you've seen.",
  "Gets sharper every decision.",
  "Knows your blind spots.",
  "Built around your judgment.",
];

/* ─── COMPETITOR GRID ─── */

function CompetitorGrid() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div className="comp-grid" ref={ref}>
      {COMPS.map((c, i) => (
        <div
          className="comp-cell"
          key={c.name}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(20px)',
            transition: `opacity 0.4s ease ${i * 120}ms, transform 0.4s ease ${i * 120}ms, background .2s, box-shadow .2s`,
          }}
        >
          <div className="comp-name">{c.name}</div>
          <div className="comp-text"><strong>{c.t}</strong> {c.c}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── INTEGRATIONS ORBIT ─── */

/* ─── MOCK INTELLIGENCE LAYER ─── */

function MILStage1() {
  const [briefVis, setBriefVis] = useState(false);
  const [rowsVis, setRowsVis] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setBriefVis(true), 600);
    const t2 = setTimeout(() => setRowsVis(1), 900);
    const t3 = setTimeout(() => setRowsVis(2), 1200);
    const t4 = setTimeout(() => setRowsVis(3), 1500);
    const t5 = setTimeout(() => setRowsVis(4), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  const rows = [
    { color: 'rgba(235,235,235,.35)', text: 'Last contact 47 days ago — you said: too early, revisit at seed' },
    { color: '#4ade80',               text: '$2.1M seed closed last week · Benchmark co-investing' },
    { color: '#f59e0b',               text: 'Portfolio overlap — Synthos is in the same workflow layer' },
    { color: '#6B47F5',               text: 'Suggested angle: ask about technical architecture at scale' },
  ];

  return (
    <div style={{ padding: 20, background: '#0C0C10', minHeight: 360 }}>
      {/* Calendar card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#6B47F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📅</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#EBEBEB' }}>9:00 AM — Founder call · NovaMed</div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#f59e0b', marginTop: 2 }}>Starting in 12 minutes</div>
        </div>
      </div>
      {/* Brief card */}
      {briefVis && (
        <div style={{ background: 'rgba(107,71,245,.06)', border: '1px solid rgba(107,71,245,.15)', borderRadius: 8, padding: '14px 16px', animation: 'dyn-panel-in .35s ease' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#6B47F5', letterSpacing: '.1em', marginBottom: 12 }}>REIDAR BRIEF</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row, i) => i < rowsVis && (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.6, animation: 'dyn-panel-in .25s ease' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: row.color, flexShrink: 0, marginTop: 5 }} />
                <span style={{ color: i === 0 ? 'rgba(235,235,235,.5)' : 'rgba(235,235,235,.65)' }}>{row.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MILStage2() {
  const [barW, setBarW] = useState(0);
  const [readVis, setReadVis] = useState(false);
  const [cardVis, setCardVis] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBarW(100), 800);
    const t2 = setTimeout(() => setReadVis(true), 2200);
    const t3 = setTimeout(() => setCardVis(true), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ padding: 20, background: '#0C0C10', minHeight: 360, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'start' }}>
      {/* Left — inbox */}
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#6B47F5', letterSpacing: '.1em', marginBottom: 10 }}>INBOX</div>
        <div style={{ position: 'relative', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 8, padding: 14, overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.4)', marginBottom: 4 }}>Michael Torres · General Catalyst</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#EBEBEB', marginBottom: 6 }}>Intro: Sarah Chen / Heliix — surgical workflow AI</div>
          <div style={{ fontSize: 11, color: 'rgba(235,235,235,.35)', lineHeight: 1.5 }}>Hi — wanted to connect you with Sarah, she's building...</div>
          <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.25)', marginTop: 8 }}>2 minutes ago</div>
          {/* Processing bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.05)', borderRadius: '0 0 8px 8px' }}>
            <div style={{ height: '100%', background: '#6B47F5', width: `${barW}%`, transition: 'width 1.2s ease', borderRadius: '0 0 8px 8px' }} />
          </div>
        </div>
        {readVis && (
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#4ade80', marginTop: 8, animation: 'dyn-panel-in .3s ease' }}>✓ Reidar read this</div>
        )}
      </div>
      {/* Right — coverage card */}
      {cardVis && (
        <div style={{ animation: 'dyn-panel-in .4s ease' }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#4ade80', letterSpacing: '.1em', marginBottom: 10 }}>ADDED TO COVERAGE</div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(107,71,245,.2)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#EBEBEB' }}>Heliix</span>
              <FitBadge level="Strong Fit" />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,235,.4)', marginBottom: 10 }}>AI-assisted surgical workflow automation</div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
              <Tag label="pre-seed" />
              <Tag label="MedTech" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B47F5', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#A992FA' }}>NEW · 4/5 thesis fit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MILStage3() {
  return (
    <div style={{ padding: 20, background: '#0C0C10', minHeight: 360 }}>
      {/* Amber banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, animation: 'dyn-slide-down .4s ease' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'rgba(235,235,235,.7)' }}>Company you passed on 8 months ago just hit a milestone</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#EBEBEB', marginBottom: 12 }}>Meridian Health</div>
      {/* THEN / NOW grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {/* THEN */}
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(235,235,235,.3)', letterSpacing: '.1em', marginBottom: 8 }}>THEN</div>
          <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.12)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(239,68,68,.6)', marginBottom: 6 }}>Passed · Aug 2025</div>
            <div style={{ fontSize: 12, color: 'rgba(235,235,235,.5)', lineHeight: 1.6 }}>Too early — no revenue, pre-product. Revisit if they close a round.</div>
          </div>
        </div>
        {/* NOW */}
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: '#4ade80', letterSpacing: '.1em', marginBottom: 8 }}>NOW</div>
          <div style={{ background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.15)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 5 }}>↑ $500K ARR announced</div>
            <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 5 }}>↑ 3 enterprise pilots signed</div>
            <div style={{ fontSize: 12, color: '#4ade80' }}>↑ Seed round opening — $2M target</div>
          </div>
        </div>
      </div>
      {/* CTA button */}
      <button style={{ width: '100%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', fontSize: 13, fontWeight: 600, padding: '11px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
        Re-evaluate Meridian Health →
      </button>
    </div>
  );
}

function MockIntelligenceLayer() {
  const STAGE_MS = 6000;
  const FADE_MS = 600;
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setStage(s => (s + 1) % 3);
        setVisible(true);
      }, FADE_MS);
    }, STAGE_MS);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, overflow: 'hidden', marginTop: 44 }}>
      {/* chrome */}
      <div className="prod-chrome">
        <div className="chrome-dot" style={{ background: '#FF5F57' }} />
        <div className="chrome-dot" style={{ background: '#FFBD2E' }} />
        <div className="chrome-dot" style={{ background: '#28C840' }} />
        <div className="chrome-bar">
          <span className="chrome-url">reidar.ai/intelligence</span>
        </div>
      </div>
      {/* content */}
      <div style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}>
        {stage === 0 && <MILStage1 />}
        {stage === 1 && <MILStage2 />}
        {stage === 2 && <MILStage3 />}
      </div>
    </div>
  );
}

/* ─── MOCK AUTOPILOT DASHBOARD ─── */
function MockAutopilot() {
  const STAGE_MS = 3500;
  const FADE_MS = 400;
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setStage(s => (s + 1) % 3);
        setVisible(true);
      }, FADE_MS);
    }, STAGE_MS);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div style={{ padding: 28, opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}>
      {stage === 0 && <MIStage1 />}
      {stage === 1 && <MIStage2 />}
      {stage === 2 && <MIStage3 />}
    </div>
  );
}

/* Stage 1 — Learning Loop */
function MIStage1() {
  const [badge, setBadge] = useState('COLD START');
  const [barW, setBarW] = useState(0);
  const [queryVis, setQueryVis] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setBadge('LEARNING'), 1200);
    const t2 = setTimeout(() => setBarW(20), 300);
    const t3 = setTimeout(() => setQueryVis(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isLearning = badge === 'LEARNING';

  return (
    <div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 20 }}>
        Learning Loop
      </div>
      {/* Status badge */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-block', padding: '6px 18px', borderRadius: 20,
          fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 700, letterSpacing: '.08em',
          background: isLearning ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
          border: `1px solid ${isLearning ? 'rgba(245,158,11,.35)' : 'rgba(239,68,68,.35)'}`,
          color: isLearning ? '#FCD34D' : '#FCA5A5',
          transition: 'all 0.6s ease',
        }}>
          {badge}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(235,235,235,.32)', marginTop: 10 }}>
          2 of 10 high-quality runs needed for self-optimization
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 3, height: 5, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: '#6B47F5',
          width: `${barW}%`, transition: 'width 1.5s cubic-bezier(.16,1,.3,1)',
        }} />
      </div>
      {/* Queries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: queryVis ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <div style={{ fontSize: 10, color: 'rgba(235,235,235,.3)', letterSpacing: '.06em', fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>WORKING WELL</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(235,235,235,.6)' }}>accounts payable AI pre-seed</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(235,235,235,.3)', letterSpacing: '.06em', fontFamily: "'DM Mono',monospace", marginTop: 6, marginBottom: 2 }}>PATTERNS AVOIDING</div>
        {['AI knowledge worker ops', 'fleet operations AI software'].map(q => (
          <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(235,235,235,.3)', textDecoration: 'line-through' }}>{q}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stage 2 — Overnight Log */
function MIStage2() {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const JOBS = [
    { time: '3:00 AM', name: 'Signal Refresh', desc: 'Checked 4 companies — 2 new signals detected for DianaHR and Convr' },
    { time: '4:00 AM', name: 'Sourcing', desc: 'Ran 8 queries — 18 companies found, 6 matched your mandate' },
    { time: '4:08 AM', name: 'Email Alert', desc: 'Top match notification sent to remi@balassanian.com' },
  ];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = JOBS.map((_, i) =>
      setTimeout(() => setShown(i + 1), 200 + i * 400)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 20 }}>
        Overnight Log
      </div>
      {/* Day pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {DAYS.map(d => (
          <div key={d} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: "'DM Mono',monospace",
            background: d === 'Sat' ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.04)',
            border: `1px solid ${d === 'Sat' ? 'rgba(245,158,11,.4)' : 'rgba(255,255,255,.08)'}`,
            color: d === 'Sat' ? '#FCD34D' : 'rgba(235,235,235,.3)',
          }}>{d}</div>
        ))}
      </div>
      {/* Job cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {JOBS.map((job, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
            borderLeft: '3px solid #10b981', borderRadius: 8, padding: '10px 14px',
            opacity: shown > i ? 1 : 0, transform: shown > i ? 'none' : 'translateY(6px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}>
            <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: 'rgba(235,235,235,.3)', marginBottom: 4 }}>
              {job.time} · <span style={{ color: 'rgba(235,235,235,.55)' }}>{job.name}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,235,.5)', lineHeight: 1.5 }}>{job.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stage 3 — Sourcing Engine */
function MIStage3() {
  const QUERIES = [
    { q: 'AI field service dispatch automation 2025', bar: '#10b981', pct: 80, added: 2 },
    { q: 'AI underwriting workflow seed', bar: '#10b981', pct: 75, added: 4 },
    { q: 'accounts payable AI pre-seed', bar: '#f59e0b', pct: 45, added: 3 },
    { q: 'AI knowledge worker ops', bar: '#ef4444', pct: 10, added: 0 },
  ];
  const [shown, setShown] = useState(0);
  const [lineLen, setLineLen] = useState(0);

  // Sparkline path (8 points, slight upward trend)
  const pts = [8, 22, 14, 28, 18, 24, 16, 32];
  const W = 220, H = 44;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const min = Math.min(...pts), max = Math.max(...pts);
  const ys = pts.map(v => H - ((v - min) / (max - min + 1)) * (H - 8) - 4);
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const totalLen = 240; // approximate stroke length

  useEffect(() => {
    const t0 = setTimeout(() => setLineLen(totalLen), 100);
    const timers = QUERIES.map((_, i) =>
      setTimeout(() => setShown(i + 1), 600 + i * 300)
    );
    return () => { clearTimeout(t0); timers.forEach(clearTimeout); };
  }, []);

  return (
    <div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: '.12em', color: '#6B47F5', textTransform: 'uppercase', marginBottom: 16 }}>
        Sourcing Engine
      </div>
      <div style={{ fontSize: 11, color: 'rgba(235,235,235,.35)', marginBottom: 16, lineHeight: 1.6 }}>
        Last run Mar 20, 2026 — 8 queries,{' '}
        <span style={{ color: '#A992FA' }}>18</span> companies added,{' '}
        <span style={{ color: '#A992FA' }}>6</span> matched mandate
      </div>
      {/* Sparkline */}
      <div style={{ marginBottom: 18 }}>
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="mi-spark-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            d={pathD}
            fill="none"
            stroke="url(#mi-spark-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen}
            strokeDashoffset={totalLen - lineLen}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.16,1,.3,1)' }}
          />
          {pts.map((_, i) => (
            <circle
              key={i}
              cx={xs[i]}
              cy={ys[i]}
              r="2.5"
              fill="#10b981"
              opacity={lineLen > 0 ? 1 : 0}
              style={{ transition: `opacity 0.3s ease ${0.8 + i * 0.1}s` }}
            />
          ))}
        </svg>
      </div>
      {/* Query rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QUERIES.map((q, i) => (
          <div key={i} style={{
            opacity: shown > i ? 1 : 0, transform: shown > i ? 'none' : 'translateY(4px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(235,235,235,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                {q.q}
              </div>
              <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 2, height: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: q.bar, width: `${q.pct}%`, transition: `width 0.8s cubic-bezier(.16,1,.3,1) ${0.7 + i * 0.15}s` }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,235,.35)', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span style={{ color: 'rgba(235,235,235,.6)', fontWeight: 500 }}>{q.added}</span> added
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsOrbit() {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const innerAngleRef = useRef(0);
  const outerAngleRef = useRef(0);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const R_INNER = 120;
  const R_OUTER = 200;
  const INNER_SPEED = (Math.PI * 2) / (22 * 60);
  const OUTER_SPEED = (Math.PI * 2) / (30 * 60);
  // Inner ring: Affinity, Gmail, Slack, Google Calendar, Granola, Crunchbase
  const INNER_IDXS = [0, 2, 3, 4, 5, 7];
  // Outer ring: Attio, Fireflies, PitchBook, Harmonic, LinkedIn, Notion
  const OUTER_IDXS = [1, 6, 8, 9, 10, 11];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const innerIcons = container.querySelectorAll('[data-orbit-inner]');
    const outerIcons = container.querySelectorAll('[data-orbit-outer]');
    const animate = () => {
      innerAngleRef.current += INNER_SPEED;
      outerAngleRef.current += OUTER_SPEED;
      innerIcons.forEach((el, i) => {
        const a = innerAngleRef.current + (i / INNER_IDXS.length) * Math.PI * 2 - Math.PI / 2;
        el.style.transform = `translate(${Math.cos(a) * R_INNER}px, ${Math.sin(a) * R_INNER}px)`;
      });
      outerIcons.forEach((el, i) => {
        const a = outerAngleRef.current + (i / OUTER_IDXS.length) * Math.PI * 2 - Math.PI / 2;
        el.style.transform = `translate(${Math.cos(a) * R_OUTER}px, ${Math.sin(a) * R_OUTER}px)`;
      });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const iconEl = (intIdx, orbitAttr) => {
    const int = INTEGRATIONS[intIdx];
    const isHovered = hoveredIdx === intIdx;
    return (
      <div
        key={int.name}
        {...{ [orbitAttr]: '' }}
        style={{
          position: 'absolute',
          top: 'calc(50% - 22px)', left: 'calc(50% - 22px)',
          width: 44, height: 44,
          zIndex: 3,
        }}
        onMouseEnter={() => setHoveredIdx(intIdx)}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: int.iconBg || 'rgba(14,14,20,1)',
          border: `1px solid ${isHovered ? 'rgba(107,71,245,.5)' : (int.iconBorder || 'rgba(255,255,255,.12)')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transform: isHovered ? 'scale(1.12)' : 'none',
          transition: 'transform .2s, border-color .2s, box-shadow .2s',
          boxShadow: isHovered ? '0 0 16px rgba(107,71,245,.3)' : 'none',
        }}>
          {ORBIT_SVGS[intIdx]}
        </div>
        {isHovered && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,16,.97)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 8,
            padding: '10px 14px',
            width: 160,
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            animation: 'dyn-panel-in .15s ease',
            zIndex: 20,
            pointerEvents: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#EBEBEB' }}>{int.name}</span>
              <span style={{
                fontFamily: "'Space Mono',monospace", fontSize: 8, letterSpacing: '.06em',
                padding: '2px 6px', borderRadius: 100,
                background: int.badgeBg || 'rgba(107,71,245,.1)',
                color: int.badgeColor || 'rgba(107,71,245,.7)',
                border: `1px solid ${int.badgeBorder || 'rgba(107,71,245,.2)'}`,
              }}>{int.badge}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(235,235,235,.45)', lineHeight: 1.45, maxWidth: 220 }}>{int.desc}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
      <div ref={containerRef} style={{ position: 'relative', width: 480, height: 480 }}>
        {/* Inner orbit ring visual */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: R_INNER * 2, height: R_INNER * 2,
          marginTop: -R_INNER, marginLeft: -R_INNER,
          borderRadius: '50%',
          border: '1px solid rgba(107,71,245,.12)',
          pointerEvents: 'none',
        }} />
        {/* Outer orbit ring visual */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: R_OUTER * 2, height: R_OUTER * 2,
          marginTop: -R_OUTER, marginLeft: -R_OUTER,
          borderRadius: '50%',
          border: '1px solid rgba(107,71,245,.07)',
          pointerEvents: 'none',
        }} />
        {/* Center mark */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 56, height: 56, borderRadius: 14,
          background: '#6B47F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
          animation: 'dyn-center-glow 3s ease-in-out infinite',
        }}>
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
            <circle cx="7" cy="7" r="2" fill="white"/>
          </svg>
        </div>
        {/* Inner ring icons */}
        {INNER_IDXS.map(idx => iconEl(idx, 'data-orbit-inner'))}
        {/* Outer ring icons */}
        {OUTER_IDXS.map(idx => iconEl(idx, 'data-orbit-outer'))}
      </div>
    </div>
  );
}


/* ─── MAIN ─── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroDisplayed, setHeroDisplayed] = useState('');
  const [heroPhase, setHeroPhase] = useState('typing');
const { isSignedIn } = useAuth();
  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

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

  const goApp = () => { window.location.href = APP_URL; };
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <style>{FONTS + STYLES}</style>

      {/* NAV */}
      <nav className="nav" style={{ borderBottomColor: scrolled ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.05)" }}>
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
        <div className="nav-links">
          <a href="/how-it-works" className="nav-a">How it works</a>
          <a href="/pricing" className="nav-a">Pricing</a>
        </div>
        <div className="nav-right">
          {isSignedIn ? (
            <><button className="btn-pri" onClick={goApp}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
          ) : (
            <><button className="btn-ghost" onClick={() => window.location.href = SIGN_IN_URL}>Sign in</button><button className="btn-pri" onClick={() => window.location.href = SIGN_UP_URL}>Join the waitlist</button></>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-wrap">
        <RadarBg />
        <div className="hero-fade" />
        <div className="hero-content">
          <div style={{ display: 'inline-block', border: '1px solid rgba(107,71,245,0.3)', background: 'rgba(107,71,245,0.08)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontFamily: "'Space Mono',monospace", color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 20 }}>
            The intelligence layer for venture capital
          </div>
          <h1 className="hero-h1">Meet Reidar.<br />Your AI associate. <span className="acc">{heroDisplayed}<span className="typewriter-cursor">|</span></span></h1>
          <p className="hero-sub">Reidar sources deals, writes investment memos, and tracks your pipeline — all filtered through your firm's mandate and your personal judgment. It learns from every meeting, email, and decision you make, getting sharper without you doing any extra work.</p>
          <div className="hero-cta">
            <button className="btn-lg" onClick={() => window.location.href = SIGN_UP_URL}>Start for free →</button>
            <button className="btn-out" onClick={() => window.location.href = '/how-it-works'}>
              See how it works
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hero-stats">
            {[["5 min", "to teach it your mandate"], ["Every decision", "makes it sharper"], ["Personal to you", "not shared intelligence"]].map(([n, l]) => (
              <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <div className="tick-item" key={i}><span className="dyn-tick-dot" />{t}<span className="tick-sep">◆</span></div>
          ))}
        </div>
      </div>

      {/* MEET REIDAR */}
      <div className="wrap">
        <section className="sec">
          <div className="s-tag sr">Meet Reidar</div>
          <h2 className="s-h2 sr d1">Not a database. <em>A mind.</em></h2>
          <p className="s-p sr d2">You don't feed Reidar — it feeds itself. Take a founder call and the context is captured. Email a co-investor and the relationship is logged. Pass on a deal and the reasoning is remembered. Two investors at the same firm see different recommendations because Reidar learned different things from watching them work.</p>
          <div className="sr d3">
            <MockIntelligenceLayer />
          </div>
        </section>
      </div>

      <div className="divider" />

      {/* HOW IT WORKS */}
      <div className="wrap">
        <section id="how" className="sec">
          <div className="s-tag sr">The core loop</div>
          <h2 className="s-h2 sr d1">Six steps. <em>Runs every night.</em></h2>
          <p className="s-p sr d2">Every night Reidar sources, classifies, and scores. Your Coverage feed updates with only what matches your mandate — nothing else.</p>
          <div className="steps sr d3">
            {STEPS.map(s => (
              <div className="step" key={s.n}>
                <div className="step-n">{s.n}</div>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="divider" />

      {/* WHY RADAR */}
      <div className="wrap">
        <section id="why" className="sec">
          <div className="s-tag sr">The problem</div>
          <h2 className="s-h2 sr d1">Shared intelligence is <em>diminishing alpha.</em></h2>
          <p className="s-p sr d2">Every database, every signal platform, every market intelligence tool has the same structural problem: the more widely it's adopted, the less edge any single firm gets from it. Your alpha doesn't come from data everyone has access to. It comes from how your people see the market.</p>
          <div className="sr d3">
            <CompetitorGrid />
          </div>
        </section>
      </div>

      <div className="divider" />


      {/* PRODUCT PREVIEW */}
      <div className="wrap">
        <section id="product" className="sec">
          <div className="s-tag sr">The product</div>
          <h2 className="s-h2 sr d1">Your judgment. <em>Every screen.</em></h2>
          <p className="s-p sr d2">Every screen is shaped by your firm's context and your personal evaluation patterns. Not generic market data — intelligence that reflects how you actually invest.</p>
          <div className="sr d3">
            <ProductPreview />
          </div>
        </section>
      </div>

      <div className="divider" />

      {/* INTEGRATIONS */}
      <div className="wrap">
        <section className="sec">
          <div className="s-tag sr">Integrations</div>
          <h2 className="s-h2 sr d1">Sits on top of your <em>entire stack.</em></h2>
          <p className="s-p sr d2">Every tool your firm already uses becomes a learning signal. Reidar absorbs context from your CRM, your inbox, your meetings, and your data sources — so nothing falls through the cracks.</p>
          <div className="sr d3">
            <IntegrationsOrbit />
          </div>
          <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(235,235,235,.2)', fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}>
            More integrations on the roadmap. If your firm uses it, Reidar should plug into it.
          </p>
        </section>
      </div>

      {/* CTA */}
      <div className="cta-wrap sr">
        <h2 className="cta-h2">Your alpha.<br />Compounding from day one.</h2>
        <p className="cta-sub">No extra work. No manual logging. Just invest the way you already do — and let your edge compound.</p>
        <button className="btn-lg" onClick={() => window.location.href = SIGN_UP_URL}>Join the waitlist →</button>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="foot-l">© 2026 Reidar. The AI that learns how you invest.</div>
        <div className="foot-r">POWERED BY CLAUDE · ANTHROPIC</div>
      </footer>

</>
  );
}
