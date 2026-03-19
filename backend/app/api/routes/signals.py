import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.models.signal import CompanySignal
from app.core.config import settings
from app.services.classifier import classify_batch
import anthropic
from datetime import datetime, timedelta

router = APIRouter(prefix="/signals")


def _user_id_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            return decoded.get("sub")
        except Exception:
            return None
    return None


class SignalsRequest(BaseModel):
    days: int = 7
    since: Optional[str] = None


@router.post("/hot-signals")
async def generate_hot_signals(request: Request, data: SignalsRequest, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1))
    profile = profile_result.scalars().first()
    thesis = profile.investment_thesis if profile else "Early-stage technology companies"
    firm_name = profile.firm_name if profile else "the firm"

    now = datetime.utcnow()

    # Find last scrape timestamp from companies table
    last_scrape_result = await db.execute(select(func.max(Company.scraped_at)))
    last_scraped = last_scrape_result.scalar()
    if last_scraped:
        if hasattr(last_scraped, 'tzinfo') and last_scraped.tzinfo is not None:
            last_scraped = last_scraped.replace(tzinfo=None)
        since = last_scraped - timedelta(hours=12)
    else:
        since = now - timedelta(days=data.days)

    # 1) New companies from the last scrape (scoped to this user)
    new_result = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(Company.scraped_at >= since)
        .order_by(FirmCompanyScore.fit_score.desc().nulls_last())
        .limit(25)
    )
    new_rows = new_result.fetchall()
    new_list = "\n".join([
        f"- {row[0].name} (Fit {row[1].fit_score or 0}/5): {row[0].one_liner or 'No description'} | {row[0].sector or 'Unknown'} | {row[0].funding_stage or 'Unknown'}"
        for row in new_rows
    ]) if new_rows else "None."

    # 2) Existing companies with new signals (scoped to this user via FirmCompanyScore)
    signals_result = await db.execute(
        select(CompanySignal, Company.name, Company.one_liner, FirmCompanyScore.fit_score)
        .join(Company, CompanySignal.company_id == Company.id)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(CompanySignal.detected_at >= since)
        .order_by(CompanySignal.detected_at.desc())
        .limit(50)
    )
    signal_rows = signals_result.fetchall()
    seen_company_ids = set()
    signals_by_company = []
    for sig, cname, one_liner, fit in signal_rows:
        if sig.company_id in seen_company_ids:
            continue
        seen_company_ids.add(sig.company_id)
        signals_by_company.append({"name": cname, "fit_score": fit, "signals": []})
    for sig, cname, one_liner, fit in signal_rows:
        for rec in signals_by_company:
            if rec["name"] == cname:
                rec["signals"].append({"title": sig.title})
                break
    signals_list = "\n".join([
        f"- {r['name']} (Fit {r['fit_score'] or 0}/5): " + "; ".join(s["title"] for s in r["signals"][:3])
        for r in signals_by_company[:15]
    ]) if signals_by_company else "None."

    # 3) Pipeline deals needing attention
    pipeline_result = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
    )
    pipeline_rows = pipeline_result.fetchall()
    stale_days = 7
    stale_cutoff = now - timedelta(days=stale_days)
    needs_attention = []
    for row in pipeline_rows:
        company, score = row[0], row[1]
        last = score.last_refreshed_at
        if last and hasattr(last, 'tzinfo') and last.tzinfo is not None:
            last = last.replace(tzinfo=None)
        if last is None or last < stale_cutoff:
            needs_attention.append({
                "name": company.name,
                "pipeline_status": score.pipeline_status,
                "one_liner": company.one_liner or "",
            })
    pipeline_list = "\n".join([
        f"- {p['name']} ({p['pipeline_status']}): {p['one_liner'][:80]}"
        for p in needs_attention[:15]
    ]) if needs_attention else "None."

    prompt = f"""You are a senior investment analyst at {firm_name}. You are writing the weekly Hot Signals brief — a sharp, opinionated market intelligence report customized to the firm's thesis.

FIRM THESIS: {thesis}

Apply these analytical lenses throughout: (1) Timing — why now or why not yet, (2) Whitespace — what's missing in the market, (3) Vulnerability — which incumbents are exposed, (4) Conviction confidence — rate based on signal strength not just fit score.

DATA FROM THE LAST SCRAPE:

NEW COMPANIES SOURCED (sorted by thesis fit):
{new_list}

EXISTING PORTFOLIO WATCH COMPANIES WITH NEW SIGNALS:
{signals_list}

PIPELINE DEALS NEEDING ATTENTION (no activity in {stale_days}+ days):
{pipeline_list}

Write a Hot Signals brief with exactly these sections using markdown headers:

## 🔥 What's Moving This Week
2-3 sentences on the macro theme you're seeing in the deal flow. What's the dominant pattern? What does the volume and type of companies in this batch tell you about where the market is heading? Be specific and opinionated — not generic.

## ⭐ Top Picks This Scrape
Pick the 3-5 highest conviction companies from the new list. For each, write 2 sentences: what they do (using the "We help X do Y by Z" framing) and why they fit the thesis right now. Include the fit score. Be selective — if nothing scores above 3, say so honestly.

## 📡 Signal Watch
Highlight 2-3 existing companies with notable new signals. What's the signal and why does it matter for the investment thesis? Skip companies with weak signals.

## ⚡ Pipeline Nudges
For each deal needing attention, give one specific suggested action (e.g. "Follow up on the Series A close — if they've raised, move to passed or diligence"). Be direct. If the pipeline is clean, say so.

## 🕐 Why Now
Using a timing scorecard: what macro tailwinds (regulatory shifts, model capability jumps, enterprise AI adoption curves) make this week's batch particularly interesting or uninteresting for the firm's thesis? Rate the overall timing: Strong Tailwind / Neutral / Headwind. One short paragraph, specific to what you're seeing in the data.

## 🗺 Whitespace & Vulnerability
Two parts:
1. Whitespace: Based on all companies in this batch, name one specific problem in the firm's thesis area that nobody is solving well yet. Be precise — not "AI for healthcare" but "real-time prior authorization automation for specialty drugs."
2. Competitor vulnerability: Which incumbent or well-funded player in this space looks most exposed by what you're seeing in this batch? Why?

## 🎯 One Company With Highest Conviction
Name one company from the new batch and make the bull case in 3 sentences. Why now, why this team, why this fits the thesis better than anything else this week. End with: "Confidence: High/Medium/Low — [one sentence explaining the confidence level based on available signals]"

Be specific, use company names and numbers, stay under 700 words total. Write like a partner at a top-tier VC firm, not like a bot summarizing a database."""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        brief_text = message.content[0].text
    except anthropic.RateLimitError:
        raise HTTPException(status_code=503, detail="Claude API rate limit reached. Please try again in a few minutes.")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=503, detail="Claude API is unreachable. Check your connection or try again later.")
    except anthropic.APITimeoutError:
        raise HTTPException(status_code=504, detail="Claude API request timed out. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Brief generation failed: {str(e)}")

    return {
        "brief": brief_text,
        "days": data.days,
        "new_count": len(new_rows),
        "signals_count": len(signals_by_company),
        "pipeline_attention_count": len(needs_attention),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/feed")
async def get_activity_feed(
    request: Request,
    days: int = 30,
    signal_type: str = None,
    unseen_only: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)
    since = datetime.utcnow() - timedelta(days=days)
    query = (
        select(CompanySignal, Company.name, Company.one_liner, FirmCompanyScore.fit_score)
        .join(Company, CompanySignal.company_id == Company.id)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(CompanySignal.detected_at >= since)
    )
    if signal_type:
        query = query.where(CompanySignal.signal_type == signal_type)
    if unseen_only:
        query = query.where(CompanySignal.is_seen == False)
    query = query.order_by(desc(CompanySignal.detected_at)).limit(limit)
    result = await db.execute(query)
    rows = result.fetchall()

    unseen_result = await db.execute(
        select(CompanySignal)
        .join(Company, CompanySignal.company_id == Company.id)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(CompanySignal.is_seen == False)
    )
    unseen_count = len(unseen_result.scalars().all())

    ICONS = {
        "funding_round": "🟢", "headcount_growth": "📈",
        "product_launch": "🚀", "news_mention": "📰",
        "leadership_change": "👤", "traction_update": "⚡",
    }

    feed = []
    for signal, company_name, one_liner, fit_score in rows:
        feed.append({
            "id": signal.id,
            "startup_id": str(signal.company_id),
            "company_name": company_name,
            "company_one_liner": one_liner,
            "company_fit_score": fit_score,
            "signal_type": signal.signal_type,
            "icon": ICONS.get(signal.signal_type, "📡"),
            "title": signal.title,
            "summary": signal.summary,
            "is_seen": signal.is_seen,
            "detected_at": (signal.detected_at.isoformat() + "Z") if signal.detected_at else None,
        })

    return {"feed": feed, "total": len(feed), "unseen_count": unseen_count, "days": days}


@router.post("/mark-all-seen")
async def mark_all_seen(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(CompanySignal)
        .join(Company, CompanySignal.company_id == Company.id)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(CompanySignal.is_seen == False)
    )
    signals = result.scalars().all()
    for s in signals:
        s.is_seen = True
    # Clear has_unseen_signals on all user's scores
    scores_result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.has_unseen_signals == True)
    )
    for score in scores_result.scalars().all():
        score.has_unseen_signals = False
    await db.commit()
    return {"success": True, "marked_seen": len(signals)}


