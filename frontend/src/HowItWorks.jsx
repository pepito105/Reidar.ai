import { useState, useEffect, useRef } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";

const APP_URL = "/app";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const STYLES = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; -webkit-font-smoothing:antialiased; }
  body { background:#07070A; color:#EBEBEB; font-family:'Inter',sans-serif; overflow-x:hidden; }

  .sr { opacity:0; transform:translateY(24px); transition:opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1); }
  .sr.show { opacity:1 !important; transform:none !important; }
  .d1{transition-delay:.08s}.d2{transition-delay:.18s}.d3{transition-delay:.28s}.d4{transition-delay:.38s}

  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes floatUp   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes scanline  { from{top:-100%} to{top:200%} }
  @keyframes typeIn    { from{width:0} to{width:100%} }
  @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes countUp   { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:none} }
  @keyframes shimmer   { from{background-position:200% center} to{background-position:-200% center} }
  @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }

  /* NAV */
  .nav { position:fixed;inset:0 0 auto;z-index:200;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,7,10,.9);backdrop-filter:blur(18px); }
  .nav-logo { display:flex;align-items:center;gap:9px;text-decoration:none; }
  .nav-mark-wrap { position:relative;width:26px;height:26px; }
  .nav-mark-ring { position:absolute;inset:0;width:26px;height:26px;border-radius:7px;border:1px solid rgba(107,71,245,.5);animation:radarPing 2s ease-out infinite; }
  .nav-mark-ring.nav-mark-ring-delay { animation-delay:1s; }
  .nav-mark { position:relative;z-index:1;width:26px;height:26px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(107,71,245,.5),0 0 16px rgba(107,71,245,.25); }
  .nav-name { font-size:15px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em; }
  .nav-center { position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:4px; }
  .nav-a { font-size:13px;color:rgba(235,235,235,.42);text-decoration:none;padding:5px 10px;border-radius:6px;transition:all .15s; }
  .nav-a:hover,.nav-a.active { color:#EBEBEB;background:rgba(255,255,255,.05); }
  .nav-a.active { color:#A992FA; }
  .nav-right { display:flex;align-items:center;gap:8px; }
  .btn-ghost { font:13px/1 'Inter',sans-serif;color:rgba(235,235,235,.6);background:transparent;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:7px;cursor:pointer;transition:all .15s; }
  .btn-ghost:hover { border-color:rgba(255,255,255,.22);color:#EBEBEB; }
  .btn-pri { font:13px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;transition:all .15s;box-shadow:0 0 18px rgba(107,71,245,.3); }
  .btn-pri:hover { background:#7D5CF7;box-shadow:0 0 28px rgba(107,71,245,.5); }

  /* PAGE HERO */
  .page-hero { padding:140px 40px 80px;text-align:center;max-width:760px;margin:0 auto;position:relative; }
  .page-label { font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.14em;color:#6B47F5;text-transform:uppercase;margin-bottom:18px;animation:fadeUp .5s .05s both; }
  .page-h1 { font-family:'Playfair Display',serif;font-size:clamp(32px,4.5vw,54px);font-weight:700;line-height:1.1;letter-spacing:-.02em;color:#EBEBEB;margin-bottom:18px;animation:fadeUp .55s .12s both; }
  .page-h1 em { font-style:italic;color:#A992FA; }
  .page-sub { font-size:16px;font-weight:300;color:rgba(235,235,235,.45);line-height:1.75;max-width:540px;margin:0 auto;animation:fadeUp .55s .2s both; }

  /* TIMELINE */
  .timeline { max-width:1000px;margin:0 auto;padding:40px 40px 80px;position:relative; }
  .tl-line { position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,transparent,rgba(107,71,245,.2) 8%,rgba(107,71,245,.2) 92%,transparent);transform:translateX(-50%); }

  /* STEPS */
  .step-block { display:grid;grid-template-columns:1fr 60px 1fr;gap:0;margin-bottom:0;position:relative; }
  .step-block:last-child .step-connector { display:none; }

  .step-side { padding:40px 40px; }
  .step-side.right { padding:40px 40px; }
  .step-side.empty { } /* spacer */

  .step-node { display:flex;flex-direction:column;align-items:center;gap:0;padding-top:44px; }
  .step-num { width:44px;height:44px;border-radius:50%;border:1px solid rgba(107,71,245,.35);background:rgba(107,71,245,.1);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:11px;color:#A992FA;letter-spacing:.05em;position:relative;z-index:2;flex-shrink:0; }
  .step-num::before { content:'';position:absolute;inset:-4px;border-radius:50%;border:1px solid rgba(107,71,245,.1); }
  .step-connector-line { flex:1;width:1px;background:rgba(107,71,245,.15);min-height:80px; }

  /* CARDS */
  .step-card { background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:28px;transition:border-color .2s; }
  .step-card:hover { border-color:rgba(107,71,245,.25); }
  .sc-time { font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;color:rgba(107,71,245,.5);text-transform:uppercase;margin-bottom:12px; }
  .sc-title { font-family:'Playfair Display',serif;font-size:18px;font-weight:600;color:#EBEBEB;letter-spacing:-.01em;margin-bottom:10px;line-height:1.2; }
  .sc-title em { font-style:italic;color:#A992FA;font-weight:400; }
  .sc-body { font-size:13px;color:rgba(235,235,235,.45);line-height:1.7;margin-bottom:18px; }

  /* MINI UI MOCKS inside cards */
  .mini-mock { border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.07); }
  .mm-chrome { height:28px;background:#111116;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;padding:0 10px;gap:5px; }
  .mm-dot { width:7px;height:7px;border-radius:50%; }
  .mm-body { background:#0C0C10;padding:12px; }

  /* onboarding form mock */
  .form-mock { display:flex;flex-direction:column;gap:8px; }
  .form-row { display:flex;flex-direction:column;gap:4px; }
  .form-label { font-family:'DM Mono',monospace;font-size:9px;color:rgba(235,235,235,.3);letter-spacing:.08em; }
  .form-input { height:28px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:5px;padding:0 10px;display:flex;align-items:center; }
  .form-input span { font-size:11px;color:rgba(235,235,235,.4); }
  .form-textarea { background:rgba(255,255,255,.04);border:1px solid rgba(107,71,245,.25);border-radius:5px;padding:8px 10px;font-size:11px;color:rgba(235,235,235,.55);line-height:1.5; }

  /* scraping mock */
  .scrape-rows { display:flex;flex-direction:column;gap:5px; }
  .scrape-row { display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04); }
  .scrape-row:last-child { border-bottom:none; }
  .scrape-dot { width:5px;height:5px;border-radius:50%;flex-shrink:0; }
  .scrape-name { font-size:11px;color:rgba(235,235,235,.5);flex:1; }
  .scrape-count { font-family:'DM Mono',monospace;font-size:9px;color:rgba(107,71,245,.7); }
  .scrape-status { font-size:9px;padding:1px 6px;border-radius:3px; }

  /* coverage mock */
  .cov-cards { display:flex;flex-direction:column;gap:6px; }
  .cov-card { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:9px 11px;display:flex;justify-content:space-between;align-items:flex-start;border-left-width:2px; }
  .cov-left {}
  .cov-name { font-size:12px;font-weight:500;color:#EBEBEB;margin-bottom:3px; }
  .cov-desc { font-size:10px;color:rgba(235,235,235,.38);line-height:1.45; }
  .cov-right { display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0; }
  .fit-badge { font-family:'DM Mono',monospace;font-size:8px;padding:2px 6px;border-radius:3px;white-space:nowrap; }

  /* memo mock */
  .memo-section { margin-bottom:10px; }
  .memo-label { font-family:'DM Mono',monospace;font-size:8px;color:rgba(107,71,245,.6);letter-spacing:.1em;margin-bottom:6px; }
  .memo-reasoning { font-size:11px;color:rgba(235,235,235,.5);line-height:1.6; }
  .score-bars { display:flex;flex-direction:column;gap:6px; }
  .score-row { display:flex;align-items:center;gap:8px; }
  .score-label { font-size:10px;color:rgba(235,235,235,.4);width:80px;flex-shrink:0; }
  .score-track { flex:1;height:3px;background:rgba(255,255,255,.06);border-radius:2px; }
  .score-fill { height:100%;border-radius:2px;background:#6B47F5; }

  /* pipeline mock */
  .pipe-cols { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
  .pipe-col {}
  .pipe-header { font-size:10px;font-weight:500;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.06); }
  .pipe-items { display:flex;flex-direction:column;gap:5px; }
  .pipe-item { background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:5px;padding:7px 9px;font-size:10px;color:rgba(235,235,235,.6); }

  /* notify mock */
  .notif { background:rgba(107,71,245,.08);border:1px solid rgba(107,71,245,.2);border-radius:8px;padding:14px;display:flex;gap:12px;align-items:flex-start; }
  .notif-icon { width:28px;height:28px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .notif-title { font-size:12px;font-weight:500;color:#EBEBEB;margin-bottom:4px; }
  .notif-body { font-size:11px;color:rgba(235,235,235,.45);line-height:1.5; }
  .notif-tag { display:inline-block;margin-top:6px;font-family:'DM Mono',monospace;font-size:8px;color:#4ade80;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.2);padding:1px 6px;border-radius:3px; }

  /* DIVIDER */
  .divider { height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);margin:0 40px; }

  /* BOTTOM CTA */
  .bottom-section { max-width:1160px;margin:0 auto;padding:96px 40px; }
  .ready-grid { display:grid;grid-template-columns:1fr 1fr;gap:1px;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden; }
  .ready-cell { padding:40px;background:rgba(255,255,255,.014); }
  .ready-cell:first-child { border-right:1px solid rgba(255,255,255,.06); }
  .ready-tag { font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.12em;color:rgba(107,71,245,.6);text-transform:uppercase;margin-bottom:14px; }
  .ready-h3 { font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#EBEBEB;letter-spacing:-.01em;line-height:1.2;margin-bottom:12px; }
  .ready-h3 em { font-style:italic;color:#A992FA;font-weight:400; }
  .ready-p { font-size:13px;color:rgba(235,235,235,.4);line-height:1.7;margin-bottom:24px; }
  .ready-steps { display:flex;flex-direction:column;gap:10px;margin-bottom:28px; }
  .ready-step { display:flex;align-items:flex-start;gap:12px; }
  .rs-num { width:20px;height:20px;border-radius:50%;background:rgba(107,71,245,.15);border:1px solid rgba(107,71,245,.25);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:8px;color:#A992FA;flex-shrink:0;margin-top:1px; }
  .rs-text { font-size:12px;color:rgba(235,235,235,.5);line-height:1.55; }
  .rs-text strong { color:rgba(235,235,235,.75);font-weight:500; }
  .btn-lg { font:15px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:13px 26px;border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:0 0 24px rgba(107,71,245,.4);display:inline-flex;align-items:center;gap:8px; }
  .btn-lg:hover { background:#7D5CF7;transform:translateY(-1px);box-shadow:0 0 36px rgba(107,71,245,.55); }

  /* FOOTER */
  .footer { border-top:1px solid rgba(255,255,255,.05);padding:24px 40px;display:flex;justify-content:space-between;align-items:center;max-width:1160px;margin:0 auto; }
  .foot-l { font-size:12px;color:rgba(235,235,235,.2); }
  .foot-r { font-family:'DM Mono',monospace;font-size:10px;color:rgba(235,235,235,.15);letter-spacing:.06em; }
  .foot-link { color:rgba(235,235,235,.3);text-decoration:none;font-size:12px; }
  .foot-link:hover { color:rgba(235,235,235,.6); }

  @media(max-width:800px) {
    .tl-line { display:none; }
    .step-block { grid-template-columns:1fr; }
    .step-node { display:none; }
    .step-side { padding:16px 20px; }
    .ready-grid { grid-template-columns:1fr; }
    .ready-cell:first-child { border-right:none;border-bottom:1px solid rgba(255,255,255,.06); }
    .timeline { padding:20px 20px 60px; }
    .pipe-cols { grid-template-columns:1fr;gap:6px; }
  }
  @media(max-width:640px) {
    .nav { padding:0 20px; }
    .nav-center { display:none; }
    .page-hero { padding:120px 24px 60px; }
    .footer { flex-direction:column;gap:12px;text-align:center;padding:24px; }
  }
`;

/* ─── SCROLL REVEAL ─── */
function useScrollReveal() {
  useEffect(() => {
    const check = () => {
      document.querySelectorAll(".sr:not(.show)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 60) el.classList.add("show");
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
}

/* ─── MINI MOCK COMPONENTS ─── */

function MockOnboarding() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/setup</span>
      </div>
      <div className="mm-body">
        <div style={{ marginBottom: 10, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(107,71,245,.6)", letterSpacing: ".1em" }}>FIRM SETUP · STEP 2 OF 3</div>
        <div className="form-mock">
          <div className="form-row">
            <div className="form-label">FIRM NAME</div>
            <div className="form-input"><span>Failup Ventures</span></div>
          </div>
          <div className="form-row">
            <div className="form-label">INVESTMENT THESIS</div>
            <div className="form-textarea">
              We invest in AI-native B2B SaaS companies automating knowledge work in regulated verticals — HealthTech, LegalTech, and FinTech at pre-seed and seed.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Pre-seed", "Seed", "Series A"].map((s, i) => (
              <div key={s} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontFamily: "'DM Mono',monospace", background: i < 2 ? "rgba(107,71,245,.2)" : "rgba(255,255,255,.04)", border: `1px solid ${i < 2 ? "rgba(107,71,245,.35)" : "rgba(255,255,255,.08)"}`, color: i < 2 ? "#A992FA" : "rgba(235,235,235,.3)" }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockScraping() {
  const sources = [
    { name: "AI Web Search (query 1)",  count: "+18",  status: "done",    color: "#4ade80" },
    { name: "AI Web Search (query 2)",  count: "+12",  status: "done",    color: "#4ade80" },
    { name: "AI Web Search (query 3)",  count: "+9",   status: "running", color: "#facc15" },
    { name: "AI Web Search (query 4)",  count: "+7",   status: "running", color: "#facc15" },
    { name: "AI Web Search (query 5)",  count: "+11",  status: "queued",  color: "#6366f1" },
  ];
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>nightly sourcing · 04:00 AM</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#facc15", animation: "pulse 1.2s infinite" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "#facc15" }}>RUNNING</span>
        </div>
      </div>
      <div className="mm-body">
        <div className="scrape-rows">
          {sources.map(s => (
            <div className="scrape-row" key={s.name}>
              <div className="scrape-dot" style={{ background: s.color }} />
              <div className="scrape-name">{s.name}</div>
              <div className="scrape-count">{s.count}</div>
              <div className="scrape-status" style={{
                background: s.status === "done" ? "rgba(74,222,128,.1)" : s.status === "running" ? "rgba(250,204,21,.1)" : "rgba(255,255,255,.04)",
                color: s.status === "done" ? "#4ade80" : s.status === "running" ? "#facc15" : "rgba(235,235,235,.25)",
                border: `1px solid ${s.status === "done" ? "rgba(74,222,128,.2)" : s.status === "running" ? "rgba(250,204,21,.2)" : "rgba(255,255,255,.07)"}`,
                fontFamily: "'DM Mono',monospace",
              }}>{s.status}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.25)" }}>83 companies found</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(107,71,245,.6)" }}>classifying with Claude →</span>
        </div>
      </div>
    </div>
  );
}

function MockClassify() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/learning</span>
      </div>
      <div className="mm-body">
        <div className="memo-section">
          <div className="memo-label">LEARNING FROM YOUR DECISIONS</div>
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 5, padding: "10px", marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { dot: "#4ade80", text: "✓ Passed on Nexora — 'TAM too narrow for our thesis'" },
              { dot: "#A992FA", text: "✓ Advanced Synthos — 'Strong technical founder, regulated wedge'" },
              { dot: "#f59e0b", text: "✓ Pattern detected: you consistently back technical founders in regulated verticals" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: row.dot, flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontSize: 11, color: "rgba(235,235,235,.55)", lineHeight: 1.5 }}>{row.text}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "rgba(235,235,235,.3)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>
            Reidar has captured <span style={{ color: "#A992FA" }}>47 decisions</span> · Profile confidence: <span style={{ color: "#A992FA" }}>72%</span>
          </div>
          <div style={{ fontSize: 10, color: "rgba(235,235,235,.3)", fontFamily: "'DM Mono',monospace" }}>
            PROFILE UPDATING → <span style={{ color: "#f59e0b" }}>investor lens sharpening</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCoverage() {
  const cos = [
    { name: "Synthos",    desc: "AI agents replacing clinical admin workflows", fit: "Top Match",   color: "#4ade80",  fitStyle: { bg: "rgba(34,197,94,.12)", color: "#4ade80", border: "rgba(34,197,94,.2)" } },
    { name: "Waymark AI", desc: "Contract intelligence for regulated industries", fit: "Top Match",  color: "#4ade80",  fitStyle: { bg: "rgba(34,197,94,.12)", color: "#4ade80", border: "rgba(34,197,94,.2)" } },
    { name: "Corpora",    desc: "Autonomous compliance docs for financial services", fit: "Strong Fit", color: "#818cf8", fitStyle: { bg: "rgba(99,102,241,.14)", color: "#818cf8", border: "rgba(99,102,241,.25)" } },
  ];
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/coverage</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, color: "#4ade80" }}>34 matched</span>
        </div>
      </div>
      <div className="mm-body">
        <div className="cov-cards">
          {cos.map(c => (
            <div className="cov-card" key={c.name} style={{ borderLeftColor: c.color }}>
              <div className="cov-left">
                <div className="cov-name">{c.name}</div>
                <div className="cov-desc">{c.desc}</div>
              </div>
              <div className="cov-right">
                <span className="fit-badge" style={{ background: c.fitStyle.bg, color: c.fitStyle.color, border: `1px solid ${c.fitStyle.border}` }}>{c.fit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockMemo() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/memo/synthos</span>
      </div>
      <div className="mm-body">
        <div className="memo-section">
          <div className="memo-label">THESIS FIT REASONING</div>
          <div className="memo-reasoning">Synthos directly addresses Failup's core thesis — AI-native automation in a regulated vertical. Clinical documentation is a $4B+ manual process ripe for disruption. The founding team has deep HealthTech operator experience.</div>
        </div>
        <div className="memo-section">
          <div className="memo-label">RECOMMENDED NEXT STEP</div>
          <div style={{ background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.15)", borderRadius: 5, padding: "8px 10px", fontSize: 11, color: "rgba(235,235,235,.6)", lineHeight: 1.6 }}>
            Request warm intro via <strong style={{ color: "#EBEBEB" }}>Index Ventures</strong>. Series A process beginning — move within 7 days.
          </div>
        </div>
      </div>
    </div>
  );
}

function MockNotification() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="notif">
        <div className="notif-icon">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="white" strokeWidth="1.2" fill="none"/>
            <circle cx="6" cy="6" r="1.5" fill="white"/>
          </svg>
        </div>
        <div>
          <div className="notif-title">Company you passed on just hit a milestone</div>
          <div className="notif-body">Meridian Health — you passed 8 months ago noting 'too early, no revenue.' They just announced $500K ARR and 3 enterprise pilots. Your original concern has been addressed.</div>
          <div className="notif-tag">↑ Re-evaluate</div>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(235,235,235,.45)" }}>Weekly brief ready — <span style={{ color: "#A992FA" }}>3 signals this week</span></div>
        <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.7)", cursor: "pointer" }}>View →</div>
      </div>
    </div>
  );
}

function MockParameters() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/setup · investor profile</span>
      </div>
      <div className="mm-body">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", letterSpacing: ".1em", marginBottom: 7 }}>YOUR EVALUATION PATTERNS</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["Technical founders", "Domain expertise", "Prior exits", "First-time founders"].map((s, i) => (
              <div key={s} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, background: i < 2 ? "rgba(107,71,245,.2)" : "rgba(255,255,255,.04)", border: `1px solid ${i < 2 ? "rgba(107,71,245,.35)" : "rgba(255,255,255,.08)"}`, color: i < 2 ? "#A992FA" : "rgba(235,235,235,.3)" }}>{s}</div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", letterSpacing: ".1em", marginBottom: 7 }}>DOMAINS YOU KNOW BEST</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["HealthTech", "LegalTech", "FinTech", "Developer Tools"].map((g, i) => (
              <div key={g} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, background: i < 2 ? "rgba(107,71,245,.2)" : "rgba(255,255,255,.04)", border: `1px solid ${i < 2 ? "rgba(107,71,245,.35)" : "rgba(255,255,255,.08)"}`, color: i < 2 ? "#A992FA" : "rgba(235,235,235,.3)" }}>{g}</div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", letterSpacing: ".1em", marginBottom: 7 }}>WHAT MAKES YOU PASS</div>
          <div className="form-textarea">
            No technical co-founder for a deep tech product. Horizontal positioning trying to serve everyone. Vision-heavy pitch with no current product.
          </div>
        </div>
      </div>
    </div>
  );
}

function MockFilters() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/setup · step 3 of 5</span>
      </div>
      <div className="mm-body">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", letterSpacing: ".1em", marginBottom: 7 }}>EXCLUDED SECTORS</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["crypto", "gambling", "defense", "hardware"].map((s, i) => (
              <div key={s} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10, background: i < 3 ? "rgba(127,29,29,.25)" : "rgba(255,255,255,.04)", border: `1px solid ${i < 3 ? "rgba(239,68,68,.25)" : "rgba(255,255,255,.08)"}`, color: i < 3 ? "#fca5a5" : "rgba(235,235,235,.3)" }}>{s}</div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(235,235,235,.3)", letterSpacing: ".1em", marginBottom: 10 }}>MINIMUM FIT THRESHOLD</div>
          <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,.08)", borderRadius: 999, marginBottom: 8 }}>
            <div style={{ position: "absolute", left: 0, width: "75%", height: "100%", background: "linear-gradient(90deg,#6B47F5,#A992FA)", borderRadius: 999 }} />
            <div style={{ position: "absolute", left: "73%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#A992FA", border: "2px solid #fff", boxShadow: "0 0 8px rgba(107,71,245,.6)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            {[1,2,3,4,5].map(n => <span key={n} style={{ fontSize: 9, fontFamily: "'DM Mono',monospace", color: n === 4 ? "#A992FA" : "rgba(235,235,235,.2)" }}>{n}</span>)}
          </div>
          <div style={{ background: "rgba(107,71,245,.08)", border: "1px solid rgba(107,71,245,.2)", borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 11, color: "#A992FA", fontWeight: 600, marginBottom: 2 }}>Strong Fit and above (4+)</div>
            <div style={{ fontSize: 10, color: "rgba(235,235,235,.35)", lineHeight: 1.5 }}>High conviction only. Expect fewer but stronger matches.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockPortfolio() {
  const cos = ["Synthos", "Waymark AI", "Corpora", "Viven", "Coplay", "Sointu"];
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/setup · step 4 of 5</span>
      </div>
      <div className="mm-body">
        <div style={{ background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 8, padding: "12px 14px", textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>✓</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", marginBottom: 2 }}>29 companies imported</div>
          <div style={{ fontSize: 10, color: "rgba(235,235,235,.35)" }}>Your portfolio is loaded as sourcing context</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cos.map((c, i) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", background: "rgba(255,255,255,.025)", borderRadius: 5, opacity: 1 - i * 0.12 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(107,71,245,.5)", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "rgba(235,235,235,.6)" }}>{c}</span>
              <span style={{ marginLeft: "auto", fontSize: 9, fontFamily: "'DM Mono',monospace", color: "rgba(107,71,245,.5)", background: "rgba(107,71,245,.08)", padding: "2px 6px", borderRadius: 3 }}>portfolio</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockNotifSetup() {
  return (
    <div className="mini-mock">
      <div className="mm-chrome">
        <div className="mm-dot" style={{ background: "#FF5F57" }} />
        <div className="mm-dot" style={{ background: "#FFBD2E" }} />
        <div className="mm-dot" style={{ background: "#28C840" }} />
        <span style={{ marginLeft: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "rgba(235,235,235,.2)" }}>reidar.ai/setup · step 5 of 5</span>
      </div>
      <div className="mm-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
          {[
            { label: "Daily top matches", desc: "New companies above your threshold", on: true },
            { label: "Diligence signals", desc: "Pipeline companies get new funding or press", on: true },
            { label: "Weekly market brief", desc: "Monday summary of your thesis areas", on: true },
          ].map(({ label, desc, on }) => (
            <div key={label} style={{ background: on ? "rgba(107,71,245,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${on ? "rgba(107,71,245,.25)" : "rgba(255,255,255,.07)"}`, borderRadius: 8, padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: on ? "#EBEBEB" : "rgba(235,235,235,.4)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: "rgba(235,235,235,.3)" }}>{desc}</div>
              </div>
              <div style={{ width: 28, height: 16, borderRadius: 999, background: on ? "#6B47F5" : "rgba(255,255,255,.08)", position: "relative", flexShrink: 0, marginLeft: 10 }}>
                <div style={{ position: "absolute", top: 2, left: on ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: "100%", padding: "11px 0", borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", boxShadow: "0 0 18px rgba(107,71,245,.35)" }}>
          🚀 Launch Reidar
        </div>
      </div>
    </div>
  );
}

/* ─── STORY STEPS ─── */
const STORY = [
  {
    time: "Step 1 · ~2 minutes",
    title: <>Define your firm's <em>mandate.</em></>,
    body: "Start with your firm name and investment thesis in plain English. Add your stage focus, geography, check size, and sectors to exclude. This becomes the firm-level filter that every company is scored against — but it's just the beginning.",
    side: "left",
    Mock: MockOnboarding,
  },
  {
    time: "Step 2 · ~3 minutes",
    title: <>Build your <em>investor profile.</em></>,
    body: "This is what makes Reidar different. Tell it about your personal evaluation patterns — what types of founders you back, what signals you trust, what you've passed on and why. Upload past deals or describe your track record. Two partners at the same firm will get different recommendations because they think differently.",
    side: "right",
    Mock: MockParameters,
  },
  {
    time: "Step 3 · ~2 minutes",
    title: <>Import your <em>history.</em></>,
    body: "Upload a CSV of companies you've evaluated, connect your CRM, or paste your portfolio. Every past decision — investments, passes, watchlist companies — gives Reidar context that no database has. The more history you provide, the smarter it is from day one.",
    side: "left",
    Mock: MockPortfolio,
  },
  {
    time: "Step 4 · ~1 minute",
    title: <>Set your <em>signal preferences.</em></>,
    body: "Choose your minimum fit threshold and what Reidar alerts you about: new companies above threshold, milestone changes on companies you've passed on, pipeline signals, and a weekly brief. Then hit Launch — your first sourcing run starts immediately.",
    side: "right",
    Mock: MockNotifSetup,
  },
  {
    time: "Every interaction, automatically",
    title: <>Reidar <em>keeps learning.</em></>,
    body: "This is where it compounds. Take a founder call — Reidar captures the context. Send a follow-up email — the touchpoint is logged. Pass on a deal — the reasoning is remembered. You don't change how you work. You don't fill out forms or log activities. Reidar watches your normal workflow and learns from it. After 30 days, it's measurably smarter than day one. After 6 months, it knows your patterns better than you do.",
    side: "left",
    Mock: MockClassify,
  },
  {
    time: "Every morning",
    title: <>Context that <em>no one else has.</em></>,
    body: "This context exists because Reidar was silently learning from 6 months of your meetings, emails, and decisions. No database has it. No competitor can scrape it. A company you passed on 8 months ago just hit a milestone? Reidar remembers what you said in that call and shows you what changed. A deal heading to IC? Reidar tells you what objections to expect — because it was there for every conversation that shaped your firm's judgment.",
    side: "right",
    Mock: MockNotification,
  },
];

/* ─── MAIN ─── */
export default function HowItWorks() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn } = useAuth();
  useScrollReveal();
  useEffect(() => {
    document.title = "How Reidar Works — AI Deal Sourcing for VC Firms";
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', "See how Reidar autonomously sources startups, scores them against your mandate, and generates investment memos — all without manual effort.");
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
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
          <a href="/how-it-works" className="nav-a active">How it works</a>
          <a href="/pricing" className="nav-a">Pricing</a>
        </div>
        <div className="nav-right">
          {isSignedIn ? (
            <><button className="btn-pri" onClick={goApp}>Go to Reidar →</button><UserButton afterSignOutUrl="/" /></>
          ) : (
            <><button className="btn-ghost" onClick={goApp}>Sign in</button><button className="btn-pri" onClick={goApp}>Get started</button></>
          )}
        </div>
      </nav>

      {/* PAGE HERO */}
      <div className="page-hero">
        <div className="page-label">How it works</div>
        <h1 className="page-h1">Teach it once. It <em>never stops learning.</em></h1>
        <p className="page-sub">Reidar learns your firm's mandate and your personal patterns during a 10-minute setup. After that, it learns from your normal workflow — meetings, emails, pipeline decisions — without you lifting a finger.</p>
      </div>

      {/* TIMELINE */}
      <div className="timeline">
        <div className="tl-line" />

        {STORY.map((s, i) => {
          const isLeft = s.side === "left";
          const { Mock } = s;
          return (
            <div className="step-block" key={i}>
              {/* Left cell */}
              <div className={`step-side ${isLeft ? "" : "empty"} sr d1`}>
                {isLeft && (
                  <div className="step-card">
                    <div className="sc-time">{s.time}</div>
                    <div className="sc-title">{s.title}</div>
                    <div className="sc-body">{s.body}</div>
                    <Mock />
                  </div>
                )}
              </div>

              {/* Center node */}
              <div className="step-node">
                <div className="step-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="step-connector-line" />
              </div>

              {/* Right cell */}
              <div className={`step-side right ${!isLeft ? "" : "empty"} sr d2`}>
                {!isLeft && (
                  <div className="step-card">
                    <div className="sc-time">{s.time}</div>
                    <div className="sc-title">{s.title}</div>
                    <div className="sc-body">{s.body}</div>
                    <Mock />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="divider" />

      {/* BOTTOM CTA */}
      <div className="bottom-section">
        <div className="ready-grid sr">
          <div className="ready-cell">
            <div className="ready-tag">Get started</div>
            <h3 className="ready-h3">Ready to teach it <em>how you invest?</em></h3>
            <p className="ready-p">Four steps to teach Reidar your mandate and your patterns. After that, it learns from your normal workflow — no logging, no data entry, no extra work. Your edge compounds just by doing your job.</p>
            <div className="ready-steps">
              {[
                ["Define your mandate", "Your firm's thesis in plain English — the firm-level filter every company is scored against."],
                ["Build your investor profile", "Your personal patterns, what you back, what you pass on. Your lens, not your firm's."],
                ["Import your history", "Past deals, portfolio, evaluated companies. The more context, the smarter day one."],
                ["Set signal preferences", "Fit threshold, alert types, weekly brief. Hit Launch — first run starts immediately."],
                ["Every interaction teaches it", "Passes, advances, notes, conversations. 30 days in, it's measurably sharper."],
                ["Context compounds daily", "Right company, right moment. Resurfaced when the reason you passed is resolved."],
              ].map(([title, desc], i) => (
                <div className="ready-step" key={i}>
                  <div className="rs-num">{i + 1}</div>
                  <div className="rs-text"><strong>{title}</strong> — {desc}</div>
                </div>
              ))}
            </div>
            <button className="btn-lg" onClick={goApp}>
              Start for free →
            </button>
          </div>
          <div className="ready-cell" style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "radial-gradient(ellipse 80% 80% at 50% 100%,rgba(107,71,245,.07),transparent 70%)" }}>
            <div style={{ textAlign: "center", padding: "20px" }}>
              {[
                ["10 min", "to teach it your mandate and profile"],
                ["30 days", "until it's measurably smarter than day one"],
                ["every decision", "compounds your investor lens"],
                ["yours alone", "context no other firm has access to"],
              ].map(([n, l]) => (
                <div key={l} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 36, fontWeight: 600, color: "#EBEBEB", letterSpacing: "-.03em", lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 12, color: "rgba(235,235,235,.3)", marginTop: 6 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
