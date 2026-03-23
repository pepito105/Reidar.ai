import base64
import json
import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.gmail_connection import GmailConnection
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.models.notification import Notification
from app.services.classifier import classify_startup

logger = logging.getLogger(__name__)

GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


# ── Token management ──────────────────────────────────────────────────────────

async def _refresh_access_token(conn: GmailConnection, db: AsyncSession) -> bool:
    if not conn.refresh_token:
        logger.warning(f"No refresh token for Gmail connection {conn.user_id}")
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": conn.refresh_token,
                "grant_type": "refresh_token",
            })
        data = resp.json()
        if "access_token" not in data:
            logger.error(f"Token refresh failed for {conn.user_id}: {data}")
            return False
        conn.access_token = data["access_token"]
        conn.token_expiry = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
        await db.commit()
        return True
    except Exception as e:
        logger.error(f"Token refresh exception for {conn.user_id}: {e}")
        return False


def _token_is_expired(conn: GmailConnection) -> bool:
    if not conn.token_expiry:
        return False
    return datetime.utcnow() >= conn.token_expiry - timedelta(minutes=5)


# ── Gmail API helpers ─────────────────────────────────────────────────────────

def _auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _decode_body_data(data: str) -> str:
    """Decode base64url-encoded Gmail body data."""
    try:
        padded = data + "=" * (4 - len(data) % 4)
        return base64.urlsafe_b64decode(padded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_body(payload: dict) -> str:
    """Recursively walk MIME parts, prefer text/plain over text/html."""
    mime = payload.get("mimeType", "")

    # Simple non-multipart message
    if not mime.startswith("multipart/"):
        data = (payload.get("body") or {}).get("data", "")
        if data:
            text = _decode_body_data(data)
            if mime == "text/html":
                text = _strip_html(text)
            return text
        return ""

    # Multipart — walk parts
    parts = payload.get("parts") or []
    plain = ""
    html = ""
    for part in parts:
        part_mime = part.get("mimeType", "")
        if part_mime == "text/plain":
            data = (part.get("body") or {}).get("data", "")
            if data:
                plain = _decode_body_data(data)
        elif part_mime == "text/html":
            data = (part.get("body") or {}).get("data", "")
            if data:
                html = _strip_html(_decode_body_data(data))
        elif part_mime.startswith("multipart/"):
            # Nested multipart
            nested = _extract_body(part)
            if nested and not plain:
                plain = nested

    return plain or html


def _extract_headers(headers: list, name: str) -> str:
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


# ── Email classifier ──────────────────────────────────────────────────────────

async def classify_email(
    subject: str,
    sender: str,
    body: str,
    firm_profile: FirmProfile,
) -> dict:
    """Call Claude Haiku to classify an email and extract structured data."""
    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    thesis = (firm_profile.investment_thesis or "Early-stage B2B SaaS")[:1000]
    prompt = f"""You are processing an email received by a VC analyst. Classify this email and extract structured data.

FIRM CONTEXT:
{thesis}

EMAIL:
From: {sender}
Subject: {subject}
Body: {body[:3000]}

Classify this email as exactly one of:
- "pitch": A founder pitching their company directly or via intro
- "transcript": An AI notetaker summary (Fireflies, Otter, Granola, Fathom, Read.ai, or similar)
- "intro": A warm introduction from an investor or mutual connection
- "portfolio_update": An update from a portfolio company founder
- "irrelevant": Not relevant to deal flow

Then extract:
- email_type: one of the above
- company_name: the company being discussed (null if irrelevant)
- founder_name: founder's name if identifiable (null if not)
- one_liner: one sentence describing what the company does (null if unclear)
- stage: funding stage if mentioned (null if not)
- key_points: array of 3-5 most important points from the email (empty if irrelevant)
- meeting_date: ISO date if this is a transcript with a clear meeting date (null otherwise)
- next_steps: array of next steps or action items (empty if none)
- urgency: "high" | "medium" | "low"

Return ONLY valid JSON, no other text."""

    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text.strip()
        # Strip markdown code fences if present
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as e:
        logger.error(f"classify_email failed: {e}")
        return {
            "email_type": "irrelevant",
            "company_name": None,
            "founder_name": None,
            "one_liner": None,
            "stage": None,
            "key_points": [],
            "meeting_date": None,
            "next_steps": [],
            "urgency": "low",
        }


# ── Sender parsing ────────────────────────────────────────────────────────────

def _parse_sender(sender: str) -> tuple[str, str]:
    """Parse a 'Display Name <email@example.com>' header into (name, email).
    Falls back to (sender, sender) if the format is not recognisable."""
    m = re.match(r'^"?([^"<]*)"?\s*<([^>]+)>', sender.strip())
    if m:
        return m.group(1).strip(), m.group(2).strip()
    # Plain email address with no display name
    if "@" in sender:
        return "", sender.strip()
    return sender.strip(), ""


# ── Company / score helpers ───────────────────────────────────────────────────

async def _find_or_create_company(name: str, email_data: dict, db: AsyncSession) -> Company:
    """Find existing company by name or create a minimal record."""
    result = await db.execute(
        select(Company).where(Company.name == name).limit(1)
    )
    company = result.scalars().first()
    if not company:
        company = Company(
            id=uuid.uuid4(),
            name=name,
            one_liner=email_data.get("one_liner"),
            funding_stage=email_data.get("stage"),
            source="email",
        )
        db.add(company)
        await db.flush()  # get company.id without full commit
    return company


async def _find_or_create_score(
    company: Company,
    user_id: str,
    source: str,
    db: AsyncSession,
    fit_score: int = 3,
    fit_reasoning: str = "",
    mandate_category: str = "",
    comparable_companies: list = None,
    email_subject: str = None,
    email_body_raw: str = None,
    introducer_name: str = None,
    introducer_email: str = None,
) -> FirmCompanyScore:
    result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.company_id == company.id)
        .where(FirmCompanyScore.user_id == user_id)
    )
    score = result.scalars().first()
    if not score:
        score = FirmCompanyScore(
            company_id=company.id,
            user_id=user_id,
            fit_score=fit_score,
            fit_reasoning=fit_reasoning or None,
            mandate_category=mandate_category or None,
            comparable_companies=comparable_companies or [],
            pipeline_status="new",
            source=source,
            email_subject=email_subject or None,
            email_body_raw=email_body_raw or None,
            introducer_name=introducer_name or None,
            introducer_email=introducer_email or None,
        )
        db.add(score)
        await db.flush()
    return score