@router.post("/mark-seen/{startup_id}")
async def mark_company_seen(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Mark signals seen for a company. startup_id is FirmCompanyScore.id (UUID string)."""
    user_id = _user_id_from_request(request)
    import uuid as _uuid
    try:
        score_uuid = _uuid.UUID(startup_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid ID: {startup_id}")

    # Get the score to find company_id
    score_result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )
    score = score_result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Not found")

    # Mark all signals for this company as seen
    sigs_result = await db.execute(
        select(CompanySignal).where(
            CompanySignal.company_id == score.company_id,
            CompanySignal.is_seen == False
        )
    )
    for s in sigs_result.scalars().all():
        s.is_seen = True
    score.has_unseen_signals = False
    await db.commit()
    return {"success": True}


@router.get("/company/{startup_id}")
async def get_company_signals(
    startup_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get signals for a company. startup_id is FirmCompanyScore.id (UUID string)."""
    user_id = _user_id_from_request(request)
    import uuid as _uuid
    try:
        score_uuid = _uuid.UUID(startup_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid ID: {startup_id}")

    score_result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )
    score = score_result.scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Startup not found")

    result = await db.execute(
        select(CompanySignal)
        .where(CompanySignal.company_id == score.company_id)
        .order_by(desc(CompanySignal.detected_at))
        .limit(10)
    )
    signals = result.scalars().all()
    ICONS = {
        "funding_round": "🟢", "headcount_growth": "📈",
        "product_launch": "🚀", "news_mention": "📰",
        "leadership_change": "👤", "traction_update": "⚡",
    }
    return {
        "signals": [
            {
                "id": s.id,
                "signal_type": s.signal_type,
                "icon": ICONS.get(s.signal_type, "📡"),
                "title": s.title,
                "summary": s.summary,
                "is_seen": s.is_seen,
                "detected_at": (s.detected_at.isoformat() + "Z") if s.detected_at else None,
            }
            for s in signals
        ],
        "total": len(signals),
    }


@router.post("/notifications/test")
async def test_notification(
    request: Request,
    notification_type: str = "top_match",
    db: AsyncSession = Depends(get_db)
):
    """Test endpoint to trigger notification emails manually."""
    user_id = _user_id_from_request(request)
    from app.services.notification_service import (
        send_sourcing_alert,
        send_diligence_batch_alert,
        send_weekly_summary,
    )

    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1))
    profile = profile_result.scalars().first()
    firm_name = profile.firm_name if profile else "Failup Ventures"
    notify_emails = profile.notification_emails if profile else None
    thesis = profile.investment_thesis if profile else ""

    if notification_type == "top_match":
        result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.fit_score >= 4)
            .order_by(FirmCompanyScore.fit_score.desc())
            .limit(5)
        )
        companies = [
            {
                "name": row[0].name,
                "fit_score": row[1].fit_score,
                "one_liner": row[0].one_liner,
                "funding_stage": row[0].funding_stage,
                "sector": row[0].sector,
            }
            for row in result.fetchall()
        ]
        success = await send_sourcing_alert(companies, firm_name, thesis=thesis, notification_emails=notify_emails)
        return {"sent": success, "type": "top_match", "companies": len(companies)}

    elif notification_type == "diligence":
        result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.pipeline_status == "diligence")
            .order_by(FirmCompanyScore.fit_score.desc())
            .limit(1)
        )
        row = result.first()
        if not row:
            result2 = await db.execute(
                select(Company, FirmCompanyScore)
                .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                .where(FirmCompanyScore.user_id == user_id)
                .order_by(FirmCompanyScore.fit_score.desc())
                .limit(1)
            )
            row = result2.first()
        if not row:
            return {"sent": False, "error": "No companies in database"}
        company, score = row[0], row[1]
        mock_signals = [
            {"signal_type": "funding_round", "title": "Raised $4M seed round", "summary": "Led by Benchmark with participation from YC."},
            {"signal_type": "product_launch", "title": "Launched v2 with new AI features", "summary": "Major product update including automated workflow builder."},
        ]
        success = await send_diligence_batch_alert(
            alerts=[{
                "company_name": company.name,
                "signals": mock_signals,
                "fit_score": score.fit_score or 4,
            }],
            firm_name=firm_name,
            thesis=thesis,
            notification_emails=notify_emails,
        )
        return {"sent": success, "type": "diligence", "company": company.name}

    elif notification_type == "weekly":
        week_cutoff = datetime.utcnow() - timedelta(days=7)
        new_result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.fit_score >= 4)
            .order_by(FirmCompanyScore.fit_score.desc())
            .limit(10)
        )
        new_companies = [
            {"name": row[0].name, "fit_score": row[1].fit_score, "one_liner": row[0].one_liner,
             "funding_stage": row[0].funding_stage, "sector": row[0].sector}
            for row in new_result.fetchall()
        ]
        pipeline_result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.pipeline_status.in_(
                ["watching", "outreach", "diligence", "passed", "invested"]
            ))
        )
        pipeline_summary = {}
        for row in pipeline_result.fetchall():
            stage = row[1].pipeline_status
            if stage not in pipeline_summary:
                pipeline_summary[stage] = []
            pipeline_summary[stage].append({"name": row[0].name})
        stale_result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
            .limit(3)
        )
        stale_deals = [
            {"name": row[0].name, "pipeline_status": row[1].pipeline_status, "one_liner": row[0].one_liner}
            for row in stale_result.fetchall()
        ]
        success = await send_weekly_summary(new_companies, pipeline_summary, stale_deals, firm_name, notification_emails=notify_emails)
        return {"sent": success, "type": "weekly"}

    return {"error": f"Unknown notification type: {notification_type}. Use: top_match, diligence, weekly"}


