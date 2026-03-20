import { useRef, useEffect } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');`;

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
  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

export default function Pricing() {
  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html { -webkit-font-smoothing:antialiased; }
        body { background:#0a0a0f; }
        @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <RadarBg />

        {/* Radial fade over the canvas */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 68% 62% at 50% 46%, transparent 25%, #0a0a0f 100%)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', padding: '0 24px',
        }}>
          {/* Wordmark */}
          <a href="/" style={{
            display: 'flex', alignItems: 'center', gap: 9,
            textDecoration: 'none', marginBottom: 56,
          }}>
            <div style={{ position: 'relative', width: 26, height: 26 }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 7,
                border: '1px solid rgba(107,71,245,.5)',
                animation: 'radarPing 2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 7,
                border: '1px solid rgba(107,71,245,.5)',
                animation: 'radarPing 2s ease-out infinite',
                animationDelay: '1s',
              }} />
              <div style={{
                position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: 7,
                background: '#6B47F5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1px rgba(107,71,245,.5), 0 0 16px rgba(107,71,245,.25)',
              }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
                  <circle cx="7" cy="7" r="2" fill="white"/>
                </svg>
              </div>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#EBEBEB', letterSpacing: '-.02em', fontFamily: "'Inter',sans-serif" }}>
              Reidar
            </span>
          </a>

          <h1 style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            color: '#f0f0ff',
            letterSpacing: '-.02em',
            lineHeight: 1.1,
            marginBottom: 18,
          }}>
            Pricing coming soon.
          </h1>

          <p style={{
            fontSize: 16,
            fontWeight: 300,
            color: 'rgba(235,235,235,.45)',
            lineHeight: 1.7,
            maxWidth: 400,
            marginBottom: 36,
            fontFamily: "'Inter',sans-serif",
          }}>
            We're onboarding a small number of VC firms. Join the waitlist to get early access.
          </p>

          <a href="/" style={{
            fontFamily: "'Inter',sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            background: '#6B47F5',
            border: 'none',
            borderRadius: 8,
            padding: '12px 24px',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 0 24px rgba(107,71,245,.4)',
            transition: 'background .15s, box-shadow .15s',
          }}>
            Join the waitlist →
          </a>
        </div>
      </div>
    </>
  );
}
