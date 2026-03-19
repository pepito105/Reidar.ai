import json
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, or_, func
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any, Dict

logger = logging.getLogger(__name__)

import asyncio as _asyncio
# In-memory progress queues: startup_id -> asyncio.Queue
# Allows background research tasks to stream progress to SSE clients
_research_queues: dict[int, _asyncio.Queue] = {}


def _utc_isoformat(dt) -> Optional[str]:
    """Serialize datetime as UTC ISO string ending with Z so the frontend parses correctly."""
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        dt = dt.astimezone(timezone.utc)
    else:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
from app.core.database import get_db, AsyncSessionLocal
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile


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


router = APIRouter(prefix="/startups")

class StartupResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str]
    one_liner: Optional[str]
    ai_summary: Optional[str]
    website: Optional[str]
    founding_year: Optional[int]
    funding_stage: Optional[str]
    funding_amount_usd: Optional[float]
    top_investors: Optional[List[Any]]
    ai_score: Optional[int]
    fit_score: Optional[int]
    fit_reasoning: Optional[str]
    thesis_tags: Optional[List[Any]]
    sector: Optional[str]
    business_model: Optional[str]
    target_customer: Optional[str]
    team_size: Optional[str]
    notable_traction: Optional[str]
    source: Optional[str]
    source_url: Optional[str]
    pipeline_status: Optional[str]
    notes: Optional[str]
    founder_contacts: Optional[List[Any]]
    comparable_companies: Optional[List[Any]]
    recommended_next_step: Optional[str]
    has_unseen_signals: Optional[bool] = False
    conviction_score: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    key_risks: Optional[str] = None
    bull_case: Optional[str] = None
    meeting_notes: Optional[List[Any]] = []
    activity_log: Optional[List[Any]] = []
    scraped_at: Optional[str] = None
    research_status: Optional[str] = None
    research_completed_at: Optional[str] = None
    enriched_one_liner: Optional[str] = None
    traction_signals: Optional[str] = None
    red_flags: Optional[str] = None
    sources_visited: Optional[List[Any]] = None

    class Config:
        from_attributes = True

class StartupUpdate(BaseModel):
    pipeline_status: Optional[str] = None
    notes: Optional[str] = None
    founder_contacts: Optional[List[Any]] = None
    conviction_score: Optional[int] = None
    next_action: Optional[str] = None
    next_action_due: Optional[str] = None
    key_risks: Optional[str] = None
    bull_case: Optional[str] = None
    meeting_notes: Optional[List[Any]] = None
    activity_log: Optional[List[Any]] = None
    portfolio_status: Optional[str] = None
    investment_date: Optional[str] = None
    check_size_usd: Optional[float] = None
    co_investors: Optional[List[Any]] = None
    sector: Optional[str] = None
    one_liner: Optional[str] = None

def _startup_to_card(startup: Startup) -> Dict[str, Any]:
    return {
        "id": startup.id,
        "name": startup.name,
        "slug": startup.slug,
        "one_liner": startup.one_liner,
        "ai_summary": startup.ai_summary,
        "website": startup.website,
        "founding_year": startup.founding_year,
        "funding_stage": startup.funding_stage,
        "funding_amount_usd": startup.funding_amount_usd,
        "top_investors": startup.top_investors,
        "ai_score": startup.ai_score,
        "fit_score": startup.fit_score,
        "fit_reasoning": startup.fit_reasoning,
        "thesis_tags": startup.thesis_tags,
        "sector": startup.sector,
        "business_model": startup.business_model,
        "target_customer": startup.target_customer,
        "team_size": startup.team_size,
        "notable_traction": startup.notable_traction,
        "source": startup.source,
        "source_url": startup.source_url,
        "pipeline_status": startup.pipeline_status,
        "notes": startup.notes,
        "founder_contacts": startup.founder_contacts,
        "comparable_companies": startup.comparable_companies,
        "recommended_next_step": startup.recommended_next_step,
        "has_unseen_signals": bool(startup.has_unseen_signals) if startup.has_unseen_signals is not None else False,
        "conviction_score": startup.conviction_score,
        "next_action": startup.next_action,
        "next_action_due": _utc_isoformat(startup.next_action_due),
        "key_risks": startup.key_risks,
        "bull_case": startup.bull_case,
        "meeting_notes": startup.meeting_notes or [],
        "activity_log": startup.activity_log or [],
        "scraped_at": _utc_isoformat(startup.scraped_at),
        "research_status": startup.research_status,
        "research_completed_at": _utc_isoformat(startup.research_completed_at),
        "enriched_one_liner": startup.enriched_one_liner,
        "business_model": startup.business_model,
        "target_customer": startup.target_customer,
        "traction_signals": startup.traction_signals,
        "red_flags": startup.red_flags,
        "sources_visited": startup.sources_visited,
    }