@router.post("/research/test")
async def test_research(
    request: Request,
    company_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Test autonomous research on a single company or run a small batch."""
    user_id = _user_id_from_request(request)
    from app.services.research_service import research_company, run_research_batch

    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1))
    profile = profile_result.scalars().first()
    firm_mandate = profile.investment_thesis if profile else ""

    if company_id:
        import uuid as _uuid
        try:
            cid = _uuid.UUID(company_id)
        except Exception:
            return {"error": f"Invalid company_id: {company_id}"}
        result = await db.execute(select(Company).where(Company.id == cid))
        company = result.scalar_one_or_none()
        if not company:
            return {"error": f"Company {company_id} not found"}
        success = await research_company(company, db, firm_mandate)
        return {
            "success": success,
            "company": company.name,
            "research_status": company.research_status,
            "enriched_one_liner": company.enriched_one_liner,
            "business_model": company.business_model,
            "target_customer": company.target_customer,
            "traction_signals": company.traction_signals,
            "red_flags": company.key_risks,
        }
    else:
        stats = await run_research_batch(db, limit=3)
        return {"stats": stats}


@router.post("/sourcing/test")
async def test_sourcing(
    request: Request,
    custom_brief: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Test autonomous sourcing — generates queries and finds new companies."""
    user_id = _user_id_from_request(request)
    from app.services.sourcing_service import run_autonomous_sourcing
    stats = await run_autonomous_sourcing(db, custom_brief=custom_brief, user_id=user_id)
    return stats


def _normalize_key_risks_or_bull_case(value):
    """If value is a list, join with '\n\n'; otherwise return as-is."""
    if isinstance(value, list):
        return "\n\n".join(str(x) for x in value)
    return value


@router.post("/rescore-all")
async def rescore_all(request: Request, db: AsyncSession = Depends(get_db)):
    """Rescore all companies in batches of 20 using classify_batch."""
    user_id = _user_id_from_request(request)
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1))
    profile = profile_result.scalars().first()
    if not profile:
        raise HTTPException(status_code=400, detail="No active firm profile")

    rows_result = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
    )
    rows = rows_result.fetchall()
    total = len(rows)
    if total == 0:
        return {"status": "complete", "total": 0, "batches": 0, "updated": 0}

    batch_size = 20
    batches = (total + batch_size - 1) // batch_size
    updated = 0
    for i in range(0, total, batch_size):
        chunk = rows[i: i + batch_size]
        companies_input = [
            {
                "id": i + j,  # sequential int for classify_batch
                "name": row[0].name,
                "description": (row[0].one_liner or "") + " " + (row[0].ai_summary or ""),
                "website": row[0].website,
                "source": row[0].source or "",
            }
            for j, row in enumerate(chunk)
        ]
        classifications = await classify_batch(companies_input, profile)
        idx_to_row = {i + j: row for j, row in enumerate(chunk)}
        for res in classifications:
            rid = res.get("id")
            row = idx_to_row.get(rid) if rid is not None else None
            if not row:
                continue
            company, score = row[0], row[1]
            if res.get("one_liner"):
                company.one_liner = (res["one_liner"] or "")[:499]
            if res.get("fit_score") is not None:
                score.fit_score = res["fit_score"]
            if res.get("business_model"):
                company.business_model = (res["business_model"] or "")[:499]
            if res.get("target_customer"):
                company.target_customer = (res["target_customer"] or "")[:499]
            if res.get("sector"):
                company.sector = (res["sector"] or "")[:99]
            if res.get("mandate_category"):
                score.mandate_category = (res["mandate_category"] or "")[:99]
            if res.get("thesis_tags") is not None:
                score.thesis_tags = res["thesis_tags"] if isinstance(res["thesis_tags"], list) else []
            if res.get("funding_stage"):
                company.funding_stage = (res["funding_stage"] or "unknown")[:49]
            updated += 1
        await db.commit()
        if i + batch_size < total:
            await asyncio.sleep(2)
    return {"status": "complete", "total": total, "batches": batches, "updated": updated}