# ── Handlers ─────────────────────────────────────────────────────────────────

async def handle_pitch(
    email_data: dict,
    user_id: str,
    firm_profile: FirmProfile,
    db: AsyncSession,
    source: str = "email_pitch",
    email_subject: str = None,
    email_body_raw: str = None,
    introducer_name: str = None,
    introducer_email: str = None,
) -> dict:
    company_name = email_data.get("company_name")
    founder_name = email_data.get("founder_name")
    logger.info(f"Gmail handle_pitch: company={company_name}, founder={founder_name}")
    if not company_name:
        return {"action": "skipped", "reason": "no company name"}

    company = await _find_or_create_company(company_name, email_data, db)

    # Enrich company.one_liner from email if not already set
    if not company.one_liner and email_data.get("one_liner"):
        company.one_liner = email_data["one_liner"]
        await db.flush()

    # Build rich description from email classification fields
    description = (
        f"{email_data.get('one_liner', '')}. "
        f"{' '.join(email_data.get('key_points', []))}. "
        f"Stage: {email_data.get('stage', 'unknown')}. "
        f"Founded by {email_data.get('founder_name', 'unknown')}."
    )

    # Run classifier with email-derived signal
    fit_score = 3
    fit_reasoning = ""
    mandate_category = ""
    comparable_companies = []
    try:
        classification = await classify_startup(
            name=company_name,
            description=description,
            website=company.website,
            source=source,
            firm=firm_profile,
        )
        fit_score = classification.get("fit_score", 3)
        fit_reasoning = classification.get("fit_reasoning", "")
        mandate_category = classification.get("mandate_category", "")
        comparable_companies = classification.get("comparable_companies", [])
        logger.info(f"Gmail classify_startup result: company={company_name} fit_score={fit_score}")
    except Exception as e:
        logger.warning(f"Gmail classify_startup failed for {company_name}, falling back to fit_score=3: {e}")

    score = await _find_or_create_score(
        company, user_id, source, db,
        fit_score=fit_score,
        fit_reasoning=fit_reasoning,
        mandate_category=mandate_category,
        comparable_companies=comparable_companies,
        email_subject=email_subject,
        email_body_raw=email_body_raw,
        introducer_name=introducer_name,
        introducer_email=introducer_email,
    )
    logger.info(f"Gmail pitch processed: company={company_name} added to pipeline for user {user_id}")

    if fit_score >= 4:
        event_type = "new_top_match"
    elif fit_score == 3:
        event_type = "new_strong_fit"
    else:
        event_type = "new_possible_fit"

    notif = Notification(
        user_id=user_id,
        event_type=event_type,
        title=f"Inbound pitch: {company_name}",
        body=f"{email_data.get('one_liner') or 'New pitch via email.'}",
        company_id=company.id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={
            "source": source,
            "founder_name": email_data.get("founder_name"),
            "urgency": email_data.get("urgency"),
            "key_points": email_data.get("key_points", []),
        },
    )
    db.add(notif)
    await db.commit()
    return {"action": "pitch_added", "company": company_name, "fit_score": fit_score}


