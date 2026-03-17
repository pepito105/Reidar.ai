import { useState } from "react";

const APP_URL = "/app";
const SIGN_UP_URL = "/sign-up";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

const STYLES = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html { scroll-behavior:smooth; -webkit-font-smoothing:antialiased; }
  body { background:#07070A; color:#EBEBEB; font-family:'Inter',sans-serif; overflow-x:hidden; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes radarPing { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
  @keyframes shimmer { from{background-position:200% center} to{background-position:-200% center} }

  /* NAV */
  .nav { position:relative;z-index:200;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(7,7,10,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px); }
  .nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none}
  .nav-links{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:4px}
  .nav-mark-wrap{position:relative;width:26px;height:26px}
  .nav-mark-ring{position:absolute;inset:0;width:26px;height:26px;border-radius:7px;border:1px solid rgba(107,71,245,.5);animation:radarPing 2s ease-out infinite}
  .nav-mark-ring.delay{animation-delay:1s}
  .nav-mark{position:relative;z-index:1;width:26px;height:26px;border-radius:7px;background:#6B47F5;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(107,71,245,.5),0 0 16px rgba(107,71,245,.25)}
  .nav-name{font-size:15px;font-weight:600;color:#EBEBEB;letter-spacing:-.02em}
  .nav-a{font-size:13px;color:rgba(235,235,235,.42);text-decoration:none;padding:5px 10px;border-radius:6px;transition:all .15s}
  .nav-a:hover{color:#EBEBEB;background:rgba(255,255,255,.05)}
  .nav-right{display:flex;align-items:center;gap:8px}
  .btn-ghost{font:13px/1 'Inter',sans-serif;color:rgba(235,235,235,.6);background:transparent;border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:7px;cursor:pointer;transition:all .15s;text-decoration:none;display:inline-flex;align-items:center}
  .btn-ghost:hover{border-color:rgba(255,255,255,.22);color:#EBEBEB}
  .btn-pri{font:13px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:7px 16px;border-radius:7px;cursor:pointer;transition:all .15s;box-shadow:0 0 18px rgba(107,71,245,.3);text-decoration:none;display:inline-flex;align-items:center}
  .btn-pri:hover{background:#7D5CF7;box-shadow:0 0 28px rgba(107,71,245,.5)}

  /* LAYOUT */
  .wrap{max-width:1100px;margin:0 auto;padding:0 40px}
  .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);margin:0 40px}

  /* HERO */
  .pricing-hero{padding:96px 0 64px;text-align:center}
  .badge{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:100px;border:1px solid rgba(107,71,245,.4);background:rgba(107,71,245,.1);font-family:'DM Mono',monospace;font-size:10px;color:#A992FA;letter-spacing:.06em;margin-bottom:24px;animation:fadeUp .5s .05s both}
  .badge-dot{width:5px;height:5px;border-radius:50%;background:#6B47F5;animation:pulse 2s infinite}
  .pricing-h1{font-size:clamp(32px,4.5vw,54px);font-weight:600;line-height:1.1;color:#EBEBEB;letter-spacing:-.03em;margin-bottom:16px;animation:fadeUp .55s .1s both}
  .pricing-h1 .acc{color:#A992FA}
  .pricing-sub{font-size:16px;font-weight:300;color:rgba(235,235,235,.44);line-height:1.7;max-width:440px;margin:0 auto 40px;animation:fadeUp .55s .17s both}

  /* TOGGLE */
  .toggle-wrap{display:inline-flex;align-items:center;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:100px;padding:4px 6px 4px 14px;margin-bottom:64px;animation:fadeUp .55s .22s both}
  .toggle-label{font-size:12px;color:rgba(235,235,235,.5)}
  .toggle-label.active{color:#EBEBEB}
  .toggle-pill{position:relative;width:40px;height:22px;border-radius:100px;background:rgba(107,71,245,.3);border:1px solid rgba(107,71,245,.4);cursor:pointer;transition:background .2s}
  .toggle-pill.on{background:#6B47F5}
  .toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
  .toggle-pill.on .toggle-thumb{transform:translateX(18px)}
  .toggle-save{font-family:'DM Mono',monospace;font-size:10px;color:#34d399;letter-spacing:.06em;padding:3px 8px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.2);border-radius:100px}

  /* PLANS */
  .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.06);border-radius:16px;overflow:hidden;animation:fadeUp .6s .28s both}
  .plan{background:#07070A;padding:36px 32px;position:relative;transition:background .2s}
  .plan:hover{background:rgba(255,255,255,.018)}
  .plan.featured{background:rgba(107,71,245,.07);border:1px solid rgba(107,71,245,.25);border-radius:0;margin:-1px;z-index:1}
  .plan.featured:hover{background:rgba(107,71,245,.1)}
  .plan-badge{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;color:#6B47F5;text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:6px}
  .plan-badge-pill{background:rgba(107,71,245,.15);border:1px solid rgba(107,71,245,.3);padding:2px 8px;border-radius:100px}
  .plan-name{font-size:15px;font-weight:600;color:#EBEBEB;margin-bottom:8px}
  .plan-desc{font-size:12px;color:rgba(235,235,235,.38);line-height:1.6;margin-bottom:28px;min-height:36px}
  .plan-price{margin-bottom:6px}
  .plan-amount{font-size:42px;font-weight:600;color:#EBEBEB;letter-spacing:-.03em;line-height:1}
  .plan-amount.shimmer{background:linear-gradient(90deg,#A992FA,#6B47F5,#A992FA);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite}
  .plan-per{font-size:12px;color:rgba(235,235,235,.3);margin-bottom:28px}
  .plan-btn{width:100%;padding:10px;border-radius:8px;font:13px/1 'Inter',sans-serif;font-weight:500;cursor:pointer;transition:all .15s;text-align:center;text-decoration:none;display:block;margin-bottom:32px}
  .plan-btn-outline{background:transparent;border:1px solid rgba(255,255,255,.12);color:rgba(235,235,235,.7)}
  .plan-btn-outline:hover{border-color:rgba(255,255,255,.25);color:#EBEBEB}
  .plan-btn-filled{background:#6B47F5;border:none;color:#fff;box-shadow:0 0 20px rgba(107,71,245,.35)}
  .plan-btn-filled:hover{background:#7D5CF7;box-shadow:0 0 30px rgba(107,71,245,.5)}
  .plan-divider{height:1px;background:rgba(255,255,255,.06);margin-bottom:28px}
  .plan-features-label{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;color:rgba(235,235,235,.28);text-transform:uppercase;margin-bottom:14px}
  .plan-features{display:flex;flex-direction:column;gap:10px}
  .feat{display:flex;align-items:flex-start;gap:10px;font-size:12px;color:rgba(235,235,235,.55);line-height:1.5}
  .feat-check{width:14px;height:14px;flex-shrink:0;margin-top:1px;color:#6B47F5}
  .feat-check.green{color:#34d399}
  .feat-check.dim{color:rgba(255,255,255,.15)}
  .feat strong{color:rgba(235,235,235,.85);font-weight:500}

  /* COMPARE TABLE */
  .compare-section{padding:96px 0}
  .s-tag{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.12em;color:#6B47F5;text-transform:uppercase;margin-bottom:14px}
  .s-h2{font-size:34px;font-weight:600;line-height:1.15;color:#EBEBEB;letter-spacing:-.025em;margin-bottom:48px}
  .compare-table{width:100%;border-collapse:collapse}
  .compare-table th{padding:12px 20px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;color:rgba(235,235,235,.3);text-transform:uppercase;text-align:left;border-bottom:1px solid rgba(255,255,255,.06)}
  .compare-table th.plan-col{text-align:center;color:rgba(235,235,235,.5)}
  .compare-table th.plan-col.hi{color:#A992FA}
  .compare-table td{padding:14px 20px;font-size:13px;color:rgba(235,235,235,.55);border-bottom:1px solid rgba(255,255,255,.04)}
  .compare-table td.center{text-align:center}
  .compare-table tr:hover td{background:rgba(255,255,255,.012)}
  .compare-table tr.section-row td{font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.1em;color:rgba(107,71,245,.6);text-transform:uppercase;padding-top:28px;padding-bottom:8px;border-bottom:1px solid rgba(107,71,245,.15)}
  .check-y{color:#6B47F5;font-size:14px}
  .check-n{color:rgba(255,255,255,.15);font-size:14px}
  .check-custom{font-size:11px;color:rgba(235,235,235,.4)}

  /* FAQ */
  .faq-section{padding:80px 0}
  .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:rgba(255,255,255,.05);border-radius:12px;overflow:hidden;margin-top:44px}
  .faq-item{background:#07070A;padding:28px 30px;cursor:pointer;transition:background .2s}
  .faq-item:hover{background:rgba(255,255,255,.018)}
  .faq-item.open{background:rgba(107,71,245,.05)}
  .faq-q{font-size:13px;font-weight:500;color:rgba(235,235,235,.8);display:flex;align-items:flex-start;justify-content:space-between;gap:12px;line-height:1.5}
  .faq-icon{flex-shrink:0;width:16px;height:16px;color:rgba(107,71,245,.6);margin-top:1px;transition:transform .2s}
  .faq-item.open .faq-icon{transform:rotate(45deg)}
  .faq-a{font-size:12px;color:rgba(235,235,235,.38);line-height:1.7;margin-top:12px;display:none}
  .faq-item.open .faq-a{display:block}

  /* CTA */
  .cta-section{padding:96px 0;text-align:center}
  .cta-box{background:rgba(107,71,245,.06);border:1px solid rgba(107,71,245,.2);border-radius:20px;padding:72px 40px;position:relative;overflow:hidden}
  .cta-glow{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(107,71,245,.15),transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
  .cta-h2{font-size:clamp(26px,3.5vw,42px);font-weight:600;color:#EBEBEB;letter-spacing:-.025em;margin-bottom:14px;position:relative}
  .cta-p{font-size:15px;color:rgba(235,235,235,.42);margin-bottom:32px;position:relative}
  .cta-btns{display:flex;gap:10px;justify-content:center;position:relative}
  .btn-lg{font:15px/1 'Inter',sans-serif;font-weight:500;color:#fff;background:#6B47F5;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:0 0 24px rgba(107,71,245,.4);text-decoration:none;display:inline-flex;align-items:center}
  .btn-lg:hover{background:#7D5CF7;transform:translateY(-1px);box-shadow:0 0 36px rgba(107,71,245,.55)}
  .btn-out{font:14px/1 'Inter',sans-serif;color:rgba(235,235,235,.5);background:transparent;border:1px solid rgba(255,255,255,.1);padding:11px 20px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s;text-decoration:none}
  .btn-out:hover{color:#EBEBEB;border-color:rgba(255,255,255,.2)}

  /* FOOTER */
  .footer{padding:32px 0;border-top:1px solid rgba(255,255,255,.06)}
  .footer-inner{display:flex;align-items:center;justify-content:space-between}
  .footer-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
  .footer-copy{font-size:11px;color:rgba(235,235,235,.2)}
  .footer-links{display:flex;gap:20px}
  .footer-link{font-size:11px;color:rgba(235,235,235,.28);text-decoration:none;transition:color .15s}
  .footer-link:hover{color:rgba(235,235,235,.6)}
`;

const CheckIcon = ({ className = "feat-check" }) => (
  <svg className={className} viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity=".25" />
    <path d="M4.5 7l1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg className="feat-check dim" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeOpacity=".15" />
    <path d="M5 5l4 4M9 5l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg className="faq-icon" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PLANS = [
  {
    name: "Solo",
    desc: "One analyst. One mandate. Built for solo GPs and angel investors.",
    monthly: 149,
    annual: 119,
    btn: "Start free trial",
    btnClass: "plan-btn-outline",
    href: SIGN_UP_URL,
    features: [
      { text: "1 firm profile", check: true },
      { text: "Coverage feed — up to 200 companies/month", check: true },
      { text: "AI scoring against your mandate", check: true },
      { text: "Investment memo generation", check: true },
      { text: "Pipeline kanban board", check: true },
      { text: "Hot Signals weekly brief", check: true },
      { text: "Email alerts", check: false },
      { text: "AI Analyst chat", check: false },
      { text: "Multi-user access", check: false },
    ],
  },
  {
    name: "Fund",
    desc: "For emerging managers and small funds ready to move faster on deals.",
    monthly: 399,
    annual: 319,
    btn: "Start free trial",
    btnClass: "plan-btn-filled",
    href: SIGN_UP_URL,
    featured: true,
    features: [
      { text: <><strong>3 firm profiles</strong> — multiple mandates</>, check: true },
      { text: <><strong>Unlimited</strong> companies/month</>, check: true },
      { text: "AI scoring against your mandate", check: true },
      { text: "Investment memo generation", check: true },
      { text: "Pipeline kanban board", check: true },
      { text: "Hot Signals weekly brief", check: true },
      { text: <><strong>Email alerts</strong> — top matches & signals</>, check: true, green: true },
      { text: <><strong>AI Analyst chat</strong> — ask anything</>, check: true, green: true },
      { text: "Up to 3 team seats", check: true, green: true },
    ],
  },
  {
    name: "Platform",
    desc: "For multi-partner funds and platforms with complex sourcing needs.",
    monthly: null,
    annual: null,
    btn: "Talk to us",
    btnClass: "plan-btn-outline",
    href: "mailto:remi@balassanian.com",
    features: [
      { text: "Unlimited firm profiles", check: true },
      { text: "Unlimited companies & sources", check: true },
      { text: "Custom thesis configuration", check: true },
      { text: "White-label investment memos", check: true },
      { text: "CRM integrations (Affinity, Salesforce)", check: true },
      { text: "Priority email & Slack alerts", check: true },
      { text: "Dedicated AI Analyst", check: true },
      { text: "Unlimited team seats", check: true },
      { text: "SLA + dedicated onboarding", check: true },
    ],
  },
];

const COMPARE_ROWS = [
  { section: "Sourcing" },
  { label: "Nightly autonomous sourcing", solo: true, fund: true, platform: true },
  { label: "Companies per month", solo: "200", fund: "Unlimited", platform: "Unlimited" },
  { label: "Mandate-aware AI sourcing (YC + web search)", solo: true, fund: true, platform: true },
  { label: "Custom sourcing rules", solo: false, fund: false, platform: true },
  { section: "Analysis" },
  { label: "Mandate-aware AI scoring", solo: true, fund: true, platform: true },
  { label: "Deploy Research Agents (on-demand deep analysis)", solo: true, fund: true, platform: true },
  { label: "Investment memo generation", solo: true, fund: true, platform: true },
  { label: "White-label memo output", solo: false, fund: false, platform: true },
  { section: "Workflow" },
  { label: "Pipeline kanban board", solo: true, fund: true, platform: true },
  { label: "Hot Signals weekly brief", solo: true, fund: true, platform: true },
  { label: "AI Analyst chat", solo: false, fund: true, platform: true },
  { label: "Email alerts (Top Match, Diligence Signal)", solo: false, fund: true, platform: true },
  { label: "Team seats", solo: "1", fund: "3", platform: "Unlimited" },
  { label: "CRM integrations", solo: false, fund: false, platform: true },
];

const FAQS = [
  {
    q: "How is Radar different from Harmonic or PitchBook?",
    a: "Those are databases you search. Radar works for you continuously — it knows your mandate, sources proactively every night, and only surfaces companies that fit your thesis. You open your inbox to finds your shortlist already built.",
  },
  {
    q: "What does 'mandate-aware' actually mean?",
    a: "When you set up Radar, you write your investment thesis in plain English. Every company that enters the system is scored 1–5 against that thesis specifically — not a generic AI score. A construction-focused fund and a fintech fund see completely different companies.",
  },
  {
    q: "How does the free trial work?",
    a: "14 days, full access to your chosen plan, no credit card required. Radar runs its first sourcing job on signup so you see real results immediately — not an empty screen.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-ins. Cancel from your settings and you keep access until the end of your billing period.",
  },
  {
    q: "What sourcing sources does Radar use?",
    a: "YC batches (seeded once) plus nightly AI-powered web search — Claude generates mandate-specific queries and finds early-stage companies across the web, all scored against your thesis.",
  },
  {
    q: "Do you offer discounts for pre-seed funds or solo GPs?",
    a: "Yes — reach out directly at remi@balassanian.com. We work with emerging managers and have flexible arrangements for funds under $10M.",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <style>{FONTS}</style>
      <style>{STYLES}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
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
          <span className="nav-name">Radar</span>
        </a>
        <div className="nav-links">
          <a href="/how-it-works" className="nav-a">How it works</a>
          <a href="/#product" className="nav-a">Product</a>
          <a href="/pricing" className="nav-a" style={{ color: '#EBEBEB' }}>Pricing</a>
        </div>
        <div className="nav-right">
          <a href="/sign-in" className="btn-ghost">Sign in</a>
          <a href={SIGN_UP_URL} className="btn-pri">Get started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="pricing-hero">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div className="badge">
            <span className="badge-dot" />
            Simple pricing
          </div>
          <h1 className="pricing-h1">
            The analyst that never sleeps.<br />
            <span className="acc">Priced like a tool, not a headcount.</span>
          </h1>
          <p className="pricing-sub">
            No $100K contracts. No per-seat bloat. Just mandate-aware sourcing that runs every night while you sleep.
          </p>

          {/* Billing toggle */}
          <div className="toggle-wrap">
            <span className="toggle-label" style={{ opacity: annual ? 0.4 : 1 }}>Monthly</span>
            <div
              className={`toggle-pill ${annual ? 'on' : ''}`}
              onClick={() => setAnnual(!annual)}
            >
              <div className="toggle-thumb" />
            </div>
            <span className="toggle-label" style={{ opacity: annual ? 1 : 0.4 }}>Annual</span>
            <span className="toggle-save">Save 20%</span>
          </div>

          {/* PLANS */}
          <div className="plans">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`plan${plan.featured ? ' featured' : ''}`}>
                <div className="plan-badge">
                  {plan.featured && <span className="plan-badge-pill">Most popular</span>}
                  {!plan.featured && <span style={{ opacity: 0 }}>·</span>}
                </div>
                <div className="plan-name">{plan.name}</div>
                <div className="plan-desc">{plan.desc}</div>
                <div className="plan-price">
                  {plan.monthly === null ? (
                    <div className="plan-amount" style={{ fontSize: 32, paddingTop: 6 }}>Custom</div>
                  ) : (
                    <div className={`plan-amount${plan.featured ? ' shimmer' : ''}`}>
                      ${annual ? plan.annual : plan.monthly}
                    </div>
                  )}
                </div>
                <div className="plan-per">
                  {plan.monthly !== null ? `per month${annual ? ', billed annually' : ''}` : 'Contact us for a quote'}
                </div>
                <a href={plan.href} className={`plan-btn ${plan.btnClass}`}>
                  {plan.btn}
                </a>
                <div className="plan-divider" />
                <div className="plan-features-label">What's included</div>
                <div className="plan-features">
                  {plan.features.map((f, i) => (
                    <div key={i} className="feat">
                      {f.check
                        ? <CheckIcon className={f.green ? 'feat-check green' : 'feat-check'} />
                        : <XIcon />
                      }
                      <span>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* COMPARE TABLE */}
      <section className="compare-section">
        <div className="wrap">
          <div className="s-tag">Full comparison</div>
          <div className="s-h2">Everything, side by side</div>
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: '42%' }}>Feature</th>
                <th className="plan-col">Solo</th>
                <th className="plan-col hi">Fund</th>
                <th className="plan-col">Platform</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => {
                if (row.section) {
                  return (
                    <tr key={i} className="section-row">
                      <td colSpan={4}>{row.section}</td>
                    </tr>
                  );
                }
                const renderCell = (val) => {
                  if (val === true) return <span className="check-y">✓</span>;
                  if (val === false) return <span className="check-n">—</span>;
                  return <span className="check-custom">{val}</span>;
                };
                return (
                  <tr key={i}>
                    <td>{row.label}</td>
                    <td className="center">{renderCell(row.solo)}</td>
                    <td className="center" style={{ background: 'rgba(107,71,245,.04)' }}>{renderCell(row.fund)}</td>
                    <td className="center">{renderCell(row.platform)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="divider" />

      {/* FAQ */}
      <section className="faq-section">
        <div className="wrap">
          <div className="s-tag">Common questions</div>
          <div className="s-h2">Everything you need to know</div>
          <div className="faq-grid">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`faq-item${openFaq === i ? ' open' : ''}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="faq-q">
                  {faq.q}
                  <PlusIcon />
                </div>
                <div className="faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* CTA */}
      <section className="cta-section">
        <div className="wrap">
          <div className="cta-box">
            <div className="cta-glow" />
            <h2 className="cta-h2">Your mandate. Working overnight.</h2>
            <p className="cta-p">14-day free trial. No credit card. Results on day one.</p>
            <div className="cta-btns">
              <a href={SIGN_UP_URL} className="btn-lg">Start free trial →</a>
              <a href="mailto:remi@balassanian.com" className="btn-out">Talk to us</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-inner">
            <a href="/" className="footer-logo">
              <div className="nav-mark" style={{ width: 20, height: 20, borderRadius: 5 }}>
                <svg width="10" height="10" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="2" fill="white" />
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeOpacity=".4" strokeWidth="1" />
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(235,235,235,.5)', letterSpacing: '-.02em' }}>Radar</span>
            </a>
            <div className="footer-links">
              <a href="/how-it-works" className="footer-link">How it works</a>
              <a href="/pricing" className="footer-link">Pricing</a>
              <a href="mailto:remi@balassanian.com" className="footer-link">Contact</a>
            </div>
            <span className="footer-copy">© 2026 Radar. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