@router.post("/rescore-unscored")
async def rescore_unscored(request: Request, db: AsyncSession = Depends(get_db)):
    """Rescore only companies where fit_score IS NULL, in batches of 20."""
    user_id = _user_id_from_request(request)
    profile_result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=400, detail="No active firm profile")

    rows_result = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.fit_score == None)
    )
    rows = rows_result.fetchall()
    total = len(rows)
    if total == 0:
        return {"status": "complete", "total": 0, "batches": 0, "updated": 0}

    batch_size = 20
    batches = (total + batch_size - 1) // batch_size
    updated = 0
    for i in range(0, total, batch_size):
        chunk = rows[i: i + batch_size]
        companies_input = [
            {
                "id": i + j,
                "name": row[0].name,
                "description": (row[0].one_liner or "") + " " + (row[0].ai_summary or ""),
                "website": row[0].website,
                "source": row[0].source or "",
            }
            for j, row in enumerate(chunk)
        ]
        classifications = await classify_batch(companies_input, profile)
        idx_to_row = {i + j: row for j, row in enumerate(chunk)}
        for res in classifications:
            rid = res.get("id")
            row = idx_to_row.get(rid) if rid is not None else None
            if not row:
                continue
            company, score = row[0], row[1]
            if res.get("one_liner"):
                company.one_liner = (res["one_liner"] or "")[:499]
            if res.get("fit_score") is not None:
                score.fit_score = res["fit_score"]
            if res.get("business_model"):
                company.business_model = (res["business_model"] or "")[:499]
            if res.get("target_customer"):
                company.target_customer = (res["target_customer"] or "")[:499]
            if res.get("sector"):
                company.sector = (res["sector"] or "")[:99]
            if res.get("mandate_category"):
                score.mandate_category = (res["mandate_category"] or "")[:99]
            if res.get("thesis_tags") is not None:
                score.thesis_tags = res["thesis_tags"] if isinstance(res["thesis_tags"], list) else []
            if res.get("funding_stage"):
                company.funding_stage = (res["funding_stage"] or "unknown")[:49]
            updated += 1
        await db.commit()
        if i + batch_size < total:
            await asyncio.sleep(2)
    return {"status": "complete", "total": total, "batches": batches, "updated": updated}