async def handle_transcript(
    email_data: dict,
    user_id: str,
    firm_profile: FirmProfile,
    db: AsyncSession,
) -> dict:
    company_name = email_data.get("company_name")
    if not company_name:
        return {"action": "skipped", "reason": "no company name"}

    company = await _find_or_create_company(company_name, email_data, db)
    score = await _find_or_create_score(company, user_id, "email_transcript", db)

    # Append meeting notes
    notes_entry = {
        "date": email_data.get("meeting_date") or datetime.utcnow().date().isoformat(),
        "source": "transcript",
        "key_points": email_data.get("key_points", []),
        "next_steps": email_data.get("next_steps", []),
    }
    existing_notes = score.meeting_notes or []
    score.meeting_notes = existing_notes + [notes_entry]

    # Write to ActivityEvent so the Activity tab shows transcripts
    try:
        from app.services.activity_writer import write_activity
        key_points = email_data.get("key_points", [])
        detail = key_points[0] if key_points else "Notes imported from AI notetaker"
        await write_activity(
            db=db,
            company_id=company.id,
            startup_name=company_name,
            event_type="meeting_note_added",
            title=f"Meeting transcript added — {company_name}",
            detail=detail,
            user_id=user_id,
        )
    except Exception as e:
        logger.warning(f"Failed to write transcript activity for {company_name}: {e}")

    notif = Notification(
        user_id=user_id,
        event_type="research_complete",
        title=f"Meeting transcript: {company_name}",
        body=f"Call notes added for {company_name}.",
        company_id=company.id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={"key_points": email_data.get("key_points", [])},
    )
    db.add(notif)
    await db.commit()
    return {"action": "transcript_added", "company": company_name}


async def handle_intro(
    email_data: dict,
    user_id: str,
    firm_profile: FirmProfile,
    db: AsyncSession,
    email_subject: str = None,
    email_body_raw: str = None,
    raw_sender: str = None,
) -> dict:
    intro_name, intro_email = _parse_sender(raw_sender or "")
    return await handle_pitch(
        email_data, user_id, firm_profile, db,
        source="email_intro",
        email_subject=email_subject,
        email_body_raw=email_body_raw,
        introducer_name=intro_name or None,
        introducer_email=intro_email or None,
    )


