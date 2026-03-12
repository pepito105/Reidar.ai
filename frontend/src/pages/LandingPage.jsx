import { useState, useEffect, useRef } from "react";

const APP_URL = "/app";

const fonts = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
`;

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { background: #080808; color: #E8E4DC; font-family: 'DM Sans', sans-serif; font-weight: 300; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes scrollTicker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  .animate-fadeUp { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-fadeIn { animation: fadeIn 0.6s ease both; }

  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px; height: 64px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(8,8,8,0.85);
    backdrop-filter: blur(16px);
  }
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Instrument Serif', serif; font-size: 20px; color: #E8E4DC;
    text-decoration: none;
  }
  .nav-logo-mark {
    width: 28px; height: 28px; border-radius: 6px;
    background: #7C5CFC; display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .nav-links { display: flex; align-items: center; gap: 32px; }
  .nav-link {
    font-size: 13px; color: rgba(232,228,220,0.5); text-decoration: none;
    letter-spacing: 0.02em; transition: color 0.2s;
  }
  .nav-link:hover { color: #E8E4DC; }
  .btn-primary {
    background: #7C5CFC; color: #fff; border: none; cursor: pointer;
    padding: 8px 20px; border-radius: 6px; font-size: 13px;
    font-family: 'DM Sans', sans-serif; font-weight: 400; letter-spacing: 0.01em;
    transition: background 0.2s, transform 0.1s;
  }
  .btn-primary:hover { background: #9070FF; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-ghost {
    background: transparent; color: rgba(232,228,220,0.7); border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer; padding: 8px 20px; border-radius: 6px; font-size: 13px;
    font-family: 'DM Sans', sans-serif; font-weight: 400; letter-spacing: 0.01em;
    transition: all 0.2s;
  }
  .btn-ghost:hover { border-color: rgba(255,255,255,0.25); color: #E8E4DC; }

  .hero {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 120px 24px 80px; text-align: center;
    position: relative; overflow: hidden;
  }
  .hero-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(124,92,252,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(124,92,252,0.04) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%);
  }
  .hero-glow {
    position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 300px; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(124,92,252,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 5px 14px; border-radius: 100px;
    border: 1px solid rgba(124,92,252,0.3);
    background: rgba(124,92,252,0.08);
    font-size: 12px; color: #A78BFA; letter-spacing: 0.06em;
    font-family: 'DM Mono', monospace; margin-bottom: 32px;
  }
  .badge-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #7C5CFC; animation: pulse 2s ease infinite;
  }
  .hero-headline {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(48px, 8vw, 96px);
    line-height: 1.0; color: #E8E4DC;
    letter-spacing: -0.02em; margin-bottom: 8px;
    max-width: 900px;
  }
  .hero-headline em {
    font-style: italic; color: #A78BFA;
  }
  .hero-sub {
    font-size: clamp(16px, 2vw, 20px); color: rgba(232,228,220,0.5);
    max-width: 560px; line-height: 1.6; margin: 24px auto 48px;
    font-weight: 300;
  }
  .hero-cta { display: flex; align-items: center; gap: 16px; justify-content: center; }
  .btn-primary-lg {
    background: #7C5CFC; color: #fff; border: none; cursor: pointer;
    padding: 14px 32px; border-radius: 8px; font-size: 15px;
    font-family: 'DM Sans', sans-serif; font-weight: 400;
    transition: all 0.2s; letter-spacing: 0.01em;
  }
  .btn-primary-lg:hover { background: #9070FF; transform: translateY(-1px); }
  .btn-ghost-lg {
    background: transparent; color: rgba(232,228,220,0.6);
    border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
    padding: 14px 32px; border-radius: 8px; font-size: 15px;
    font-family: 'DM Sans', sans-serif; font-weight: 400; transition: all 0.2s;
  }
  .btn-ghost-lg:hover { border-color: rgba(255,255,255,0.25); color: #E8E4DC; }

  .ticker {
    width: 100%; overflow: hidden;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 14px 0;
    background: rgba(255,255,255,0.01);
  }
  .ticker-inner {
    display: flex; gap: 0;
    animation: scrollTicker 30s linear infinite;
    width: max-content;
  }
  .ticker-item {
    display: flex; align-items: center; gap: 10px;
    padding: 0 40px; white-space: nowrap;
    font-family: 'DM Mono', monospace; font-size: 11px;
    color: rgba(232,228,220,0.3); letter-spacing: 0.08em;
  }
  .ticker-sep { color: rgba(124,92,252,0.5); }

  .section { padding: 120px 48px; max-width: 1100px; margin: 0 auto; }
  .section-label {
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.12em;
    color: #7C5CFC; text-transform: uppercase; margin-bottom: 24px;
  }
  .section-headline {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(36px, 5vw, 56px); line-height: 1.1;
    color: #E8E4DC; letter-spacing: -0.02em; margin-bottom: 24px;
  }
  .section-headline em { font-style: italic; color: rgba(232,228,220,0.5); }

  .problem-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
    border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    overflow: hidden; margin-top: 64px;
  }
  .problem-cell {
    padding: 40px; background: rgba(255,255,255,0.02);
    border-right: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .problem-cell:nth-child(2n) { border-right: none; }
  .problem-cell:nth-last-child(-n+2) { border-bottom: none; }
  .problem-tool {
    font-family: 'DM Mono', monospace; font-size: 12px;
    color: rgba(232,228,220,0.3); letter-spacing: 0.06em; margin-bottom: 12px;
  }
  .problem-verdict {
    font-size: 15px; color: rgba(232,228,220,0.7); line-height: 1.5;
  }
  .problem-verdict strong { color: #E8E4DC; font-weight: 500; }

  .features-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
    border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;
    overflow: hidden; margin-top: 64px;
  }
  .feature-card {
    padding: 36px 32px; background: rgba(255,255,255,0.01);
    border-right: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.2s;
  }
  .feature-card:hover { background: rgba(124,92,252,0.04); }
  .feature-card:nth-child(3n) { border-right: none; }
  .feature-card:nth-last-child(-n+3) { border-bottom: none; }
  .feature-num {
    font-family: 'DM Mono', monospace; font-size: 11px;
    color: rgba(124,92,252,0.6); letter-spacing: 0.1em; margin-bottom: 20px;
  }
  .feature-title {
    font-size: 17px; color: #E8E4DC; font-weight: 400; margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .feature-desc { font-size: 14px; color: rgba(232,228,220,0.45); line-height: 1.6; }

  .loop-section { padding: 120px 48px; background: rgba(255,255,255,0.01); }
  .loop-inner { max-width: 1100px; margin: 0 auto; }
  .loop-steps {
    display: flex; align-items: flex-start; gap: 0;
    margin-top: 64px; position: relative;
  }
  .loop-step { flex: 1; position: relative; padding: 0 20px; text-align: center; }
  .loop-step-num {
    width: 36px; height: 36px; border-radius: 50%;
    border: 1px solid rgba(124,92,252,0.3);
    background: rgba(124,92,252,0.08);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Mono', monospace; font-size: 12px; color: #A78BFA;
    margin: 0 auto 16px;
  }
  .loop-step-title { font-size: 15px; color: #E8E4DC; margin-bottom: 8px; font-weight: 400; }
  .loop-step-desc { font-size: 13px; color: rgba(232,228,220,0.4); line-height: 1.5; }
  .loop-arrow {
    position: absolute; right: -12px; top: 9px;
    color: rgba(124,92,252,0.3); font-size: 18px; z-index: 1;
  }

  .quote-section { padding: 80px 48px; max-width: 800px; margin: 0 auto; text-align: center; }
  .quote-mark { font-family: 'Instrument Serif', serif; font-size: 80px; color: rgba(124,92,252,0.2); line-height: 0.5; margin-bottom: 32px; }
  .quote-text {
    font-family: 'Instrument Serif', serif; font-size: clamp(24px, 3vw, 36px);
    color: rgba(232,228,220,0.8); line-height: 1.3; letter-spacing: -0.01em;
    font-style: italic;
  }
  .quote-source { margin-top: 32px; font-size: 13px; color: rgba(232,228,220,0.3); letter-spacing: 0.04em; }

  .cta-section {
    margin: 0 48px 120px;
    border: 1px solid rgba(124,92,252,0.2);
    border-radius: 16px; padding: 80px;
    background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(124,92,252,0.08) 0%, transparent 70%);
    text-align: center; position: relative; overflow: hidden;
  }
  .cta-headline {
    font-family: 'Instrument Serif', serif;
    font-size: clamp(36px, 5vw, 56px); line-height: 1.1;
    color: #E8E4DC; letter-spacing: -0.02em; margin-bottom: 20px;
  }
  .cta-sub { font-size: 16px; color: rgba(232,228,220,0.45); margin-bottom: 40px; }

  .footer {
    border-top: 1px solid rgba(255,255,255,0.06);
    padding: 32px 48px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .footer-left { font-size: 13px; color: rgba(232,228,220,0.25); }
  .footer-right { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(232,228,220,0.2); letter-spacing: 0.06em; }

  @media (max-width: 768px) {
    .nav { padding: 0 24px; }
    .nav-links { display: none; }
    .section { padding: 80px 24px; }
    .problem-grid { grid-template-columns: 1fr; }
    .problem-cell:nth-child(2n) { border-right: none; }
    .features-grid { grid-template-columns: 1fr; }
    .feature-card:nth-child(3n) { border-right: none; }
    .loop-steps { flex-direction: column; gap: 32px; }
    .loop-arrow { display: none; }
    .cta-section { margin: 0 24px 80px; padding: 48px 24px; }
    .footer { flex-direction: column; gap: 16px; text-align: center; }
  }
`;