@router.get("/", response_model=List[StartupResponse])
async def get_startups(
    request: Request,
    stage: Optional[str] = Query(None),
    fit_level: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    sort: Optional[str] = Query("fit_score"),
    limit: int = Query(100),
    min_fit_score: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    user_id = _user_id_from_request(request)
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1))
    profile = profile_result.scalars().first()
    threshold = profile.fit_threshold if profile else 3

    query = select(Startup)
    query = query.where(Startup.user_id == user_id)
    query = query.where(or_(Startup.is_portfolio == False, Startup.is_portfolio.is_(None)))
    if min_fit_score is not None and min_fit_score == 0:
        pass  # No fit_score filter — return everything
    else:
        query = query.where(or_(Startup.source == 'manual', Startup.fit_score >= threshold))
    if stage:
        query = query.where(Startup.funding_stage == stage)
    if sector:
        query = query.where(Startup.sector == sector)
    if fit_level == "top":
        query = query.where(Startup.fit_score == 5)
    elif fit_level == "strong":
        query = query.where(Startup.fit_score == 4)
    elif fit_level == "possible":
        query = query.where(Startup.fit_score == 3)
    if sort == "fit_score":
        query = query.order_by(Startup.fit_score.desc().nulls_last())
    elif sort == "ai_score":
        query = query.order_by(Startup.ai_score.desc().nulls_last())
    elif sort == "newest":
        query = query.order_by(Startup.scraped_at.desc())
    query = query.limit(limit)
    result = await db.execute(query)
    startups = result.scalars().all()
    return [_startup_to_card(s) for s in startups]


@router.get("/count")
async def get_startups_count(request: Request, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(func.count()).select_from(Startup).where(Startup.user_id == user_id)
    )
    return {"count": result.scalar() or 0}


class AddCompanyRequest(BaseModel):
    name: str
    website: Optional[str] = None
    description: Optional[str] = None
    meeting_notes: Optional[str] = None
    funding_stage: Optional[str] = None
    source: Optional[str] = "manual"