async def handle_portfolio_update(
    email_data: dict,
    user_id: str,
    firm_profile: FirmProfile,
    db: AsyncSession,
) -> dict:
    company_name = email_data.get("company_name")
    if not company_name:
        return {"action": "skipped", "reason": "no company name"}

    # Find existing portfolio company only — don't create
    result = await db.execute(
        select(FirmCompanyScore)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(Company.name == company_name)
        .limit(1)
    )
    score = result.scalars().first()
    if not score:
        return {"action": "skipped", "reason": "portfolio company not found"}

    notes_entry = {
        "date": datetime.utcnow().date().isoformat(),
        "source": "portfolio_update_email",
        "key_points": email_data.get("key_points", []),
        "next_steps": email_data.get("next_steps", []),
    }
    score.meeting_notes = (score.meeting_notes or []) + [notes_entry]

    notif = Notification(
        user_id=user_id,
        event_type="company_signal",
        title=f"Portfolio update: {company_name}",
        body="; ".join(email_data.get("key_points", [])[:2]) or "New update from portfolio company.",
        company_id=score.company_id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={"source": "portfolio_update_email"},
    )
    db.add(notif)
    await db.commit()
    return {"action": "portfolio_update_saved", "company": company_name}


# ── Main orchestrator ─────────────────────────────────────────────────────────