import json
import asyncio
from fastapi.responses import StreamingResponse

@router.get("/sourcing/stream")
async def sourcing_stream(request: Request, db: AsyncSession = Depends(get_db), token: Optional[str] = None):
    """SSE endpoint that streams sourcing progress events."""
    user_id = _user_id_from_request(request)
    if not user_id and token:
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            user_id = decoded.get("sub")
        except Exception:
            pass
    queue = asyncio.Queue()

    async def event_generator():
        async def emit(event_type: str, message: str, data: dict = None):
            payload = {"type": event_type, "message": message, **(data or {})}
            await queue.put(f"data: {json.dumps(payload)}\n\n")

        async def run_sourcing_with_events():
            try:
                if user_id:
                    profile_result = await db.execute(
                        select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id)
                    )
                else:
                    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
                profile = profile_result.scalar_one_or_none()
                if not profile:
                    await emit("error", "No firm profile configured")
                    await queue.put(None)
                    return

                await emit("start", f"Analyzing mandate for {profile.firm_name}...")
                await asyncio.sleep(0.5)

                from app.services.sourcing_service import generate_search_queries, search_and_extract_companies, is_duplicate
                from app.services.classifier import GLOBAL_FIELDS, FIRM_FIELDS
                from datetime import datetime as _dt

                queries = await generate_search_queries(profile.investment_thesis, profile.firm_name, firm_website=profile.firm_website, firm_context=profile.firm_context)
                await emit("queries", f"Generated {len(queries)} search queries", {"queries": queries})

                all_companies = []
                seen_names = set()

                for i, query in enumerate(queries):
                    await emit("searching", f"Search {i+1}/{len(queries)}: \"{query}\"", {"query": query})
                    companies = await search_and_extract_companies(query, profile.investment_thesis, profile.firm_name)
                    new = []
                    for c in companies:
                        name = c.get("name", "").strip()
                        if name and name.lower() not in seen_names and len(all_companies) < 20:
                            seen_names.add(name.lower())
                            all_companies.append(c)
                            new.append(c)
                    await emit("found", f"Found {len(new)} candidates from this search", {"count": len(new)})
                    if i < len(queries) - 1:
                        await emit("waiting", "Pausing between searches...")
                        await asyncio.sleep(5)

                # Deduplicate against DB
                new_companies = []
                for company in all_companies:
                    name = company.get("name")
                    website = company.get("website")
                    if not name:
                        continue
                    if await is_duplicate(website, name, db, user_id=user_id):
                        continue
                    new_companies.append(company)

                if not new_companies:
                    await emit("complete", "No new companies found this session", {"added": 0, "skipped": len(all_companies)})
                    await queue.put(None)
                    return

                # Save companies using two-layer pattern
                from app.services.sourcing_service import _find_global_company
                saved_pairs = []
                for company_data in new_companies:
                    name = company_data.get("name")
                    website = company_data.get("website")
                    try:
                        global_company = await _find_global_company(website, name, db)
                        if not global_company:
                            global_company = Company(
                                name=name,
                                website=website,
                                one_liner=company_data.get("one_liner"),
                                funding_stage=company_data.get("funding_stage", "unknown"),
                                sector=company_data.get("sector"),
                                source="autonomous_sourcing",
                                source_url=website,
                            )
                            db.add(global_company)
                            await db.flush()
                        score = FirmCompanyScore(
                            company_id=global_company.id,
                            user_id=user_id,
                            pipeline_status="new",
                        )
                        db.add(score)
                        await db.flush()
                        saved_pairs.append((global_company, score, company_data.get("one_liner") or name))
                    except Exception as e:
                        print(f"Failed to save {name}: {e}")
                        await db.rollback()

                await db.commit()
                await emit("scoring", f"Scoring {len(saved_pairs)} companies against your mandate...")

                # Fast batch scoring
                companies_input = [
                    {"id": j, "name": c.name, "description": desc, "website": c.website, "source": c.source}
                    for j, (c, s, desc) in enumerate(saved_pairs)
                ]
                try:
                    results = await classify_batch(companies_input, profile)
                    result_map = {r.get("id"): r for r in results if r.get("id") is not None}
                    added = 0
                    for j, (global_company, score, _) in enumerate(saved_pairs):
                        res = result_map.get(j)
                        if res:
                            for field in GLOBAL_FIELDS:
                                val = res.get(field)
                                if val is not None:
                                    setattr(global_company, field, val)
                            for field in FIRM_FIELDS:
                                val = res.get(field)
                                if val is not None:
                                    setattr(score, field, val)
                            fit = score.fit_score or 0
                            if fit >= (profile.fit_threshold or 3):
                                fit_label = "Top Match" if fit >= 5 else "Strong Fit" if fit >= 4 else "Possible Fit"
                                await emit("added", f"✓ {global_company.name} — {fit_label} ({fit}/5)", {"name": global_company.name, "fit_score": fit, "fit_label": fit_label})
                                added += 1
                    await db.commit()
                except Exception as e:
                    print(f"Batch classification error: {e}")
                    added = len(saved_pairs)

                await emit("complete", f"Done — {added} companies matched your mandate", {"added": added, "skipped": len(all_companies) - len(new_companies)})
                await queue.put(None)

            except Exception as e:
                await emit("error", f"Sourcing error: {str(e)}")
                await queue.put(None)

        asyncio.create_task(run_sourcing_with_events())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield item

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })
