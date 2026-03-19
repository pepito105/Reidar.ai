import logging
from datetime import datetime
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Email Transport ─────────────────────────────────────────────────────────

def _send_email(subject: str, html_content: str, to_email: str = None) -> bool:
    if not settings.SENDGRID_API_KEY:
        logger.warning("No SENDGRID_API_KEY — skipping email")
        return False
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        recipient = to_email or settings.NOTIFICATION_EMAIL
        recipients = [r.strip() for r in recipient.split(',') if r.strip()]
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=recipients,
            subject=subject,
            html_content=html_content,
        )
        response = sg.send(message)
        logger.info(f"Email sent: '{subject}' → {recipients} → {response.status_code}")
        return response.status_code in (200, 202)
    except Exception as e:
        logger.error(f"Email send failed: {e}", exc_info=True)
        return False


# ── Claude Narrative Generation ──────────────────────────────────────────────

async def _claude_narrative(prompt: str, max_tokens: int = 400) -> str:
    """Call Claude Haiku to generate narrative copy. Returns empty string on failure."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude narrative generation failed: {e}")
        return ""


# ── Shared HTML Helpers ──────────────────────────────────────────────────────

def _app_url() -> str:
    return getattr(settings, 'APP_URL', 'https://radar.up.railway.app')


def _base_email(title: str, subtitle: str, body: str, firm_name: str = "your firm") -> str:
    return f"""
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:6px;">
          RADAR · AI ASSOCIATE
        </div>
        <div style="font-size:22px;font-weight:700;color:#f0f0ff;margin-bottom:4px;">{title}</div>
        <div style="font-size:13px;color:#555577;">{subtitle}</div>
      </div>
      {body}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1e1e2e;
                  font-size:11px;color:#3a3a5a;text-align:center;">
        Radar · AI Investment Associate for {firm_name} ·
        <a href="{_app_url()}" style="color:#6366f1;text-decoration:none;">Open Radar →</a>
      </div>
    </div></body></html>"""


def _company_block(company: dict, narrative: str = "") -> str:
    fit = company.get("fit_score", 0)
    fit_colors = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}
    fit_labels = {5: "Top Match", 4: "Strong Fit", 3: "Possible Fit"}
    color = fit_colors.get(fit, "#6b7280")
    label = fit_labels.get(fit, f"{fit}/5")
    stage = company.get("funding_stage") or ""
    sector = company.get("sector") or ""
    name = company.get("name", "Unknown")
    one_liner = company.get("one_liner") or ""
    narrative_html = (
        f'<div style="font-size:13px;color:#c0c0e0;line-height:1.7;margin-top:10px;'
        f'padding-top:10px;border-top:1px solid #1a1a2e;">{narrative}</div>'
    ) if narrative else ""
    return f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:4px solid {color};
                border-radius:8px;padding:16px 18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <span style="font-size:15px;font-weight:700;color:#f0f0ff;">{name}</span>
        <span style="font-size:11px;font-weight:600;color:{color};background:{color}22;
                     padding:2px 8px;border-radius:4px;">{label}</span>
        {f'<span style="font-size:11px;color:#6b7280;background:#1a1a2e;padding:2px 8px;border-radius:4px;">{stage}</span>' if stage else ''}
        {f'<span style="font-size:11px;color:#6b7280;background:#1a1a2e;padding:2px 8px;border-radius:4px;">{sector}</span>' if sector else ''}
      </div>
      <div style="font-size:13px;color:#8888aa;line-height:1.5;">{one_liner}</div>
      {narrative_html}
    </div>"""


def _cta_button(label: str = "Open Radar →") -> str:
    return f"""
    <div style="margin-top:24px;text-align:center;">
      <a href="{_app_url()}" style="display:inline-block;padding:10px 24px;
         background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;
         font-weight:600;border-radius:8px;text-decoration:none;">{label}</a>
    </div>"""


# ── 1. Weekly Digest ─────────────────────────────────────────────────────────