async def process_new_emails(user_id: str, db: AsyncSession) -> dict:
    """Fetch and process recent unread Gmail messages for a user."""
    # Load connection
    result = await db.execute(
        select(GmailConnection)
        .where(GmailConnection.user_id == user_id)
        .where(GmailConnection.is_active == True)
    )
    conn = result.scalars().first()
    if not conn:
        return {"processed": 0, "results": [], "error": "No active Gmail connection"}

    # Refresh token if expired
    if _token_is_expired(conn):
        ok = await _refresh_access_token(conn, db)
        if not ok:
            return {"processed": 0, "results": [], "error": "Token refresh failed"}

    # Load firm profile
    profile_result = await db.execute(
        select(FirmProfile)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    firm_profile = profile_result.scalars().first()
    if not firm_profile:
        return {"processed": 0, "results": [], "error": "No firm profile"}

    headers = _auth_headers(conn.access_token)
    results = []
    processed = 0

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # List recent unread messages
            list_resp = await client.get(
                f"{GMAIL_BASE}/messages",
                headers=headers,
                params={"q": "is:unread newer_than:1d", "maxResults": 20},
            )
            list_data = list_resp.json()
    except Exception as e:
        logger.error(f"Gmail list messages failed for {user_id}: {e}")
        return {"processed": 0, "results": [], "error": str(e)}

    messages = list_data.get("messages", [])
    if not messages:
        await _update_connection(conn, db)
        return {"processed": 0, "results": []}

    for msg_ref in messages:
        msg_id = msg_ref.get("id")
        if not msg_id:
            continue
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                msg_resp = await client.get(
                    f"{GMAIL_BASE}/messages/{msg_id}",
                    headers=headers,
                    params={"format": "full"},
                )
                msg = msg_resp.json()

            payload = msg.get("payload", {})
            msg_headers = payload.get("headers", [])
            subject = _extract_headers(msg_headers, "Subject")
            sender = _extract_headers(msg_headers, "From")
            body = _extract_body(payload)

            if not subject and not body:
                continue

            # Classify
            email_data = await classify_email(subject, sender, body, firm_profile)
            logger.info(f"Gmail classified email as: {email_data.get('email_type')} — company: {email_data.get('company_name')}")
            email_type = email_data.get("email_type", "irrelevant")

            # Route to handler
            body_truncated = body[:3000] if body else None
            if email_type == "pitch":
                action_result = await handle_pitch(
                    email_data, user_id, firm_profile, db,
                    email_subject=subject or None,
                    email_body_raw=body_truncated,
                )
            elif email_type == "transcript":
                action_result = await handle_transcript(email_data, user_id, firm_profile, db)
            elif email_type == "intro":
                action_result = await handle_intro(
                    email_data, user_id, firm_profile, db,
                    email_subject=subject or None,
                    email_body_raw=body_truncated,
                    raw_sender=sender,
                )
            elif email_type == "portfolio_update":
                action_result = await handle_portfolio_update(email_data, user_id, firm_profile, db)
            else:
                action_result = {"action": "irrelevant"}

            # Mark as read if successfully handled
            if action_result.get("action") not in ("irrelevant", "skipped"):
                try:
                    async with httpx.AsyncClient(timeout=15) as client:
                        await client.post(
                            f"{GMAIL_BASE}/messages/{msg_id}/modify",
                            headers=headers,
                            json={"removeLabelIds": ["UNREAD"]},
                        )
                except Exception as e:
                    logger.warning(f"Failed to mark message {msg_id} as read: {e}")

            results.append({
                "message_id": msg_id,
                "subject": subject[:100] if subject else "",
                "email_type": email_type,
                **action_result,
            })
            processed += 1

        except Exception as e:
            logger.error(f"Gmail processing error for message {msg_id}: {e}", exc_info=True)
            continue

    await _update_connection(conn, db, list_data.get("historyId"))
    return {"processed": processed, "results": results}


async def scan_sent_mail(user_id: str, db: AsyncSession) -> dict:
    """Scan sent mail and log outbound emails to known portfolio/pipeline companies."""
    result = await db.execute(
        select(GmailConnection)
        .where(GmailConnection.user_id == user_id)
        .where(GmailConnection.is_active == True)
    )
    conn = result.scalars().first()
    if not conn:
        return {"logged": 0, "error": "No active Gmail connection"}

    if _token_is_expired(conn):
        ok = await _refresh_access_token(conn, db)
        if not ok:
            return {"logged": 0, "error": "Token refresh failed"}

    from app.services.activity_writer import write_activity
    from app.models.activity_event import ActivityEvent

    headers = _auth_headers(conn.access_token)
    logged = 0

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            list_resp = await client.get(
                f"{GMAIL_BASE}/messages",
                headers=headers,
                params={"q": "in:sent newer_than:1d", "maxResults": 50},
            )
        list_data = list_resp.json()
    except Exception as e:
        logger.error(f"scan_sent_mail list failed for {user_id}: {e}")
        return {"logged": 0, "error": str(e)}

    messages = list_data.get("messages", [])
    if not messages:
        return {"logged": 0}

    for msg_ref in messages:
        msg_id = msg_ref.get("id")
        if not msg_id:
            continue
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                msg_resp = await client.get(
                    f"{GMAIL_BASE}/messages/{msg_id}",
                    headers=headers,
                    params={"format": "metadata", "metadataHeaders": ["To", "Subject"]},
                )
            msg = msg_resp.json()
            msg_headers = (msg.get("payload") or {}).get("headers", [])
            to_header = _extract_headers(msg_headers, "To")
            subject = _extract_headers(msg_headers, "Subject") or "(no subject)"

            # Extract domain from To: address
            to_email = ""
            m = re.search(r"[\w.\-+]+@([\w.\-]+)", to_header)
            if not m:
                continue
            to_email = m.group(0)
            domain = m.group(1).lower()

            # Find a company whose website contains this domain, with a score for this user
            company_result = await db.execute(
                select(Company, FirmCompanyScore)
                .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                .where(FirmCompanyScore.user_id == user_id)
                .where(Company.website.ilike(f"%{domain}%"))
                .limit(1)
            )
            row = company_result.first()
            if not row:
                continue
            company, score = row

            # Dedup: check if this gmail message id was already logged in detail field
            dedup_key = f"gmail_msg_id:{msg_id}"
            existing = await db.execute(
                select(ActivityEvent)
                .where(ActivityEvent.company_id == company.id)
                .where(ActivityEvent.user_id == user_id)
                .where(ActivityEvent.event_type == "email_sent")
                .where(ActivityEvent.detail.like(f"%{dedup_key}%"))
                .limit(1)
            )
            if existing.scalars().first():
                continue

            await write_activity(
                db=db,
                company_id=company.id,
                startup_name=company.name,
                event_type="email_sent",
                title=f"Email sent to {company.name}",
                detail=f"{dedup_key} | {subject}",
                user_id=user_id,
            )
            logged += 1

        except Exception as e:
            logger.warning(f"scan_sent_mail error for message {msg_id}: {e}")
            continue

    logger.info(f"scan_sent_mail: logged {logged} sent emails for user {user_id}")
    return {"logged": logged}


async def _update_connection(
    conn: GmailConnection,
    db: AsyncSession,
    history_id: Optional[str] = None,
) -> None:
    conn.last_checked_at = datetime.utcnow()
    if history_id:
        conn.history_id = str(history_id)
    await db.commit()
