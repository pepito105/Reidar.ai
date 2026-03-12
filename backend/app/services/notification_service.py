import logging
from datetime import datetime
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_email(subject: str, html_content: str, to_email: str = None) -> bool:
    if not settings.SENDGRID_API_KEY:
        logger.warning("No SENDGRID_API_KEY configured — skipping email")
        return False
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, To
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        recipient = to_email or settings.NOTIFICATION_EMAIL
        # Support comma-separated list of recipients
        recipients = [r.strip() for r in recipient.split(',') if r.strip()]
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails=recipients,
            subject=subject,
            html_content=html_content,
        )
        response = sg.send(message)
        logger.info(f"Email sent: '{subject}' → {recipients} → status {response.status_code}")
        return response.status_code in (200, 202)
    except Exception as e:
        logger.error(f"Email send failed: {e}", exc_info=True)
        return False


def _card(company: dict) -> str:
    fit = company.get("fit_score", 0)
    fit_colors = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}
    fit_labels = {5: "Top Match", 4: "Strong Fit", 3: "Possible Fit"}
    color = fit_colors.get(fit, "#6b7280")
    label = fit_labels.get(fit, f"{fit}/5")
    stage = company.get("funding_stage") or ""
    sector = company.get("sector") or ""
    one_liner = company.get("one_liner") or ""
    name = company.get("name", "Unknown")
    return f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:4px solid {color};
                border-radius:8px;padding:14px 16px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:15px;font-weight:700;color:#f0f0ff;">{name}</span>
        <span style="font-size:11px;font-weight:600;color:{color};background:{color}22;
                     padding:2px 8px;border-radius:4px;">{label}</span>
        {f'<span style="font-size:11px;color:#6b7280;background:#1a1a2e;padding:2px 8px;border-radius:4px;">{stage}</span>' if stage else ''}
        {f'<span style="font-size:11px;color:#6b7280;background:#1a1a2e;padding:2px 8px;border-radius:4px;">{sector}</span>' if sector else ''}
      </div>
      <div style="font-size:13px;color:#8888aa;line-height:1.5;">{one_liner}</div>
    </div>"""


def _base_email(title: str, subtitle: str, body: str, firm_name: str = "your firm") -> str:
    return f"""
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0f;font-family:'Inter',sans-serif;">
    <div style="max-width:620px;margin:0 auto;padding:32px 20px;">
      <!-- Header -->
      <div style="margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:1px;margin-bottom:6px;">
          RADAR · AI ASSOCIATE
        </div>
        <div style="font-size:22px;font-weight:700;color:#f0f0ff;margin-bottom:4px;">{title}</div>
        <div style="font-size:13px;color:#555577;">{subtitle}</div>
      </div>
      <!-- Body -->
      {body}
      <!-- Footer -->
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1e1e2e;
                  font-size:11px;color:#3a3a5a;text-align:center;">
        Radar · AI Investment Associate for {firm_name} ·
        <a href="http://localhost:5173" style="color:#6366f1;text-decoration:none;">Open Radar →</a>
      </div>
    </div></body></html>"""


async def send_new_top_match_alert(companies: List[dict], firm_name: str = "your firm", notification_emails: str = None) -> bool:
    """Send alert when new 4/5 or 5/5 companies are added from a scrape."""
    if not companies:
        return False

    top = [c for c in companies if (c.get("fit_score") or 0) == 5]
    strong = [c for c in companies if (c.get("fit_score") or 0) == 4]

    cards_html = ""
    if top:
        cards_html += f"""
        <div style="font-size:11px;font-weight:700;color:#10b981;letter-spacing:0.5px;margin-bottom:10px;">
            🎯 TOP MATCHES ({len(top)})
        </div>"""
        for c in top:
            cards_html += _card(c)

    if strong:
        cards_html += f"""
        <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.5px;
                    margin-top:16px;margin-bottom:10px;">
            STRONG FITS ({len(strong)})
        </div>"""
        for c in strong:
            cards_html += _card(c)

    total = len(companies)
    subject = f"Radar: {total} new {'company' if total == 1 else 'companies'} match your mandate"
    body = f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#8888aa;line-height:1.6;">
        The nightly scrape just added <strong style="color:#f0f0ff;">{total} new
        {'company' if total == 1 else 'companies'}</strong> that match your investment mandate.
        {'One is a perfect thesis fit.' if top else 'Review and decide on next steps.'}
      </div>
    </div>
    {cards_html}
    <div style="margin-top:20px;text-align:center;">
      <a href="http://localhost:5173" style="display:inline-block;padding:10px 24px;
         background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;
         font-weight:600;border-radius:8px;text-decoration:none;">
        Review in Radar →
      </a>
    </div>"""

    html = _base_email(
        title=f"{'🎯 Top Match' if top else '✦ New Companies'} from Latest Scrape",
        subtitle=f"Nightly scrape · {datetime.now().strftime('%A, %B %d')}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)


async def send_diligence_signal_alert(company_name: str, signals: List[dict],
                                       fit_score: int, firm_name: str = "your firm", notification_emails: str = None) -> bool:
    """Send alert when a diligence-stage company gets a new signal."""
    if not signals:
        return False

    ICONS = {
        "funding_round": "🟢", "product_launch": "🚀", "headcount_growth": "📈",
        "news_mention": "📰", "leadership_change": "👤", "traction_update": "⚡",
    }
    signals_html = ""
    for sig in signals[:5]:
        icon = ICONS.get(sig.get("signal_type", ""), "📡")
        signals_html += f"""
        <div style="background:#0a0a14;border:1px solid #1a1a2e;border-radius:6px;
                    padding:10px 14px;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:600;color:#f0f0ff;margin-bottom:4px;">
            {icon} {sig.get('title', '')}
          </div>
          <div style="font-size:12px;color:#8888aa;line-height:1.5;">
            {sig.get('summary', '')}
          </div>
        </div>"""

    fit_label = {5: "Top Match", 4: "Strong Fit", 3: "Possible Fit"}.get(fit_score, f"{fit_score}/5")
    fit_color = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}.get(fit_score, "#6b7280")

    subject = f"Radar: New signal on {company_name} (in diligence)"
    body = f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:10px;
                padding:16px 20px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:16px;font-weight:700;color:#f0f0ff;">{company_name}</span>
        <span style="font-size:11px;font-weight:600;color:{fit_color};background:{fit_color}22;
                     padding:2px 8px;border-radius:4px;">{fit_label}</span>
        <span style="font-size:11px;color:#f59e0b;background:#1c1a00;padding:2px 8px;
                     border-radius:4px;">In Diligence</span>
      </div>
      <div style="font-size:13px;color:#8888aa;">
        {len(signals)} new signal{'s' if len(signals) > 1 else ''} detected
      </div>
    </div>
    {signals_html}
    <div style="margin-top:20px;text-align:center;">
      <a href="http://localhost:5173" style="display:inline-block;padding:10px 24px;
         background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;
         font-weight:600;border-radius:8px;text-decoration:none;">
        View in Radar →
      </a>
    </div>"""

    html = _base_email(
        title=f"🔔 New Signal: {company_name}",
        subtitle=f"Diligence alert · {datetime.now().strftime('%A, %B %d')}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)


async def send_diligence_batch_alert(
    alerts: List[dict],
    firm_name: str = "your firm",
    notification_emails: str = None,
) -> bool:
    """Send one combined email for all diligence pipeline signals."""
    if not alerts:
        return False

    ICONS = {
        "funding_round": "🟢", "product_launch": "🚀", "headcount_growth": "📈",
        "news_mention": "📰", "leadership_change": "👤", "traction_update": "⚡",
    }

    companies_html = ""
    for alert in alerts:
        company_name = alert.get("company_name", "")
        fit_score = alert.get("fit_score", 3)
        signals = alert.get("signals", [])
        fit_label = {5: "Top Match", 4: "Strong Fit", 3: "Possible Fit"}.get(fit_score, f"{fit_score}/5")
        fit_color = {5: "#10b981", 4: "#6366f1", 3: "#f59e0b"}.get(fit_score, "#6b7280")

        signals_html = ""
        for sig in signals[:3]:
            icon = ICONS.get(sig.get("signal_type", ""), "📡")
            signals_html += f"""
            <div style="padding:6px 0;border-bottom:1px solid #1a1a2e;">
              <div style="font-size:12px;font-weight:600;color:#f0f0ff;">{icon} {sig.get('title', '')}</div>
              <div style="font-size:11px;color:#8888aa;margin-top:2px;">{sig.get('summary', '')}</div>
            </div>"""

        companies_html += f"""
        <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:4px solid {fit_color};
                    border-radius:8px;padding:14px 16px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="font-size:14px;font-weight:700;color:#f0f0ff;">{company_name}</span>
            <span style="font-size:11px;font-weight:600;color:{fit_color};background:{fit_color}22;
                         padding:2px 8px;border-radius:4px;">{fit_label}</span>
            <span style="font-size:11px;color:#f59e0b;background:#1c1a00;padding:2px 8px;
                         border-radius:4px;">In Diligence</span>
            <span style="font-size:11px;color:#555577;margin-left:auto;">{len(signals)} new signal{'s' if len(signals) > 1 else ''}</span>
          </div>
          {signals_html}
        </div>"""

    total_signals = sum(len(a.get("signals", [])) for a in alerts)
    subject = f"Radar: {len(alerts)} diligence {'company has' if len(alerts) == 1 else 'companies have'} new signals"

    body = f"""
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;color:#8888aa;line-height:1.6;">
        <strong style="color:#f0f0ff;">{len(alerts)} {'company' if len(alerts) == 1 else 'companies'}</strong> in your diligence pipeline
        {'has' if len(alerts) == 1 else 'have'} <strong style="color:#f0f0ff;">{total_signals} new signal{'s' if total_signals != 1 else ''}</strong> since your last check.
      </div>
    </div>
    {companies_html}
    <div style="margin-top:20px;text-align:center;">
      <a href="http://localhost:5173" style="display:inline-block;padding:10px 24px;
         background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;
         font-weight:600;border-radius:8px;text-decoration:none;">
        Review in Radar →
      </a>
    </div>"""

    html = _base_email(
        title=f"🔔 Diligence Signals: {len(alerts)} {'Company' if len(alerts) == 1 else 'Companies'}",
        subtitle=f"Pipeline alert · {datetime.now().strftime('%A, %B %d')}",
        body=body,
        firm_name=firm_name,
    )
    return _send_email(subject, html, to_email=notification_emails)


async def send_weekly_summary(
    new_companies: List[dict],
    pipeline_summary: dict,
    stale_deals: List[dict],
    firm_name: str = "your firm",
    notification_emails: str = None,
) -> bool:
    """Send Monday morning weekly summary."""

    # New top companies this week
    top_new = [c for c in new_companies if (c.get("fit_score") or 0) >= 4][:5]
    new_html = ""
    if top_new:
        new_html = """
        <div style="font-size:11px;font-weight:700;color:#10b981;letter-spacing:0.5px;margin-bottom:10px;">
            NEW THIS WEEK
        </div>"""
        for c in top_new:
            new_html += _card(c)
    else:
        new_html = """
        <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:8px;
                    padding:14px;margin-bottom:16px;font-size:13px;color:#555577;text-align:center;">
            No new top matches this week
        </div>"""

    # Pipeline snapshot
    STAGE_COLORS = {
        "watching": "#6366f1", "outreach": "#f59e0b",
        "diligence": "#10b981", "passed": "#6b7280", "invested": "#8b5cf6"
    }
    pipeline_rows = ""
    total_active = 0
    for stage, color in STAGE_COLORS.items():
        count = len(pipeline_summary.get(stage, []))
        if stage not in ("passed",):
            total_active += count
        pipeline_rows += f"""
        <tr>
          <td style="padding:8px 12px;color:#8888aa;font-size:13px;text-transform:capitalize;">{stage}</td>
          <td style="padding:8px 12px;text-align:right;">
            <span style="font-size:13px;font-weight:700;color:{color if count > 0 else '#3a3a5a'};">{count}</span>
          </td>
        </tr>"""

    pipeline_html = f"""
    <div style="font-size:11px;font-weight:700;color:#6366f1;letter-spacing:0.5px;
                margin-top:24px;margin-bottom:10px;">
        PIPELINE SNAPSHOT
    </div>
    <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-radius:8px;overflow:hidden;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;">
        {pipeline_rows}
      </table>
    </div>"""

    # Stale deals
    stale_html = ""
    if stale_deals:
        stale_html = f"""
        <div style="font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:0.5px;
                    margin-top:24px;margin-bottom:10px;">
            ⚠️ NEEDS ATTENTION ({len(stale_deals)} stale deals)
        </div>"""
        for d in stale_deals[:8]:
            stale_html += f"""
            <div style="background:#0f0f1a;border:1px solid #1e1e2e;border-left:3px solid #f59e0b;
                        border-radius:6px;padding:10px 14px;margin-bottom:8px;">
              <span style="font-size:13px;font-weight:600;color:#f0f0ff;">{d.get('name', '')}</span>
              <span style="font-size:11px;color:#f59e0b;background:#1c1a00;padding:2px 6px;
                           border-radius:4px;margin-left:8px;text-transform:capitalize;">
                {d.get('pipeline_status', '')}
              </span>
              <div style="font-size:12px;color:#8888aa;margin-top:4px;">{(d.get('one_liner') or '')[:80]}</div>
            </div>"""

    subject = f"Radar Weekly: {total_active} active deals, {len(top_new)} new matches this week"
    body = new_html + pipeline_html + stale_html + """
    <div style="margin-top:24px;text-align:center;">
      <a href="http://localhost:5173" style="display:inline-block;padding:10px 24px;
         background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:13px;
         font-weight:600;border-radius:8px;text-decoration:none;">
        Open Radar →
      </a>
    </div>"""

    html = _base_email(
        title="Weekly Deal Flow Summary",
        subtitle=f"Week of {datetime.now().strftime('%B %d, %Y')}",
        body=body,
        firm_name=firm_name,
    )
    result = _send_email(subject, html, to_email=notification_emails)
    return result if result is not None else False
