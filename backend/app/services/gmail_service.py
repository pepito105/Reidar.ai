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
            fit_score=3,
            pipeline_status="new",
            source=source,
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
) -> dict:
    company_name = email_data.get("company_name")
    founder_name = email_data.get("founder_name")
    logger.info(f"Gmail handle_pitch: company={company_name}, founder={founder_name}")
    if not company_name:
        return {"action": "skipped", "reason": "no company name"}

    company = await _find_or_create_company(company_name, email_data, db)
    score = await _find_or_create_score(company, user_id, source, db)
    logger.info(f"Gmail pitch processed: company={company_name} added to pipeline for user {user_id}")

    notif = Notification(
        user_id=user_id,
        event_type="new_strong_fit",
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
    return {"action": "pitch_added", "company": company_name}


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
) -> dict:
    return await handle_pitch(email_data, user_id, firm_profile, db, source="email_intro")


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
            if email_type == "pitch":
                action_result = await handle_pitch(email_data, user_id, firm_profile, db)
            elif email_type == "transcript":
                action_result = await handle_transcript(email_data, user_id, firm_profile, db)
            elif email_type == "intro":
                action_result = await handle_intro(email_data, user_id, firm_profile, db)
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


async def _update_connection(
    conn: GmailConnection,
    db: AsyncSession,
    history_id: Optional[str] = None,
) -> None:
    conn.last_checked_at = datetime.utcnow()
    if history_id:
        conn.history_id = str(history_id)
    await db.commit()