@router.post("/add")
async def add_company(data: AddCompanyRequest, request: Request, db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup
    from app.models.firm_profile import FirmProfile
    import re as _re, datetime as _dt

    user_id = _user_id_from_request(request)
    firm_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1))
    firm = firm_result.scalar_one_or_none()

    slug = _re.sub(r"[^a-z0-9]+", "-", data.name.lower()).strip("-")
    existing = await db.execute(select(Startup).where(Startup.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{int(_dt.datetime.now().timestamp())}"

    description = data.description or data.name
    result = await classify_startup(
        name=data.name,
        description=description,
        website=data.website,
        source=data.source or "manual",
        firm=firm,
    )

    def t(v, n): return (v or "")[:n]
    def clamp(v, lo, hi):
        try: return max(lo, min(hi, int(v)))
        except: return None

    startup = Startup(
        name=data.name,
        slug=slug,
        website=t(data.website, 255),
        one_liner=t(result.get("one_liner") or description, 499),
        ai_summary=t(result.get("ai_summary") or description, 2000),
        ai_score=clamp(result.get("ai_score"), 1, 5),
        fit_score=clamp(result.get("fit_score"), 1, 5),
        fit_reasoning=t(result.get("fit_reasoning"), 999),
        sector=t(result.get("sector"), 99),
        mandate_category=t(result.get("mandate_category"), 99),
        business_model=t(result.get("business_model"), 99),
        target_customer=t(result.get("target_customer"), 199),
        thesis_tags=result.get("thesis_tags", []),
        recommended_next_step=t(result.get("recommended_next_step"), 499),
        funding_stage=t(data.funding_stage or result.get("funding_stage") or "unknown", 49),
        source=data.source or "manual",
        meeting_notes=[{"note": data.meeting_notes, "created_at": _dt.datetime.utcnow().isoformat() + "Z"}] if data.meeting_notes else [],
        scraped_at=_dt.datetime.utcnow(),
        user_id=user_id,
    )

    db.add(startup)
    await db.commit()
    await db.refresh(startup)
    return _startup_to_card(startup)



class PortfolioCompany(BaseModel):
    name: str
    website: str = None
    description: str = None
    stage: str = None
    investment_date: str = None
    check_size_usd: float = None
    co_investors: list = []
    portfolio_status: str = None
    sector: str = None

class PortfolioImportRequest(BaseModel):
    companies: list

@router.post("/portfolio-import")
async def portfolio_import(payload: PortfolioImportRequest, request: Request, db: AsyncSession = Depends(get_db)):
    import re as _re, datetime as _dt
    user_id = _user_id_from_request(request)
    imported = 0
    for item in payload.companies:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        slug = _re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]
        existing = await db.execute(select(Startup).where(Startup.slug == slug))
        if existing.scalar_one_or_none():
            continue
        startup = Startup(
            name=name,
            slug=slug,
            one_liner=item.get("description") or f"{name} — portfolio compa",
            website=item.get("website") or "",
            funding_stage=item.get("stage") or "",
            source="portfolio_import",
            is_portfolio=True,
            ai_score=None,
            fit_score=None,
            scraped_at=_dt.datetime.utcnow(),
            user_id=user_id,
            portfolio_status=item.get("portfolio_status") or "active",
            investment_date=_dt.datetime.fromisoformat(item.get("investment_date")) if item.get("investment_date") else None,
            check_size_usd=item.get("check_size_usd"),
            co_investors=item.get("co_investors") or [],
            sector=item.get("sector") or "",
        )
        db.add(startup)
        imported += 1
    await db.commit()

    # Kick off background enrichment for companies with websites
    companies_with_websites = []
    from sqlalchemy import select as sa_select
    for item in payload.companies:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        import re as _re
        slug = _re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]
        result = await db.execute(
            sa_select(Startup).where(Startup.slug == slug)
            .where(Startup.user_id == user_id)
        )
        startup = result.scalar_one_or_none()
        if startup and startup.website:
            companies_with_websites.append(startup.id)

    if companies_with_websites:
        import asyncio
        from app.services.portfolio_enrichment import enrich_portfolio_batch
        asyncio.create_task(enrich_portfolio_batch(companies_with_websites))
        logger.info(f"Queued enrichment for {len(companies_with_websites)} portfolio companies")

    return {"imported": imported}


@router.get("/portfolio")
async def get_portfolio(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(Startup)
        .where(Startup.user_id == user_id)
        .where(Startup.is_portfolio == True)
        .order_by(Startup.name.asc())
    )
    startups = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "one_liner": s.one_liner,
            "website": s.website,
            "funding_stage": s.funding_stage,
            "sector": s.sector,
            "portfolio_status": s.portfolio_status,
            "investment_date": (s.investment_date.isoformat() + "Z") if s.investment_date else None,
            "check_size_usd": s.check_size_usd,
            "co_investors": s.co_investors or [],
            "notes": s.notes,
        }
        for s in startups
    ]


@router.get("/pending-analysis")
async def get_pending_analysis(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(func.count()).select_from(Startup)
        .where(Startup.user_id == user_id)
        .where(Startup.fit_score == None)
        .where(Startup.is_portfolio == False)
    )
    count = result.scalar() or 0
    return {"pending": count}


@router.post("/{startup_id}/analyze")
async def analyze_startup_background(
    startup_id: int,
    background_tasks: BackgroundTasks,
    focus: str = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Non-blocking research trigger. Starts research as a background task
    and returns 202 immediately. Frontend gets notified via the
    notifications system when research completes.
    """
    user_id = _user_id_from_request(request)

    # Fetch startup
    result = await db.execute(
        select(Startup)
        .where(Startup.id == startup_id)
        .where(or_(Startup.user_id == user_id, Startup.user_id.is_(None)))
    )
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    # Fetch firm profile
    profile_result = await db.execute(
        select(FirmProfile)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    profile = profile_result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No firm profile found")

    # Mark as pending immediately
    startup.research_status = "pending"
    await db.commit()

    # Create progress queue for SSE stream to read from
    progress_queue = _asyncio.Queue()
    _research_queues[startup_id] = progress_queue

    # Extract profile data before session closes
    firm_name = profile.firm_name
    investment_thesis = profile.investment_thesis
    firm_website = profile.firm_website
    firm_context = profile.firm_context
    excluded_sectors = profile.excluded_sectors
    investment_stages = profile.investment_stages
    check_size_min = profile.check_size_min
    check_size_max = profile.check_size_max

    # Start background task
    async def run_background():
        async with AsyncSessionLocal() as bg_db:
            try:
                bg_result = await bg_db.execute(
                    select(Startup).where(Startup.id == startup_id)
                )
                bg_startup = bg_result.scalar_one_or_none()
                if not bg_startup:
                    return

                queue = _research_queues.get(startup_id)

                async def on_progress(message: str):
                    if queue:
                        await queue.put({"type": "stage", "message": message})

                from app.services.classifier import research_startup
                from app.models.firm_profile import FirmProfile
                bg_profile_result = await bg_db.execute(
                    select(FirmProfile)
                    .where(FirmProfile.user_id == user_id)
                    .where(FirmProfile.is_active == True)
                    .limit(1)
                )
                bg_profile = bg_profile_result.scalars().first()
                if not bg_profile:
                    logger.error(f"No profile found in background task for user {user_id}")
                    bg_startup.research_status = None
                    await bg_db.commit()
                    return

                result = await research_startup(
                    bg_startup.name,
                    bg_startup.one_liner or "",
                    bg_startup.website,
                    bg_profile,
                    custom_focus=focus,
                    progress_callback=on_progress,
                )
                if not result:
                    bg_startup.research_status = None
                    await bg_db.commit()
                    return

                # Apply all research fields
                import json as _json

                # Fields that must be stored as JSON strings (VARCHAR columns)
                stringify_fields = {'fit_reasoning', 'key_risks', 'bull_case',
                                    'traction_signals', 'red_flags', 'recommended_next_step'}

                fields = [
                    'one_liner', 'ai_summary', 'fit_score',
                    'fit_reasoning', 'business_model', 'target_customer',
                    'sector', 'mandate_category', 'thesis_tags',
                    'recommended_next_step', 'key_risks', 'bull_case',
                    'comparable_companies', 'traction_signals', 'red_flags',
                    'enriched_one_liner', 'sources_visited',
                    'founding_year', 'funding_amount_usd', 'top_investors',
                    'notable_traction',
                ]
                for field in fields:
                    value = result.get(field)
                    if value is not None:
                        if field in stringify_fields and not isinstance(value, str):
                            value = _json.dumps(value)
                        setattr(bg_startup, field, value)

                if result.get("team_size") is not None:
                    bg_startup.team_size = str(result["team_size"])

                if result.get("website_content") and not bg_startup.website_content:
                    bg_startup.website_content = result["website_content"][:10000]

                if (bg_startup.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                    bg_startup.funding_stage = result["funding_stage"]

                bg_startup.research_status = "complete"
                bg_startup.research_completed_at = datetime.utcnow()
                await bg_db.commit()

                # Signal completion to SSE stream
                if queue:
                    await queue.put({"type": "complete", "startup": None})
                # Clean up queue
                _research_queues.pop(startup_id, None)

                # Write notification
                try:
                    from app.services.notification_writer import write_research_complete_notification
                    await write_research_complete_notification(bg_db, bg_startup, user_id=user_id)
                except Exception as e:
                    logger.warning(f"Failed to write research notification: {e}")

                # Write activity event
                try:
                    from app.services.activity_writer import write_research_complete
                    await write_research_complete(
                        db=bg_db,
                        startup_id=bg_startup.id,
                        startup_name=bg_startup.name,
                        fit_score=bg_startup.fit_score,
                        user_id=user_id,
                    )
                except Exception as e:
                    logger.warning(f"Failed to write research activity: {e}")

            except Exception as e:
                logger.error(f"Background research failed for {startup_id}: {e}")
                # Signal error to SSE stream and clean up
                if startup_id in _research_queues:
                    q = _research_queues.pop(startup_id, None)
                    if q:
                        await q.put({"type": "error", "message": str(e)})
                async with AsyncSessionLocal() as err_db:
                    try:
                        err_result = await err_db.execute(
                            select(Startup).where(Startup.id == startup_id)
                        )
                        err_startup = err_result.scalar_one_or_none()
                        if err_startup:
                            err_startup.research_status = None
                            await err_db.commit()
                    except Exception:
                        pass

    background_tasks.add_task(run_background)

    return {
        "status": "queued",
        "message": "Research started. You'll be notified when the brief is ready.",
        "startup_id": startup_id,
    }


@router.get("/{startup_id}/analyze/stream")
async def analyze_startup_stream(startup_id: int, request: Request, db: AsyncSession = Depends(get_db), token: Optional[str] = None, focus: Optional[str] = None):
    """SSE endpoint that streams research agent progress."""
    import asyncio
    from fastapi.responses import StreamingResponse

    user_id = _user_id_from_request(request)
    if not user_id and token:
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            user_id = decoded.get("sub")
        except Exception:
            pass

    async def event_generator():
        async def emit(event_type: str, message: str, data: dict = None):
            payload = {"type": event_type, "message": message, **(data or {})}
            yield f"data: {json.dumps(payload)}\n\n"

        startup_result = await db.execute(
            select(Startup).where(Startup.id == startup_id).where(Startup.user_id == user_id)
        )
        startup = startup_result.scalar_one_or_none()
        if not startup:
            async for chunk in emit("error", "Company not found"):
                yield chunk
            return

        if startup.fit_reasoning is not None:
            async for chunk in emit("complete", "Already analyzed", {"startup": _startup_to_card(startup)}):
                yield chunk
            return

        # If background task already started via POST /analyze,
        # stream from the existing queue instead of starting a new task
        existing_queue = _research_queues.get(startup.id)
        if existing_queue:
            try:
                while True:
                    try:
                        msg = await _asyncio.wait_for(
                            existing_queue.get(), timeout=2.0
                        )
                        if msg["type"] == "complete":
                            await db.refresh(startup)
                            card = _startup_to_card(startup)
                            yield f"data: {json.dumps({'type': 'complete', 'message': 'Research complete', 'startup': card})}\n\n"
                            return
                        elif msg["type"] == "error":
                            yield f"data: {json.dumps({'type': 'error', 'message': msg.get('message', 'Research failed')})}\n\n"
                            return
                        else:
                            yield f"data: {json.dumps(msg)}\n\n"
                    except _asyncio.TimeoutError:
                        yield f"data: {json.dumps({'type': 'ping', 'message': 'Analyzing...'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        firm_result = await db.execute(
            select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1)
        )
        firm = firm_result.scalars().first()
        if not firm:
            async for chunk in emit("error", "No firm profile found"):
                yield chunk
            return

        # Run the research with progress callback; stream progress and keepalive while waiting
        from app.services.classifier import research_startup
        progress_messages = []

        async def on_progress(message: str):
            progress_messages.append(message)

        research_task = asyncio.create_task(
            research_startup(
                name=startup.name,
                description=startup.one_liner or startup.name,
                website=startup.website,
                firm=firm,
                custom_focus=focus,
                db=db,
                progress_callback=on_progress,
            )
        )

        # Send keepalive pings and progress messages while waiting
        last_sent = 0
        while not research_task.done():
            await asyncio.sleep(2)
            if not research_task.done():
                # Send any new progress messages
                while last_sent < len(progress_messages):
                    msg = progress_messages[last_sent]
                    yield f"data: {json.dumps({'type': 'stage', 'message': msg})}\n\n"
                    last_sent += 1
                # Send keepalive if no new progress
                if last_sent == len(progress_messages):
                    yield f"data: {json.dumps({'type': 'ping', 'message': 'Analyzing...'})}\n\n"

        result = await research_task

        if result:
            startup.one_liner = (result.get("one_liner") or startup.one_liner or "")[:499]
            startup.ai_summary = (result.get("ai_summary") or "")[:2000]
            startup.fit_score = result.get("fit_score")
            fit_reasoning = result.get("fit_reasoning")
            if isinstance(fit_reasoning, dict):
                startup.fit_reasoning = json.dumps(fit_reasoning)
            elif isinstance(fit_reasoning, str):
                startup.fit_reasoning = fit_reasoning[:3000]
            startup.business_model = (result.get("business_model") or "")[:499]
            startup.target_customer = (result.get("target_customer") or "")[:499]
            startup.sector = (result.get("sector") or startup.sector or "")[:99]
            startup.mandate_category = (result.get("mandate_category") or "")[:99]
            startup.thesis_tags = result.get("thesis_tags", [])
            startup.recommended_next_step = (result.get("recommended_next_step") or "")[:499]
            key_risks = result.get("key_risks")
            startup.key_risks = json.dumps(key_risks) if isinstance(key_risks, list) else (key_risks or None)
            bull_case = result.get("bull_case")
            startup.bull_case = json.dumps(bull_case) if isinstance(bull_case, list) else (bull_case or None)
            startup.comparable_companies = result.get("comparable_companies", [])
            if (startup.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                startup.funding_stage = result["funding_stage"][:49]
            startup.traction_signals = (result.get("traction_signals") or "")
            startup.red_flags = (result.get("red_flags") or "")
            startup.enriched_one_liner = (result.get("enriched_one_liner") or "")
            startup.sources_visited = result.get("sources_visited", [])
            if result.get("founding_year") is not None:
                startup.founding_year = result.get("founding_year")
            if result.get("funding_amount_usd") is not None:
                startup.funding_amount_usd = result.get("funding_amount_usd")
            if result.get("top_investors"):
                startup.top_investors = result.get("top_investors")
            if result.get("team_size") is not None:
                team_size = result.get("team_size")
                startup.team_size = str(team_size) if team_size is not None else None
            if result.get("notable_traction"):
                startup.notable_traction = result.get("notable_traction")
            if result.get("website_content") and not startup.website_content:
                startup.website_content = result["website_content"][:10000]
            if result.get("research_status") == "complete":
                startup.research_status = "complete"
                startup.research_completed_at = datetime.utcnow()
            await db.commit()

            # Write research complete notification
            try:
                from app.services.notification_writer import write_research_complete_notification
                await write_research_complete_notification(db, startup, user_id=user_id)
            except Exception as notify_err:
                logger.warning(f"Failed to write research complete notification: {notify_err}")

            # Write research complete activity event
            try:
                from app.services.activity_writer import write_research_complete
                await write_research_complete(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    fit_score=startup.fit_score,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write research activity: {e}")

            # Write research completion memory
            try:
                from app.services.associate_memory_service import write_memory
                memory_parts = [f"{startup.name}: research completed."]
                if startup.traction_signals:
                    memory_parts.append(f"Traction: {startup.traction_signals[:200]}")
                if startup.red_flags:
                    memory_parts.append(f"Red flags: {startup.red_flags[:200]}")
                if startup.fit_reasoning:
                    memory_parts.append(f"Fit reasoning: {startup.fit_reasoning[:200]}")
                if startup.recommended_next_step:
                    memory_parts.append(f"Recommendation: {startup.recommended_next_step[:150]}")
                await write_memory(
                    db=db,
                    user_id=user_id,
                    memory_type="fact",
                    content=" | ".join(memory_parts),
                    company_id=startup.id,
                    company_name=startup.name,
                )
            except Exception as e:
                logger.warning(f"Failed to write research memory: {e}")

            await db.refresh(startup)

            try:
                from app.services.classifier import generate_embedding
                embed_input = f"{startup.name}. {startup.one_liner or ''}. {startup.sector or ''}. {', '.join(startup.thesis_tags or [])}"
                embedding = await generate_embedding(embed_input)
                if embedding is not None:
                    startup.embedding = embedding
                    await db.commit()
            except Exception as e:
                logger.warning(f"Embedding storage failed for {startup.name}: {e}")

        # Stage 4 — Complete
        async for chunk in emit("stage", "Generating investment brief...", {"stage": 4, "total": 4}):
            yield chunk
        await asyncio.sleep(0.3)

        async for chunk in emit("complete", "Analysis complete", {"startup": _startup_to_card(startup)}):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.post("/{startup_id}/import-meeting")
async def import_meeting_summary(
    startup_id: int,
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from anthropic import AsyncAnthropic
    from app.core.config import settings
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(Startup).where(Startup.id == startup_id, Startup.user_id == user_id)
    )
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    summary = payload.get("summary", "").strip()
    if not summary:
        raise HTTPException(status_code=400, detail="No summary provided")
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": f"""You are a VC analyst. Structure this meeting summary into clean notes.

Company: {startup.name}
Summary: {summary}

Format as:
**Date & Attendees**: [extract if mentioned, otherwise omit]
**Key Topics**: [bullet points of main discussion topics]
**Signals**: [positive or negative signals about the company]
**Action Items**: [next steps mentioned]
**Other Notes**: [anything else relevant]

Be concise. Use the exact information from the summary — don't invent details."""}]
    )
    structured = response.content[0].text.strip()
    return {"note": structured}