const tickerItems = [
  "MANDATE-AWARE SOURCING", "AI INVESTMENT MEMOS", "PIPELINE TRACKING",
  "MARKET INTELLIGENCE", "HOT SIGNALS", "232+ COMPANIES TRACKED",
  "THESIS-FIRST FILTERING", "AUTONOMOUS RESEARCH", "VC DEAL FLOW",
  "CLAUDE-POWERED ANALYSIS", "EMERGING FUND TOOLING", "AI-NATIVE ASSOCIATE",
];

const features = [
  { num: "01", title: "Coverage Feed", desc: "Companies sorted by thesis fit. Every card scored 1–5 against your mandate. Only what fits surfaces." },
  { num: "02", title: "Investment Memos", desc: "Click any company and get a full AI-generated memo — thesis fit reasoning, business model, team signals, recommended next step." },
  { num: "03", title: "Deal Pipeline", desc: "Kanban board from Watching to Invested. Drag and drop. Add notes, log outreach, track every deal in one place." },
  { num: "04", title: "Market Map", desc: "See where capital is clustering in your thesis areas. Funding stage breakdowns, sector counts, week-over-week volume." },
  { num: "05", title: "Hot Signals", desc: "Weekly brief generated for your firm. What's moving in your thesis, standout companies, whitespace opportunities." },
  { num: "06", title: "AI Analyst Chat", desc: "Ask anything. What came in this week that fits our fintech thesis? Find companies similar to X. It knows everything." },
];

const competitors = [
  { name: "Harmonic", verdict: "Best-in-class data.", caveat: "Generic. Not mandate-aware. $$$." },
  { name: "PitchBook", verdict: "Institutional depth.", caveat: "$12K–$100K/yr. Not for early-stage discovery." },
  { name: "Affinity", verdict: "Dominant VC CRM.", caveat: "Relationship tool, not a sourcing tool." },
  { name: "Crunchbase", verdict: "Broad coverage.", caveat: "Shallow. Descriptive, not predictive." },
];

const loop = [
  { step: "01", title: "Scrape", desc: "YC, ProductHunt, 13 RSS feeds, Brave signals" },
  { step: "02", title: "Classify", desc: "Claude scores AI-nativeness, vertical, thesis tags" },
  { step: "03", title: "Filter", desc: "Mandate match score 1–5. Below threshold, invisible." },
  { step: "04", title: "Surface", desc: "Only relevant deals reach your feed, sorted by fit" },
  { step: "05", title: "Track", desc: "Pipeline, notes, outreach log per company" },
  { step: "06", title: "Decide", desc: "Full memo, comparable companies, recommended next step" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLaunch = () => { window.location.href = APP_URL; };

  return (
    <>
      <style>{fonts}</style>
      <style>{styles}</style>

      {/* Nav */}
      <nav className="nav" style={{ borderBottomColor: scrolled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)" }}>
        <a href="/" className="nav-logo">
          <div className="nav-logo-mark">◈</div>
          Radar
        </a>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#why-radar" className="nav-link">Why Radar</a>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={handleLaunch}>Sign in</button>
          <button className="btn-primary" onClick={handleLaunch}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <div className="hero-badge animate-fadeIn" style={{ animationDelay: "0.1s" }}>
          <div className="badge-dot" />
          Powered by Claude — Anthropic
        </div>
        <h1 className="hero-headline animate-fadeUp" style={{ animationDelay: "0.2s" }}>
          Your <em>AI investment</em><br />associate
        </h1>
        <p className="hero-sub animate-fadeUp" style={{ animationDelay: "0.35s" }}>
          Radar sources, classifies, and scores startups against your firm's mandate — continuously. Not a database. An associate that never sleeps.
        </p>
        <div className="hero-cta animate-fadeUp" style={{ animationDelay: "0.5s" }}>
          <button className="btn-primary-lg" onClick={handleLaunch}>Start for free →</button>
          <button className="btn-ghost-lg" onClick={() => document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" })}>
            See how it works
          </button>
        </div>
      </section>

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div className="ticker-item" key={i}>
              {item}
              <span className="ticker-sep">◈</span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem Section */}
      <section id="why-radar" className="section">
        <div className="section-label">The problem</div>
        <h2 className="section-headline">
          Every tool makes you<br /><em>go to it.</em> Radar works for you.
        </h2>
        <p style={{ fontSize: 16, color: "rgba(232,228,220,0.45)", maxWidth: 560, lineHeight: 1.7 }}>
          The existing tools in this space are databases you search. Radar is different — it knows your mandate and works continuously on your behalf.
        </p>
        <div className="problem-grid">
          {competitors.map((c) => (
            <div className="problem-cell" key={c.name}>
              <div className="problem-tool">{c.name}</div>
              <div className="problem-verdict">
                <strong>{c.verdict}</strong> {c.caveat}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="loop-section">
        <div className="loop-inner">
          <div className="section-label">The core loop</div>
          <h2 className="section-headline">Six steps. Runs every night.</h2>
          <div className="loop-steps">
            {loop.map((s, i) => (
              <div className="loop-step" key={s.step}>
                <div className="loop-step-num">{s.step}</div>
                <div className="loop-step-title">{s.title}</div>
                <div className="loop-step-desc">{s.desc}</div>
                {i < loop.length - 1 && <div className="loop-arrow">›</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <div className="quote-section">
        <div className="quote-mark">"</div>
        <p className="quote-text">
          The analyst that never sleeps — already knows your mandate, already found something this week.
        </p>
        <p className="quote-source">RADAR — AI INVESTMENT ASSOCIATE</p>
      </div>

      {/* Features */}
      <section id="features" className="section">
        <div className="section-label">The product</div>
        <h2 className="section-headline">Five screens.<br /><em>One associate.</em></h2>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.num}>
              <div className="feature-num">{f.num}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section">
        <h2 className="cta-headline">Your mandate.<br />Your pipeline.<br />Your associate.</h2>
        <p className="cta-sub">Set up in two minutes. No credit card required.</p>
        <button className="btn-primary-lg" onClick={handleLaunch}>
          Get started free →
        </button>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          © 2026 Radar. Built for emerging VC funds.
        </div>
        <div className="footer-right">
          POWERED BY CLAUDE · ANTHROPIC
        </div>
      </footer>
    </>
  );
}