async def send_weekly_summary(
    new_companies: List[dict],
    pipeline_summary: dict,
    stale_deals: List[dict],
    firm_name: str = "your firm",
    thesis: str = "",
    notification_emails: str = None,
) -> bool:
    top_new = [c for c in new_companies if (c.get("fit_score") or 0) >= 4][:6]

    # Claude writes the editorial opening
    company_list = "\n".join(
        [f"- {c['name']}: {c.get('one_liner', '')}" for c in top_new]
    ) or "No new top matches this week."
    pipeline_counts = {k: len(v) for k, v in pipeline_summary.items()}
    stale_names = ", ".join([d["name"] for d in stale_deals[:5]]) or "none"

    narrative_prompt = f"""You are the AI investment associate for {firm_name}. Write a 2-3 sentence editorial opening for their Monday morning deal flow digest.

Firm thesis: {thesis or "early-stage technology investing"}

This week's data:
- New companies matching mandate: {len(top_new)}
{company_list}
- Pipeline: {pipeline_counts}
- Stale deals needing attention: {stale_names}

Write in the voice of a sharp, direct investment analyst. No fluff. Reference specific company names if they came in this week. Do not use bullet points. Do not start with "This week". Maximum 3 sentences."""

    opening = await _claude_narrative(narrative_prompt, max_tokens=200)

    # Claude writes a one-sentence take on each top company
    company_blocks = ""
    for c in top_new:
        take_prompt = f"""Write one sharp sentence (max 25 words) on why {c['name']} — "{c.get('one_liner', '')}" — is relevant for a firm focused on: {thesis or 'early-stage technology'}. Be specific. No hype."""
        take = await _claude_narrative(take_prompt, max_tokens=80)
        company_blocks += _company_block(c, narrative=take)

    if not company_blocks:
        company_blocks = (
            '<div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:8px;'
            'padding:14px;margin-bottom:16px;font-size:13px;color:#555577;text-align:center;">'
            'No new top matches this week.</div>'
        )

    # Pipeline snapshot
    STAGE_COLORS = {
        "watching": "#6366f1", "outreach": "#f59e0b",
        "diligence": "#10b981", "passed": "#6b7280", "invested": "#8b5cf6",
    }
    pipeline_rows = ""
    for stage, color in STAGE_COLORS.items():
        count = len(pipeline_summary.get(stage, []))
        pipeline_rows += f"""
        <tr>
          <td style="padding:8px 12px;color:#8888aa;font-size:13px;text-transform:capitalize;">{stage}</td>
          <td style="padding:8px 12px;text-align:right;">
            <span style="font-size:13px;font-weight:700;color:{color if count > 0 else '#3a3a5a'};">{count}</span>
          </td>
        </tr>"""

    # Stale deals
    stale_html = ""
    if stale_deals:
        stale_html = """
        <div style="font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;
                    margin-top:24px;margin-bottom:10px;">⚠️ NEEDS ATTENTION</div>"""
        for d in stale_deals[:8]:
            stale_html += f"""
            <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:3px solid #f59e0b;
                        border-radius:6px;padding:10px 14px;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:#f0f0ff;">{d.get('name', '')}</span>
                <span style="font-size:11px;color:#f59e0b;background:#1c1a00;padding:2px 6px;
                             border-radius:4px;text-transform:capitalize;">{d.get('pipeline_status', '')}</span>
                <span style="font-size:11px;color:#555577;">{d.get('days_stale', '?')}d no activity</span>
              </div>
              <div style="font-size:12px;color:#8888aa;">{(d.get('one_liner') or '')[:90]}</div>
            </div>"""

    total_active = sum(len(v) for k, v in pipeline_summary.items() if k != "passed")
    subject = f"Radar Weekly: {len(top_new)} new {'match' if len(top_new) == 1 else 'matches'}, {total_active} active deals"

    body = f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:10px;
                padding:18px 20px;margin-bottom:24px;">
      <div style="font-size:14px;color:#c0c0e0;line-height:1.7;">
        {opening or "Here's your weekly deal flow summary."}
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#10b981;letter-spacing:0.5px;margin-bottom:12px;">
      NEW THIS WEEK
    </div>
    {company_blocks}
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.5px;
                margin-top:24px;margin-bottom:10px;">PIPELINE SNAPSHOT</div>
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:8px;
                overflow:hidden;margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;">{pipeline_rows}</table>
    </div>
    {stale_html}
    {_cta_button("Review this week's deals →")}"""

    html = _base_email(
        title="Weekly Deal Flow",
        subtitle=f"Week of {datetime.now().strftime('%B %d, %Y')}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)


# ── 2. Nightly Sourcing Alert ────────────────────────────────────────────────

def _fit_pips(score: int) -> str:
    filled = "●" * score
    empty = "○" * (5 - score)
    colors = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}
    color = colors.get(score, "#6b7280")
    return f'<span style="color:{color};letter-spacing:2px;font-size:13px;">{filled}</span><span style="color:#2a2a3e;letter-spacing:2px;font-size:13px;">{empty}</span>'


def _sourcing_company_block(company: dict, take: str = "") -> str:
    name = company.get("name", "Unknown")
    one_liner = company.get("one_liner") or ""
    fit = company.get("fit_score", 0)
    pips = _fit_pips(fit)
    take_html = (
        f'<div style="font-size:12px;color:#9090b0;line-height:1.6;margin-top:8px;'
        f'font-style:italic;">{take}</div>'
    ) if take else ""
    return f"""
    <div style="border-bottom:1px solid #1a1a2e;padding:14px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <span style="font-size:15px;font-weight:700;color:#f0f0ff;">{name}</span>
        <span style="line-height:1;">{pips}</span>
      </div>
      <div style="font-size:13px;color:#8888aa;line-height:1.5;">{one_liner}</div>
      {take_html}
    </div>"""


async def send_sourcing_alert(
    companies: List[dict],
    firm_name: str = "your firm",
    thesis: str = "",
    notification_emails: str = None,
) -> bool:
    if not companies:
        return False

    count = len(companies)
    n = count
    subject = f"Radar: {n} new match{'es' if n > 1 else ''} tonight"

    company_blocks = ""
    for c in companies[:10]:
        take_prompt = f"""One sentence, max 20 words: why is {c['name']} — "{c.get('one_liner', '')}" — relevant for a fund focused on {thesis or 'early-stage technology'}? Be specific."""
        take = await _claude_narrative(take_prompt, max_tokens=60)
        company_blocks += _sourcing_company_block(c, take=take)

    body = f"""
    <div style="margin-bottom:4px;">
      {company_blocks}
    </div>
    {_cta_button("Open Radar →")}"""

    html = _base_email(
        title=f"{n} new {'match' if n == 1 else 'matches'} found overnight",
        subtitle=f"{datetime.now().strftime('%A, %B %d')} · {firm_name}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)


# ── 4. Diligence Signal Batch Alert ──────────────────────────────────────────

async def send_diligence_batch_alert(
    alerts: List[dict],
    firm_name: str = "your firm",
    thesis: str = "",
    notification_emails: str = None,
) -> bool:
    if not alerts:
        return False

    SIGNAL_ICONS = {
        "funding_round": "🟢", "product_launch": "🚀", "headcount_growth": "📈",
        "news_mention": "📰", "leadership_change": "👤", "traction_update": "⚡",
    }
    FIT_COLORS = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}
    FIT_LABELS = {5: "Top Match", 4: "Strong Fit", 3: "Possible Fit"}

    companies_html = ""
    for alert in alerts:
        company_name = alert.get("company_name", "")
        fit_score = alert.get("fit_score", 3)
        signals = alert.get("signals", [])
        color = FIT_COLORS.get(fit_score, "#6b7280")
        label = FIT_LABELS.get(fit_score, f"{fit_score}/5")

        signals_html = ""
        for sig in signals[:4]:
            icon = SIGNAL_ICONS.get(sig.get("signal_type", ""), "📡")
            interp_prompt = f"""One sentence (max 20 words): what does this signal mean for a VC considering investing in {company_name}? Signal: "{sig.get('title', '')} — {sig.get('summary', '')}". Be specific."""
            interpretation = await _claude_narrative(interp_prompt, max_tokens=60)
            signals_html += f"""
            <div style="padding:8px 0;border-bottom:1px solid #1a1a2e;">
              <div style="font-size:12px;font-weight:600;color:#f0f0ff;">{icon} {sig.get('title', '')}</div>
              <div style="font-size:11px;color:#8888aa;margin-top:2px;">{sig.get('summary', '')}</div>
              {f'<div style="font-size:11px;color:#c0c0e0;margin-top:4px;font-style:italic;">{interpretation}</div>' if interpretation else ''}
            </div>"""

        companies_html += f"""
        <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:4px solid {color};
                    border-radius:8px;padding:14px 16px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:700;color:#f0f0ff;">{company_name}</span>
            <span style="font-size:11px;font-weight:600;color:{color};background:{color}22;
                         padding:2px 8px;border-radius:4px;">{label}</span>
            <span style="font-size:11px;color:#f59e0b;background:#1c1a00;
                         padding:2px 8px;border-radius:4px;">In Diligence</span>
          </div>
          {signals_html}
        </div>"""

    total_signals = sum(len(a.get("signals", [])) for a in alerts)
    subject = f"Radar: Movement on {len(alerts)} diligence {'deal' if len(alerts) == 1 else 'deals'}"

    body = f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:10px;
                padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#8888aa;line-height:1.6;">
        <strong style="color:#f0f0ff;">{total_signals} new signal{'s' if total_signals != 1 else ''}</strong>
        across <strong style="color:#f0f0ff;">{len(alerts)} {'company' if len(alerts) == 1 else 'companies'}</strong>
        you're actively evaluating.
      </div>
    </div>
    {companies_html}
    {_cta_button("Review diligence pipeline →")}"""

    html = _base_email(
        title="🔔 Diligence Update",
        subtitle=f"Pipeline signals · {datetime.now().strftime('%A, %B %d')}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)