@router.get("/last-scrape")
async def get_last_scrape(request: Request, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func as sqlfunc
    user_id = _user_id_from_request(request)
    max_result = await db.execute(
        select(sqlfunc.max(Startup.scraped_at)).where(Startup.user_id == user_id)
    )
    last_scraped_at = max_result.scalar()
    if not last_scraped_at:
        return {"last_scraped_at": None, "companies": [], "count": 0}

    result = await db.execute(
        select(Startup)
        .where(Startup.user_id == user_id)
        .where(Startup.scraped_at >= last_scraped_at.replace(tzinfo=None) - timedelta(hours=12))
        .where(Startup.fit_score >= 1)
        .order_by(Startup.fit_score.desc().nulls_last())
        .limit(50)
    )
    companies = result.scalars().all()

    return {
        "last_scraped_at": _utc_isoformat(last_scraped_at),
        "companies": [_startup_to_card(s) for s in companies],
        "count": len(companies)
    }

def _normalize_text_or_list(value):
    """If value is a list, join with '\n\n'; otherwise return as-is."""
    if isinstance(value, list):
        return "\n\n".join(str(x) for x in value)
    return value


@router.get("/{startup_id}/similar")
async def get_similar_startups(startup_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """Return up to 3 semantically similar companies using pgvector cosine similarity."""
    from sqlalchemy import text
    user_id = _user_id_from_request(request)

    result = await db.execute(
        select(Startup.embedding).where(Startup.id == startup_id).where(Startup.user_id == user_id)
    )
    row = result.first()
    if not row or row.embedding is None:
        return []

    embedding = row.embedding

    similar = await db.execute(
        text("""
            SELECT id, name, fit_score, pipeline_status, scraped_at,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM startups
            WHERE id != :startup_id
              AND user_id = :user_id
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> CAST(:embedding AS vector)) > 0.72
            ORDER BY similarity DESC
            LIMIT 3
        """),
        {"embedding": "[" + ",".join(str(x) for x in embedding) + "]", "startup_id": startup_id, "user_id": user_id}
    )
    rows = similar.fetchall()
    return [
        {
            "id": r.id,
            "name": r.name,
            "fit_score": r.fit_score,
            "pipeline_status": r.pipeline_status,
            "scraped_at": (r.scraped_at.isoformat() + "Z") if r.scraped_at else None,
            "similarity": round(r.similarity, 2),
        }
        for r in rows
    ]


@router.get("/{startup_id}")
async def get_startup(startup_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(select(Startup).where(Startup.id == startup_id).where(Startup.user_id == user_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    if not (startup.fit_reasoning and startup.fit_reasoning.strip()):
        from app.services.classifier import classify_startup
        profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1))
        profile = profile_result.scalars().first()
        if profile:
            classification = await classify_startup(
                name=startup.name,
                description=startup.one_liner or startup.ai_summary or startup.name,
                website=startup.website,
                source=startup.source or "",
                firm=profile,
            )
            if classification:
                if classification.get("fit_reasoning") is not None:
                    startup.fit_reasoning = (classification["fit_reasoning"] or "")[:999]
                if classification.get("ai_summary") is not None:
                    startup.ai_summary = (classification["ai_summary"] or "")[:2000]
                if classification.get("recommended_next_step") is not None:
                    startup.recommended_next_step = (classification["recommended_next_step"] or "")[:499]
                key_risks = classification.get("key_risks")
                if key_risks is not None:
                    startup.key_risks = _normalize_text_or_list(key_risks)
                bull_case = classification.get("bull_case")
                if bull_case is not None:
                    startup.bull_case = _normalize_text_or_list(bull_case)
                if classification.get("comparable_companies") is not None:
                    startup.comparable_companies = classification["comparable_companies"] if isinstance(classification["comparable_companies"], list) else []
            await db.commit()
            await db.refresh(startup)
    return _startup_to_card(startup)

@router.patch("/{startup_id}", response_model=StartupResponse)
async def update_startup(startup_id: int, data: StartupUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(select(Startup).where(Startup.id == startup_id).where(Startup.user_id == user_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    old_pipeline_status = startup.pipeline_status
    old_meeting_notes_len = len(startup.meeting_notes or [])
    old_conviction_score = startup.conviction_score
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(startup, key, value)

    # Handle investment_date string → datetime conversion
    if data.investment_date is not None:
        try:
            from datetime import datetime as dt
            startup.investment_date = dt.fromisoformat(data.investment_date) \
                if data.investment_date else None
        except Exception:
            pass

    await db.commit()

    # Write memory if pipeline status changed
    if data.pipeline_status and data.pipeline_status != old_pipeline_status:
        try:
            from app.services.associate_memory_service import write_memory
            status_labels = {
                "watching": "moved to Watching — worth monitoring",
                "outreach": "moved to Outreach — actively pursuing",
                "diligence": "moved to Diligence — serious consideration",
                "passed": "passed on",
                "invested": "invested in",
            }
            action = status_labels.get(data.pipeline_status, f"updated status to {data.pipeline_status}")
            content = f"{startup.name}: {action}. Sector: {startup.sector or 'unknown'}. Fit score: {startup.fit_score}/5."
            if startup.one_liner:
                content += f" Description: {startup.one_liner}"
            await write_memory(
                db=db,
                user_id=user_id,
                memory_type="decision",
                content=content,
                company_id=startup.id,
                company_name=startup.name,
            )
        except Exception as e:
            logger.warning(f"Failed to write pipeline memory: {e}")

        # Write pipeline activity event
        if data.pipeline_status and data.pipeline_status != old_pipeline_status:
            try:
                from app.services.activity_writer import write_pipeline_moved
                await write_pipeline_moved(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    new_status=data.pipeline_status,
                    old_status=old_pipeline_status,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write pipeline activity: {e}")

    # Write memory if meeting notes were added
    if data.meeting_notes and len(data.meeting_notes) > old_meeting_notes_len:
        try:
            from app.services.associate_memory_service import write_memory
            latest_note = data.meeting_notes[-1]
            note_text = latest_note.get("note", "") if isinstance(latest_note, dict) else str(latest_note)
            if note_text and len(note_text) > 20:
                content = f"{startup.name}: meeting note added. {note_text[:300]}"
                await write_memory(
                    db=db,
                    user_id=user_id,
                    memory_type="fact",
                    content=content,
                    company_id=startup.id,
                    company_name=startup.name,
                )
        except Exception as e:
            logger.warning(f"Failed to write meeting notes memory: {e}")

        # Write meeting note activity event
        if data.meeting_notes and len(data.meeting_notes) > old_meeting_notes_len:
            try:
                from app.services.activity_writer import write_meeting_note_added
                latest_note = data.meeting_notes[-1]
                note_text = latest_note.get("note", "") if isinstance(latest_note, dict) else str(latest_note)
                await write_meeting_note_added(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    note_preview=note_text[:200] if note_text else None,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write meeting note activity: {e}")

    # Write memory if conviction score was set
    if data.conviction_score is not None and data.conviction_score != old_conviction_score:
        try:
            from app.services.associate_memory_service import write_memory
            conviction_labels = {1: "very low", 2: "low", 3: "moderate", 4: "high", 5: "very high"}
            label = conviction_labels.get(data.conviction_score, str(data.conviction_score))
            content = f"{startup.name}: analyst conviction set to {data.conviction_score}/5 ({label}). Sector: {startup.sector or 'unknown'}. Fit score: {startup.fit_score}/5."
            await write_memory(
                db=db,
                user_id=user_id,
                memory_type="decision",
                content=content,
                company_id=startup.id,
                company_name=startup.name,
            )
        except Exception as e:
            logger.warning(f"Failed to write conviction memory: {e}")

        # Write conviction activity event
        if data.conviction_score is not None and data.conviction_score != old_conviction_score:
            try:
                from app.services.activity_writer import write_conviction_set
                await write_conviction_set(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    conviction_score=data.conviction_score,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write conviction activity: {e}")

        # Write notes activity event
        if data.notes is not None and data.notes != (startup.notes or ''):
            try:
                from app.services.activity_writer import write_notes_saved
                await write_notes_saved(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    notes_preview=data.notes[:200] if data.notes else None,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write notes activity: {e}")

    await db.refresh(startup)
    return _startup_to_card(startup)

@router.post("/{startup_id}/refresh")
async def refresh_startup(startup_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup
    from app.models.firm_profile import FirmProfile
    user_id = _user_id_from_request(request)
    result = await db.execute(select(Startup).where(Startup.id == startup_id).where(Startup.user_id == user_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1))
    profile = profile_result.scalars().first()
    classification = await classify_startup(
        name=startup.name,
        description=startup.one_liner or "",
        website=startup.website or "",
        source=startup.source or "manual",
        firm=profile,
    )
    for key, value in classification.items():
        if hasattr(startup, key) and value is not None:
            if key in ('key_risks', 'bull_case') and isinstance(value, list):
                value = '\n\n'.join(value)
            setattr(startup, key, value)
    await db.commit()
    await db.refresh(startup)
    return _startup_to_card(startup)
