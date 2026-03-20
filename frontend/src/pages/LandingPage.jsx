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
              <div style={{ fontSize: 11, color: 'rgba(235,235,235,.4)', marginBottom: 10, lineHeight: 1.5 }}>Deploy research agents to unlock a full investment analysis.</div>
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
const TICKER_ITEMS = ["MANDATE-AWARE SOURCING","INSTITUTIONAL DEAL MEMORY","AI INVESTMENT MEMOS","PIPELINE TRACKING","NEVER MISS A COMPANY AGAIN","CONVERSATION INTELLIGENCE","RE-SURFACE AT THE RIGHT MOMENT","NIGHTLY AI SOURCING","RESEARCH AGENTS ON DEMAND","EMERGING FUND TOOLING","CONTEXT THAT COMPOUNDS"];
const STEPS = [
  { n:"01", t:"Reads your firm",               d:"Reidar reads your thesis and firm website — learning your mandate, portfolio, and what you care about." },
  { n:"02", t:"Sources nightly",               d:"At 4AM, AI-powered web search runs mandate-specific queries across the web to surface early-stage startups." },
  { n:"03", t:"Classifies",                    d:"Claude scores each company 1–5 against your thesis. Below threshold = never reaches your feed." },
  { n:"04", t:"Researches on demand",          d:"Deploy research agents on any company — full investment analysis, memo, recommended next step." },
  { n:"05", t:"Learns from every interaction", d:"Founder call notes, pipeline moves, passes, and deal context all feed back in. The more you use Reidar, the sharper the signal." },
  { n:"06", t:"Surfaces what matters",         d:"Pipeline company just raised? Company you passed on hit $5M ARR? Reidar flags it at the right moment." },
];
const COMPS = [
  { name:"Harmonic",   t:"Best-in-class data.",  c:"But it's a search engine. You bring the query, the context. It doesn't know what you've already seen — or what you passed on last year." },
  { name:"PitchBook",  t:"Institutional depth.", c:"$12K–$100K/yr. Built for brand-name funds, not emerging GPs. Won't remember what you told it last quarter." },
  { name:"Affinity",   t:"Tracks relationships.", c:"Knows who you know. Doesn't know what you've seen, what fits your mandate, or when to bring a company back." },
  { name:"Crunchbase", t:"Broad coverage.",      c:"A directory, not an analyst. Start from scratch every time." },
];

const INTEGRATIONS = [
  {
    name: "Gmail",
    desc: "Inbound founder pitches auto-detected and scored against your mandate",
    badge: "Early access",
    badgeColor: "#10b981",
    badgeBg: "rgba(16,185,129,.12)",
    badgeBorder: "rgba(16,185,129,.25)",
    iconBg: "rgba(234,67,53,.15)",
    iconBorder: "rgba(234,67,53,.4)",
  },
  {
    name: "Google Calendar",
    desc: "Meeting notes and founder interactions logged automatically",
    badge: "Coming soon",
    iconBg: "rgba(66,133,244,.15)",
    iconBorder: "rgba(66,133,244,.4)",
  },
  {
    name: "Slack",
    desc: "Deal alerts and weekly digests delivered where your team already works",
    badge: "Coming soon",
    iconBg: "rgba(224,30,90,.15)",
    iconBorder: "rgba(224,30,90,.4)",
  },
  {
    name: "Notion",
    desc: "Push investment memos and company briefs directly to your workspace",
    badge: "Coming soon",
    iconBg: "rgba(255,255,255,.08)",
    iconBorder: "rgba(255,255,255,.2)",
  },
  {
    name: "LinkedIn",
    desc: "Founder and team signals surfaced inline with company profiles",
    badge: "Coming soon",
    iconBg: "rgba(0,119,181,.15)",
    iconBorder: "rgba(0,119,181,.4)",
  },
  {
    name: "Crunchbase",
    desc: "Funding history and investor data enriched automatically",
    badge: "Coming soon",
    iconBg: "rgba(2,136,209,.15)",
    iconBorder: "rgba(2,136,209,.4)",
  },
];

const ORBIT_SVGS = [
  /* Gmail */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="#EA4335"/></svg>,
  /* Google Calendar */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" fill="#4285F4"/></svg>,
  /* Slack */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" fill="#E01E5A"/></svg>,
  /* Notion */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 3h4.5l9 13.5V3H21v18h-4.5L7.5 7.5V21H4V3z" fill="#ffffff"/></svg>,
  /* LinkedIn */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0077B5"/></svg>,
  /* Crunchbase */
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="12" width="5" height="8" rx="1" fill="#0288D1"/><rect x="9.5" y="7" width="5" height="13" rx="1" fill="#0288D1"/><rect x="17" y="4" width="5" height="16" rx="1" fill="#0288D1"/><line x1="2" y1="23" x2="22" y2="23" stroke="#0288D1" strokeWidth="1.5"/></svg>,
];

const HERO_PHRASES = [
  "every night.",
  "without prompting.",
  "before you wake up.",
  "across 100+ sources.",
  "precisely as written.",
];

const TRAITS = [
  { tag: "01 / READS YOUR FIRM", title: "Knows your mandate cold", desc: "Reidar reads your firm website, loads your portfolio automatically, and internalizes your thesis. He knows what you've backed, what you avoid, and what a 5/5 looks like for your mandate — before you brief him on anything." },
  { tag: "02 / NEVER FORGETS", title: "Every company stays in play", desc: "Reidar remembers every company you've ever seen, passed on, or noted. When a company that was too early six months ago closes a round or hits a milestone — he brings it back. Not everything. Just the right thing at the right moment." },
  { tag: "03 / CONVERSATION INTELLIGENCE", title: "Turns calls into deal flow", desc: "Drop in meeting notes or a rough transcript after a founder call. Reidar extracts the company context, scores it against your mandate, flags portfolio conflicts, and surfaces similar companies you've already seen. Thirty calls a week — none of them wasted." },
  { tag: "04 / LEARNS YOUR FIRM", title: "Gets sharper every deal", desc: "Every company you move through the pipeline, every pass, every note — Reidar is calibrating. Over time his sourcing reflects not just your written thesis, but your actual pattern of judgment. The longer you use it, the harder it is to replicate." },
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

function IntegrationsOrbit() {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const angleRef = useRef(0);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const R = 140;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const icons = container.querySelectorAll('[data-orbit-icon]');
    const SPEED = (Math.PI * 2) / (24 * 60);
    const animate = () => {
      angleRef.current += SPEED;
      icons.forEach((el, i) => {
        const a = angleRef.current + (i / INTEGRATIONS.length) * Math.PI * 2 - Math.PI / 2;
        el.style.transform = `translate(${Math.cos(a) * R}px, ${Math.sin(a) * R}px)`;
      });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
      <div ref={containerRef} style={{ position: 'relative', width: 340, height: 340 }}>
        {/* Orbit ring visual */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: R * 2, height: R * 2,
          marginTop: -R, marginLeft: -R,
          borderRadius: '50%',
          border: '1px solid rgba(107,71,245,.1)',
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
        {/* Icons */}
        {INTEGRATIONS.map((int, i) => (
          <div
            key={int.name}
            data-orbit-icon={i}
            style={{
              position: 'absolute',
              top: 'calc(50% - 22px)', left: 'calc(50% - 22px)',
              width: 44, height: 44,
              zIndex: 3,
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: int.iconBg || 'rgba(14,14,20,1)',
              border: `1px solid ${hoveredIdx === i ? 'rgba(107,71,245,.5)' : (int.iconBorder || 'rgba(255,255,255,.12)')}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transform: hoveredIdx === i ? 'scale(1.12)' : 'none',
              transition: 'transform .2s, border-color .2s, box-shadow .2s',
              boxShadow: hoveredIdx === i ? '0 0 16px rgba(107,71,245,.3)' : 'none',
            }}>
              {ORBIT_SVGS[i]}
            </div>
            {hoveredIdx === i && (
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
        ))}
      </div>
    </div>
  );
}

/* ─── MEET REIDAR PANELS ─── */

function TraitPanel1() {
  const [loopKey, setLoopKey] = useState(0);
  const [stage, setStage] = useState(0);
  const [pillsVis, setPillsVis] = useState(0);
  const portfolioCos = ["Synthos", "Waymark AI", "Corpora", "Viven"];
  useEffect(() => {
    setStage(0); setPillsVis(0);
    const t1 = setTimeout(() => setStage(1), 1200);
    const t2 = setTimeout(() => setStage(2), 2500);
    const t3 = setTimeout(() => setPillsVis(1), 2700);
    const t4 = setTimeout(() => setPillsVis(2), 3000);
    const t5 = setTimeout(() => setPillsVis(3), 3300);
    const t6 = setTimeout(() => setPillsVis(4), 3600);
    const t7 = setTimeout(() => setLoopKey(k => k + 1), 6000);
    return () => [t1,t2,t3,t4,t5,t6,t7].forEach(clearTimeout);
  }, [loopKey]);
  return (
    <div className="dyn-panel-inner">
      <div style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"8px 12px",display:"flex",alignItems:"center",gap:8,marginBottom:18 }}>
        <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,background:stage===0?"#facc15":"#4ade80",animation:stage===0?"pulse 1.2s infinite":"none",transition:"background .5s" }} />
        <span style={{ fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(235,235,235,.4)" }}>failupventures.com</span>
        {stage===0 && <span style={{ marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(235,235,235,.2)" }}>reading...</span>}
        {stage>=1 && <span style={{ marginLeft:"auto",fontFamily:"'DM Mono',monospace",fontSize:9,color:"#4ade80",animation:"dyn-fade-in .4s ease" }}>✓ parsed</span>}
      </div>
      {stage>=1 && (
        <div style={{ background:"rgba(107,71,245,.07)",border:"1px solid rgba(107,71,245,.18)",borderRadius:8,padding:"14px 16px",marginBottom:18,animation:"dyn-panel-in .35s ease" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(107,71,245,.6)",letterSpacing:".1em",marginBottom:8 }}>THESIS EXTRACTED</div>
          <div style={{ fontSize:12,color:"rgba(235,235,235,.65)",lineHeight:1.6 }}>AI-native B2B SaaS · regulated verticals · pre-seed / seed</div>
        </div>
      )}
      {stage>=2 && (
        <div style={{ animation:"dyn-panel-in .3s ease" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(235,235,235,.25)",letterSpacing:".1em",marginBottom:10 }}>PORTFOLIO LOADED</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
            {portfolioCos.map((co, i) => i < pillsVis && (
              <div key={co} style={{ padding:"5px 12px",borderRadius:20,background:"rgba(107,71,245,.1)",border:"1px solid rgba(107,71,245,.22)",fontSize:11,color:"#A992FA",animation:"dyn-panel-in .3s ease" }}>{co}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TraitPanel2() {
  const [loopKey, setLoopKey] = useState(0);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 1500);
    const t2 = setTimeout(() => setStage(2), 2900);
    const t3 = setTimeout(() => setLoopKey(k => k + 1), 5800);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [loopKey]);
  return (
    <div className="dyn-panel-inner">
      {stage>=1 && (
        <div style={{ background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:8,padding:"12px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start",animation:"dyn-slide-down .35s ease" }}>
          <div style={{ width:22,height:22,borderRadius:6,background:"rgba(34,197,94,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:13,color:"#4ade80" }}>↗</div>
          <div>
            <div style={{ fontSize:12,fontWeight:500,color:"#4ade80",marginBottom:3 }}>New signal — Meridian Health</div>
            <div style={{ fontSize:11,color:"rgba(235,235,235,.5)",lineHeight:1.5 }}>Closed a $3.2M seed round. Worth another look?</div>
          </div>
        </div>
      )}
      <div style={{ background:stage>=2?"rgba(34,197,94,.04)":"rgba(239,68,68,.04)",border:`1px solid ${stage>=2?"rgba(34,197,94,.2)":"rgba(239,68,68,.15)"}`,borderRadius:10,padding:"16px 18px",transition:"background .6s,border-color .6s" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:500,color:"#EBEBEB",marginBottom:3 }}>Meridian Health</div>
            <div style={{ fontSize:11,color:"rgba(235,235,235,.4)" }}>AI-native patient intake platform</div>
          </div>
          <div style={{ padding:"3px 9px",borderRadius:4,fontSize:10,fontFamily:"'DM Mono',monospace",background:stage>=2?"rgba(34,197,94,.12)":"rgba(239,68,68,.1)",color:stage>=2?"#4ade80":"#fca5a5",border:`1px solid ${stage>=2?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,transition:"all .6s ease",whiteSpace:"nowrap" }}>
            {stage>=2?"Active signal":"Passed · 6mo ago"}
          </div>
        </div>
        <div style={{ fontSize:11,color:"rgba(235,235,235,.35)",lineHeight:1.55 }}>Pre-seed · HealthTech · $3.2M seed closed</div>
        {stage>=2 && (
          <div style={{ marginTop:12,animation:"dyn-panel-in .4s ease" }}>
            <div style={{ display:"inline-flex",padding:"7px 14px",borderRadius:6,background:"#4ade80",color:"#07070A",fontSize:11,fontWeight:600,cursor:"pointer" }}>Re-evaluate →</div>
          </div>
        )}
      </div>
    </div>
  );
}

const P3_TEXT = "Spoke to Riya at NovaMed. AI for prior auth. Pre-seed, raising $1.5M. Ex-Stripe founder. Benchmark might be in.";
const P3_LINES = [
  { text: "NovaMed — Top Match · 5/5", color: "#4ade80" },
  { text: "AI-native, regulated vertical, pre-seed ✓", color: "rgba(235,235,235,.55)" },
  { text: "⚠ Overlaps with Synthos in your pipeline", color: "#facc15" },
  { text: "Benchmark signal → priority flag", color: "#A992FA" },
];

function TraitPanel3() {
  const [loopKey, setLoopKey] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [linesVis, setLinesVis] = useState(0);
  useEffect(() => {
    setCharIdx(0); setPhase(0); setLinesVis(0);
    let localChar = 0;
    const timers = [];
    const typeChar = () => {
      localChar++;
      setCharIdx(localChar);
      if (localChar >= P3_TEXT.length) {
        timers.push(setTimeout(() => {
          setPhase(1);
          timers.push(setTimeout(() => setLinesVis(1), 200));
          timers.push(setTimeout(() => setLinesVis(2), 420));
          timers.push(setTimeout(() => setLinesVis(3), 640));
          timers.push(setTimeout(() => setLinesVis(4), 860));
          timers.push(setTimeout(() => setLoopKey(k => k + 1), 4500));
        }, 400));
        return;
      }
      timers.push(setTimeout(typeChar, 28));
    };
    timers.push(setTimeout(typeChar, 28));
    return () => timers.forEach(clearTimeout);
  }, [loopKey]);
  return (
    <div className="dyn-panel-inner">
      {phase===0 && (
        <div>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(235,235,235,.25)",letterSpacing:".1em",marginBottom:8 }}>CALL NOTES</div>
          <div style={{ background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:14,minHeight:90 }}>
            <span style={{ fontSize:12,color:"rgba(235,235,235,.6)",lineHeight:1.65,fontFamily:"'DM Mono',monospace" }}>
              {P3_TEXT.slice(0,charIdx)}<span className="typewriter-cursor">|</span>
            </span>
          </div>
        </div>
      )}
      {phase>=1 && (
        <div style={{ animation:"dyn-panel-in .25s ease" }}>
          <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(107,71,245,.6)",letterSpacing:".1em",marginBottom:12 }}>STRUCTURED EXTRACTION</div>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {P3_LINES.map((line, i) => i<linesVis && (
              <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start",animation:"dyn-panel-in .25s ease" }}>
                <span style={{ color:line.color,flexShrink:0,marginTop:2,fontSize:13 }}>›</span>
                <span style={{ fontSize:12,color:line.color,lineHeight:1.5 }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const P4_INSIGHTS = [
  "Last 4 diligences: technical co-founder, enterprise background",
  "3 passes in InsurTech this month — sector fatigue signal",
  "Strongest pattern: pre-seed, 2-person team, ex-operator",
];

function TraitPanel4() {
  const [loopKey, setLoopKey] = useState(0);
  const [cardsVis, setCardsVis] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    setCardsVis(0); setFading(false);
    const t1 = setTimeout(() => setCardsVis(1), 300);
    const t2 = setTimeout(() => setCardsVis(2), 1200);
    const t3 = setTimeout(() => setCardsVis(3), 2100);
    const t4 = setTimeout(() => setFading(true), 4200);
    const t5 = setTimeout(() => setLoopKey(k => k + 1), 4800);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, [loopKey]);
  return (
    <div className="dyn-panel-inner" style={{ opacity:fading?0:1,transition:"opacity .5s ease" }}>
      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:9,color:"rgba(107,71,245,.5)",letterSpacing:".1em",marginBottom:16 }}>PATTERN LEARNED · THIS WEEK</div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {P4_INSIGHTS.map((insight, i) => i<cardsVis && (
          <div key={i} style={{ background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"14px 16px",animation:"dyn-panel-in .4s ease" }}>
            <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
              <div style={{ width:20,height:20,borderRadius:4,background:"rgba(107,71,245,.15)",border:"1px solid rgba(107,71,245,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <span style={{ fontSize:8,color:"#A992FA" }}>{String(i+1).padStart(2,'0')}</span>
              </div>
              <span style={{ fontSize:12,color:"rgba(235,235,235,.55)",lineHeight:1.55 }}>{insight}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MEET_CYCLE_MS = 5000;

function MeetReidarTabs() {
  const [active, setActive] = useState(0);
  const [panelKey, setPanelKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  useEffect(() => {
    if (paused) return;
    startRef.current = Date.now();
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(Math.min(100, ((Date.now() - startRef.current) / MEET_CYCLE_MS) * 100));
    }, 50);
    const t = setTimeout(() => {
      setActive(a => (a + 1) % TRAITS.length);
      setPanelKey(k => k + 1);
    }, MEET_CYCLE_MS);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [active, paused]);
  const select = (i) => {
    setActive(i);
    setPanelKey(k => k + 1);
    setProgress(0);
    startRef.current = Date.now();
    setPaused(false);
  };
  const Panels = [TraitPanel1, TraitPanel2, TraitPanel3, TraitPanel4];
  const Panel = Panels[active];
  return (
    <div className="dyn-shell" style={isMobile ? { minHeight: 480, overflow: 'hidden' } : {}} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="dyn-tabs">
        {TRAITS.map((t, i) => (
          <div key={t.tag} className={`dyn-tab${active===i?" dyn-active":""}`} onClick={() => select(i)}>
            <div className="dyn-tab-tag">{t.tag}</div>
            <div className="dyn-tab-title">{t.title}</div>
            <div className="dyn-tab-prog">
              <div className="dyn-tab-prog-bar" style={{ width:active===i?`${progress}%`:"0%" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="dyn-panel">
        <Panel key={panelKey} />
      </div>
    </div>
  );
}

/* ─── WAITLIST MODAL ─── */

function WaitlistModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [firmName, setFirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), firm_name: firmName.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d0d14',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 16,
          padding: '40px 36px',
          width: '100%',
          maxWidth: 440,
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(235,235,235,.4)', fontSize: 20, lineHeight: 1,
            padding: '4px 8px',
          }}
        >×</button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(16,185,129,.12)',
              border: '1px solid rgba(16,185,129,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f0f0ff', marginBottom: 10 }}>You're on the list.</div>
            <div style={{ fontSize: 14, color: 'rgba(235,235,235,.5)', lineHeight: 1.6 }}>We'll reach out soon.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0ff', marginBottom: 10, fontFamily: "'Playfair Display',serif" }}>
              Get early access to Reidar
            </div>
            <div style={{ fontSize: 14, color: 'rgba(235,235,235,.5)', lineHeight: 1.6, marginBottom: 28 }}>
              We're onboarding a small number of VC firms. Leave your email and we'll be in touch.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="email"
                placeholder="Work email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#f0f0ff',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="Firm name (optional)"
                value={firmName}
                onChange={e => setFirmName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#f0f0ff',
                  fontSize: 14,
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
              {error && <div style={{ fontSize: 13, color: '#ef4444' }}>{error}</div>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  marginTop: 4,
                  background: loading ? 'rgba(107,71,245,.5)' : '#6B47F5',
                  border: 'none',
                  borderRadius: 8,
                  padding: '13px 20px',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background .2s',
                }}
              >
                {loading ? 'Sending…' : 'Request access'}
              </button>
            </div>
          </>
        )}
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
  const [waitlistOpen, setWaitlistOpen] = useState(false);
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
          <a href="/#product" className="nav-a">Product</a>
          <a href="/pricing" className="nav-a">Pricing</a>
        </div>
        <div className="nav-right">
          {isSignedIn ? (
            <><button className="btn-pri" onClick={goApp}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
          ) : (
            <><button className="btn-ghost" onClick={() => window.location.href = SIGN_IN_URL}>Sign in</button><button className="btn-pri" onClick={() => setWaitlistOpen(true)}>Join the waitlist</button></>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-wrap">
        <RadarBg />
        <div className="hero-fade" />
        <div className="hero-content">
          <div style={{ display: 'inline-block', border: '1px solid rgba(107,71,245,0.3)', background: 'rgba(107,71,245,0.08)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontFamily: "'Space Mono',monospace", color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: 20 }}>
            Built for venture capital
          </div>
          <h1 className="hero-h1">Your mandate,<br />deployed. <span className="acc">{heroDisplayed}<span className="typewriter-cursor">|</span></span></h1>
          <p className="hero-sub">Reidar knows your mandate, sources every night, and never forgets a company. Every deal you've ever touched is always in play — surfaced at the right moment, with full context. Not a tool you use. An associate that works for you.</p>
          <div className="hero-cta">
            <button className="btn-lg" onClick={() => setWaitlistOpen(true)}>Start for free →</button>
            <button className="btn-out" onClick={() => window.location.href = '/how-it-works'}>
              See how it works
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hero-stats">
            {[["Nightly", "AI sourcing"], ["< 5 min", "to set up"], ["1–5", "thesis scoring"]].map(([n, l]) => (
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
          <h2 className="s-h2 sr d1">Not a database. <em>An associate.</em></h2>
          <p className="s-p sr d2">Reidar lives inside your firm's context. He knows your portfolio, your thesis, what you've passed on and why. By the time you open your coverage feed, he's already been working for hours.</p>
          <div className="sr d3">
            <MeetReidarTabs />
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
          <h2 className="s-h2 sr d1">Every tool makes you <em>go to it.</em> Then forgets what you found.</h2>
          <p className="s-p sr d2">Harmonic, PitchBook, Crunchbase — databases you search when you remember to look. None know your mandate. None track what you've already seen. None tell you when the moment on a company has arrived.</p>
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
          <h2 className="s-h2 sr d1">Six screens. <em>One associate.</em></h2>
          <p className="s-p sr d2">Everything a VC analyst does — built around your mandate. Hover to pause, click to explore.</p>
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
          <h2 className="s-h2 sr d1">Plugs into your world.</h2>
          <p className="s-p sr d2">Reidar connects to the tools you already use — so every inbound pitch, calendar meeting, and portfolio update flows into your deal intelligence automatically.</p>
          <div className="sr d3">
            <IntegrationsOrbit />
          </div>
          <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(235,235,235,.2)', fontFamily: "'Space Mono',monospace", letterSpacing: '.04em' }}>
            More integrations on the roadmap. Built for how emerging funds actually work.
          </p>
        </section>
      </div>

      {/* CTA */}
      <div className="cta-wrap sr">
        <h2 className="cta-h2">Your mandate.<br />Deployed tonight.</h2>
        <p className="cta-sub">Set up in two minutes. No credit card. Results on night one.</p>
        <button className="btn-lg" onClick={() => setWaitlistOpen(true)}>Join the waitlist →</button>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="foot-l">© 2026 Reidar. Built for emerging VC funds.</div>
        <div className="foot-r">POWERED BY CLAUDE · ANTHROPIC</div>
      </footer>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </>
  );
}
