import json
import logging
import uuid as _uuid_mod
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any, Dict

logger = logging.getLogger(__name__)

import asyncio as _asyncio
import re as _re_slug

# In-memory progress queues: score_id (str) -> asyncio.Queue
_research_queues: dict[str, _asyncio.Queue] = {}


def _slugify_global(name: str) -> str:
    """Global (company-level) slug — no per-tenant suffix."""
    return _re_slug.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")[:80]


def _utc_isoformat(dt) -> Optional[str]:
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        dt = dt.astimezone(timezone.utc)
    else:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


from app.core.database import get_db, AsyncSessionLocal
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.services.classifier import GLOBAL_FIELDS, FIRM_FIELDS


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


def _to_uuid(s: str):
    """Convert a string to uuid.UUID, raise HTTPException 422 on bad format."""
    try:
        return _uuid_mod.UUID(s)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid ID format: {s}")


router = APIRouter(prefix="/startups")


class StartupResponse(BaseModel):
    id: str           # FirmCompanyScore.id (UUID string) — per-tenant identifier
    company_id: Optional[str] = None
    name: str
    slug: Optional[str]
    one_liner: Optional[str]
    ai_summary: Optional[str]
    website: Optional[str]
    founding_year: Optional[int]
    funding_stage: Optional[str]
    funding_amount_usd: Optional[float]
    top_investors: Optional[List[Any]]
    ai_score: Optional[int] = None   # removed from platform, kept for backward compat
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
    is_portfolio: Optional[bool] = False
    portfolio_status: Optional[str] = None
    investment_date: Optional[str] = None
    check_size_usd: Optional[float] = None
    co_investors: Optional[List[Any]] = []
    mandate_category: Optional[str] = None
    memo: Optional[str] = None

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
    # Accepted for backward compat but not written (Company fields are global)
    sector: Optional[str] = None
    one_liner: Optional[str] = None


# Fields on FirmCompanyScore that StartupUpdate may write
_SCORE_UPDATE_FIELDS = {
    "pipeline_status", "notes", "founder_contacts", "conviction_score",
    "next_action", "next_action_due", "key_risks", "bull_case",
    "meeting_notes", "activity_log", "portfolio_status",
    "check_size_usd", "co_investors",
    # investment_date handled separately (string → datetime)
}


def _startup_to_card(company: Company, score: FirmCompanyScore) -> Dict[str, Any]:
    """Merge Company (global) and FirmCompanyScore (per-tenant) into the frontend card shape."""
    return {
        # Identifiers
        "id": str(score.id),
        "company_id": str(company.id),
        # Company (global / factual) fields
        "name": company.name,
        "slug": company.slug,
        "website": company.website,
        "one_liner": company.one_liner,
        "enriched_one_liner": company.enriched_one_liner,
        "ai_summary": company.ai_summary,
        "founding_year": company.founding_year,
        "funding_stage": company.funding_stage,
        "funding_amount_usd": company.funding_amount_usd,
        "top_investors": company.top_investors,
        "team_size": company.team_size,
        "sector": company.sector,
        "business_model": company.business_model,
        "target_customer": company.target_customer,
        "notable_traction": company.notable_traction,
        "traction_signals": company.traction_signals,
        "website_content": company.website_content,
        "sources_visited": company.sources_visited,
        "source": company.source,
        "source_url": company.source_url,
        "scraped_at": _utc_isoformat(company.scraped_at),
        "research_status": company.research_status,
        "research_completed_at": _utc_isoformat(company.research_completed_at),
        # FirmCompanyScore (per-tenant / mandate) fields
        "ai_score": None,          # removed from platform; kept for backward compat
        "fit_score": score.fit_score,
        "fit_reasoning": score.fit_reasoning,
        "thesis_tags": score.thesis_tags,
        "mandate_category": score.mandate_category,
        "pipeline_status": score.pipeline_status,
        "notes": score.notes,
        "founder_contacts": score.founder_contacts,
        "comparable_companies": score.comparable_companies,
        "recommended_next_step": score.recommended_next_step,
        "has_unseen_signals": bool(score.has_unseen_signals) if score.has_unseen_signals is not None else False,
        "conviction_score": score.conviction_score,
        "next_action": score.next_action,
        "next_action_due": _utc_isoformat(score.next_action_due),
        "key_risks": score.key_risks,
        "bull_case": score.bull_case,
        "red_flags": score.red_flags,
        "meeting_notes": score.meeting_notes or [],
        "activity_log": score.activity_log or [],
        "memo": score.memo,
        "is_portfolio": bool(score.is_portfolio) if score.is_portfolio is not None else False,
        "portfolio_status": score.portfolio_status,
        "investment_date": _utc_isoformat(score.investment_date),
        "check_size_usd": score.check_size_usd,
        "co_investors": score.co_investors or [],
    }


def _normalize_text_or_list(value):
    if isinstance(value, list):
        return "\n\n".join(str(x) for x in value)
    return value


# ── Helper: standard join query ───────────────────────────────────────────────

def _joined_query(user_id: str):
    return (
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
    )


# ── Routes ────────────────────────────────────────────────────────────────────

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
    profile_result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1)
    )
    profile = profile_result.scalars().first()
    threshold = profile.fit_threshold if profile else 3

    query = _joined_query(user_id)
    query = query.where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))

    if min_fit_score is not None and min_fit_score == 0:
        pass  # no fit_score filter — return everything
    else:
        query = query.where(
            or_(Company.source == "manual", FirmCompanyScore.fit_score >= threshold)
        )

    if stage:
        query = query.where(Company.funding_stage == stage)
    if sector:
        query = query.where(Company.sector == sector)
    if fit_level == "top":
        query = query.where(FirmCompanyScore.fit_score == 5)
    elif fit_level == "strong":
        query = query.where(FirmCompanyScore.fit_score == 4)
    elif fit_level == "possible":
        query = query.where(FirmCompanyScore.fit_score == 3)

    if sort == "fit_score":
        query = query.order_by(FirmCompanyScore.fit_score.desc().nulls_last())
    elif sort == "ai_score":
        query = query.order_by(FirmCompanyScore.fit_score.desc().nulls_last())
    elif sort == "newest":
        query = query.order_by(Company.scraped_at.desc())

    query = query.limit(limit)
    result = await db.execute(query)
    pairs = result.all()
    return [_startup_to_card(company, score) for company, score in pairs]


@router.get("/count")
async def get_startups_count(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(func.count()).select_from(FirmCompanyScore)
        .where(FirmCompanyScore.user_id == user_id)
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
    import datetime as _dt

    user_id = _user_id_from_request(request)
    firm_result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1)
    )
    firm = firm_result.scalar_one_or_none()

    description = data.description or data.name
    result = await classify_startup(
        name=data.name,
        description=description,
        website=data.website,
        source=data.source or "manual",
        firm=firm,
    )

    def t(v, n): return (v or "")[:n] if v is not None else None
    def clamp(v, lo, hi):
        try: return max(lo, min(hi, int(v)))
        except: return None

    # ── STEP 1: Find or create global Company record ──────────────────────────
    company = None
    if data.website:
        try:
            from urllib.parse import urlparse
            domain = urlparse(data.website).netloc.lower().replace("www.", "")
            if domain:
                existing = await db.execute(
                    select(Company).where(Company.website.ilike(f"%{domain}%")).limit(1)
                )
                company = existing.scalar_one_or_none()
        except Exception:
            pass

    if company is None:
        slug = _slugify_global(data.name)
        slug_check = await db.execute(select(Company).where(Company.slug == slug).limit(1))
        if slug_check.scalar_one_or_none():
            slug = f"{slug}-{str(_uuid_mod.uuid4())[:4]}"

        company = Company(
            name=data.name,
            slug=slug,
            website=t(data.website, 499),
            one_liner=t(result.get("one_liner") or description, 499),
            ai_summary=t(result.get("ai_summary") or description, 4000),
            sector=t(result.get("sector"), 99),
            business_model=t(result.get("business_model"), 499),
            target_customer=t(result.get("target_customer"), 499),
            funding_stage=t(data.funding_stage or result.get("funding_stage") or "unknown", 49),
            source=data.source or "manual",
            source_url=data.website,
            research_status="pending",
            scraped_at=_dt.datetime.utcnow(),
        )
        db.add(company)
        await db.flush()

    # ── STEP 2: Check if this firm already scored this company ────────────────
    existing_score = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.company_id == company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .limit(1)
    )
    score = existing_score.scalar_one_or_none()

    if score is None:
        score = FirmCompanyScore(
            company_id=company.id,
            user_id=user_id,
            fit_score=clamp(result.get("fit_score"), 1, 5),
            fit_reasoning=t(result.get("fit_reasoning"), 2000),
            mandate_category=t(result.get("mandate_category"), 99),
            thesis_tags=result.get("thesis_tags", []),
            recommended_next_step=t(result.get("recommended_next_step"), 499),
            pipeline_status="new",
            meeting_notes=(
                [{"note": data.meeting_notes, "created_at": _dt.datetime.utcnow().isoformat() + "Z"}]
                if data.meeting_notes else []
            ),
        )
        db.add(score)

    await db.commit()
    await db.refresh(company)
    await db.refresh(score)
    return _startup_to_card(company, score)


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
    import datetime as _dt
    user_id = _user_id_from_request(request)
    imported = 0
    created_score_ids = []

    for item in payload.companies:
        name = (item.get("name") or "").strip()
        if not name:
            continue

        # Find or create global Company
        company = None
        website = item.get("website") or ""
        if website:
            try:
                from urllib.parse import urlparse
                domain = urlparse(website).netloc.lower().replace("www.", "")
                if domain:
                    res = await db.execute(
                        select(Company).where(Company.website.ilike(f"%{domain}%")).limit(1)
                    )
                    company = res.scalar_one_or_none()
            except Exception:
                pass

        if company is None:
            slug = _slugify_global(name)
            slug_check = await db.execute(select(Company).where(Company.slug == slug).limit(1))
            if slug_check.scalar_one_or_none():
                slug = f"{slug}-{str(_uuid_mod.uuid4())[:4]}"
            company = Company(
                name=name,
                slug=slug,
                one_liner=item.get("description") or f"{name} — portfolio company",
                website=website or None,
                funding_stage=item.get("stage") or "",
                source="portfolio_import",
                source_url=website or None,
                sector=item.get("sector") or "",
                research_status="pending",
                scraped_at=_dt.datetime.utcnow(),
            )
            db.add(company)
            await db.flush()

        # Skip if already scored by this firm
        existing = await db.execute(
            select(FirmCompanyScore)
            .where(FirmCompanyScore.company_id == company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .limit(1)
        )
        if existing.scalar_one_or_none():
            continue

        score = FirmCompanyScore(
            company_id=company.id,
            user_id=user_id,
            pipeline_status="none",
            is_portfolio=True,
            portfolio_status=item.get("portfolio_status") or "active",
            investment_date=(
                _dt.datetime.fromisoformat(item.get("investment_date"))
                if item.get("investment_date") else None
            ),
            check_size_usd=item.get("check_size_usd"),
            co_investors=item.get("co_investors") or [],
        )
        db.add(score)
        await db.flush()
        created_score_ids.append(str(score.id))
        imported += 1

    await db.commit()

    # Kick off background enrichment for portfolio companies with websites
    if created_score_ids:
        try:
            from app.services.portfolio_enrichment import enrich_portfolio_batch
            import asyncio
            asyncio.create_task(enrich_portfolio_batch(created_score_ids))
            logger.info(f"Queued enrichment for {len(created_score_ids)} portfolio companies")
        except Exception as e:
            logger.warning(f"Failed to queue portfolio enrichment: {e}")

    return {"imported": imported}


@router.get("/portfolio")
async def get_portfolio(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        _joined_query(user_id)
        .where(FirmCompanyScore.is_portfolio == True)
        .order_by(Company.name.asc())
    )
    pairs = result.all()
    return [
        {
            "id": str(score.id),
            "name": company.name,
            "one_liner": company.one_liner,
            "website": company.website,
            "funding_stage": company.funding_stage,
            "sector": company.sector,
            "portfolio_status": score.portfolio_status,
            "investment_date": (score.investment_date.isoformat() + "Z") if score.investment_date else None,
            "check_size_usd": score.check_size_usd,
            "co_investors": score.co_investors or [],
            "notes": score.notes,
        }
        for company, score in pairs
    ]


@router.get("/pending-analysis")
async def get_pending_analysis(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(func.count()).select_from(FirmCompanyScore)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.fit_score == None)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
    )
    return {"pending": result.scalar() or 0}


@router.post("/{startup_id}/analyze")
async def analyze_startup_background(
    startup_id: str,
    background_tasks: BackgroundTasks,
    focus: str = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
):
    """Non-blocking research trigger. Returns 202 immediately; frontend notified via notifications."""
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    row = (await db.execute(
        _joined_query(user_id)
        .where(FirmCompanyScore.id == score_uuid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    company, score = row

    profile_result = await db.execute(
        select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
    )
    profile = profile_result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No firm profile found")

    # Mark as pending immediately
    company.research_status = "pending"
    await db.commit()

    progress_queue = _asyncio.Queue()
    _research_queues[startup_id] = progress_queue

    score_id_str = startup_id
    company_id_str = str(company.id)

    async def run_background():
        async with AsyncSessionLocal() as bg_db:
            try:
                bg_row = (await bg_db.execute(
                    select(Company, FirmCompanyScore)
                    .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                    .where(FirmCompanyScore.id == score_uuid)
                )).first()
                if not bg_row:
                    return
                bg_company, bg_score = bg_row

                queue = _research_queues.get(score_id_str)

                async def on_progress(message: str):
                    if queue:
                        await queue.put({"type": "stage", "message": message})

                from app.services.classifier import research_startup
                bg_profile_result = await bg_db.execute(
                    select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
                )
                bg_profile = bg_profile_result.scalars().first()
                if not bg_profile:
                    logger.error(f"No profile found in background task for user {user_id}")
                    bg_company.research_status = None
                    await bg_db.commit()
                    return

                result = await research_startup(
                    bg_company.name,
                    bg_company.one_liner or "",
                    bg_company.website,
                    bg_profile,
                    custom_focus=focus,
                    progress_callback=on_progress,
                )
                if not result:
                    bg_company.research_status = None
                    await bg_db.commit()
                    return

                import json as _json
                stringify_fields = {"fit_reasoning", "key_risks", "bull_case",
                                    "traction_signals", "red_flags", "recommended_next_step"}

                # Write global (factual) fields to Company
                for field in GLOBAL_FIELDS:
                    value = result.get(field)
                    if value is not None:
                        if field in stringify_fields and not isinstance(value, str):
                            value = _json.dumps(value)
                        if field == "team_size" and value is not None:
                            value = str(value)
                        setattr(bg_company, field, value)

                if result.get("website_content") and not bg_company.website_content:
                    bg_company.website_content = result["website_content"][:10000]
                if (bg_company.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                    bg_company.funding_stage = result["funding_stage"]
                bg_company.research_status = "complete"
                bg_company.research_completed_at = datetime.utcnow()

                # Write mandate-specific fields to FirmCompanyScore only
                for field in FIRM_FIELDS:
                    value = result.get(field)
                    if value is not None:
                        if field in stringify_fields and not isinstance(value, str):
                            value = _json.dumps(value)
                        setattr(bg_score, field, value)

                if result.get("notable_traction"):
                    bg_company.notable_traction = result["notable_traction"]

                await bg_db.commit()

                if queue:
                    await queue.put({"type": "complete", "startup": None})
                _research_queues.pop(score_id_str, None)

                try:
                    from app.services.notification_writer import write_research_complete_notification
                    await write_research_complete_notification(bg_db, bg_score, user_id=user_id, company_name=bg_company.name)
                except Exception as e:
                    logger.warning(f"Failed to write research notification: {e}")

                try:
                    from app.services.activity_writer import write_research_complete
                    await write_research_complete(
                        db=bg_db,
                        company_id=bg_score.company_id,
                        startup_name=bg_company.name,
                        fit_score=bg_score.fit_score,
                        user_id=user_id,
                    )
                except Exception as e:
                    logger.warning(f"Failed to write research activity: {e}")

            except Exception as e:
                logger.error(f"Background research failed for {score_id_str}: {e}")
                if score_id_str in _research_queues:
                    q = _research_queues.pop(score_id_str, None)
                    if q:
                        await q.put({"type": "error", "message": str(e)})
                async with AsyncSessionLocal() as err_db:
                    try:
                        err_company = (await err_db.execute(
                            select(Company).where(Company.id == _to_uuid(company_id_str))
                        )).scalar_one_or_none()
                        if err_company:
                            err_company.research_status = None
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
async def analyze_startup_stream(
    startup_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = None,
    focus: Optional[str] = None,
):
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

    score_uuid = _to_uuid(startup_id)

    async def event_generator():
        async def emit(event_type: str, message: str, data: dict = None):
            payload = {"type": event_type, "message": message, **(data or {})}
            yield f"data: {json.dumps(payload)}\n\n"

        row = (await db.execute(
            _joined_query(user_id).where(FirmCompanyScore.id == score_uuid)
        )).first()
        if not row:
            async for chunk in emit("error", "Company not found"):
                yield chunk
            return
        company, score = row

        if score.fit_reasoning is not None:
            async for chunk in emit("complete", "Already analyzed", {"startup": _startup_to_card(company, score)}):
                yield chunk
            return

        existing_queue = _research_queues.get(startup_id)
        if existing_queue:
            try:
                while True:
                    try:
                        msg = await _asyncio.wait_for(existing_queue.get(), timeout=2.0)
                        if msg["type"] == "complete":
                            await db.refresh(company)
                            await db.refresh(score)
                            card = _startup_to_card(company, score)
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

        from app.services.classifier import research_startup
        progress_messages = []

        async def on_progress(message: str):
            progress_messages.append(message)

        research_task = asyncio.create_task(
            research_startup(
                name=company.name,
                description=company.one_liner or company.name,
                website=company.website,
                firm=firm,
                custom_focus=focus,
                db=db,
                progress_callback=on_progress,
            )
        )

        last_sent = 0
        while not research_task.done():
            await asyncio.sleep(2)
            if not research_task.done():
                while last_sent < len(progress_messages):
                    msg = progress_messages[last_sent]
                    yield f"data: {json.dumps({'type': 'stage', 'message': msg})}\n\n"
                    last_sent += 1
                if last_sent == len(progress_messages):
                    yield f"data: {json.dumps({'type': 'ping', 'message': 'Analyzing...'})}\n\n"

        result = await research_task

        if result:
            import json as _json
            stringify_fields = {"fit_reasoning", "key_risks", "bull_case",
                                "traction_signals", "red_flags", "recommended_next_step"}

            # Write global fields to Company
            for field in GLOBAL_FIELDS:
                value = result.get(field)
                if value is not None:
                    if field in stringify_fields and not isinstance(value, str):
                        value = _json.dumps(value)
                    if field == "team_size" and value is not None:
                        value = str(value)
                    setattr(company, field, value)

            if result.get("website_content") and not company.website_content:
                company.website_content = result["website_content"][:10000]
            if (company.funding_stage or "unknown") == "unknown" and result.get("funding_stage"):
                company.funding_stage = result["funding_stage"]
            if result.get("notable_traction"):
                company.notable_traction = result["notable_traction"]
            if result.get("research_status") == "complete":
                company.research_status = "complete"
                company.research_completed_at = datetime.utcnow()

            # Write mandate-specific fields to FirmCompanyScore only
            for field in FIRM_FIELDS:
                value = result.get(field)
                if value is not None:
                    if field in stringify_fields and not isinstance(value, str):
                        value = _json.dumps(value)
                    setattr(score, field, value)

            # fit_score from the result also goes to score
            if result.get("fit_score") is not None:
                score.fit_score = result["fit_score"]

            await db.commit()

            try:
                from app.services.notification_writer import write_research_complete_notification
                await write_research_complete_notification(db, score, user_id=user_id, company_name=company.name)
            except Exception as notify_err:
                logger.warning(f"Failed to write research complete notification: {notify_err}")

            try:
                from app.services.activity_writer import write_research_complete
                await write_research_complete(
                    db=db,
                    company_id=score.company_id,
                    startup_name=company.name,
                    fit_score=score.fit_score,
                    user_id=user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write research activity: {e}")

            try:
                from app.services.associate_memory_service import write_memory
                memory_parts = [f"{company.name}: research completed."]
                if company.traction_signals:
                    memory_parts.append(f"Traction: {company.traction_signals[:200]}")
                if score.red_flags:
                    memory_parts.append(f"Red flags: {score.red_flags[:200]}")
                if score.fit_reasoning:
                    memory_parts.append(f"Fit reasoning: {score.fit_reasoning[:200]}")
                if score.recommended_next_step:
                    memory_parts.append(f"Recommendation: {score.recommended_next_step[:150]}")
                await write_memory(
                    db=db,
                    user_id=user_id,
                    memory_type="fact",
                    content=" | ".join(memory_parts),
                    company_id=str(company.id),
                    company_name=company.name,
                )
            except Exception as e:
                logger.warning(f"Failed to write research memory: {e}")

            await db.refresh(company)
            await db.refresh(score)

            try:
                from app.services.classifier import generate_embedding
                embed_input = f"{company.name}. {company.one_liner or ''}. {company.sector or ''}. {', '.join(score.thesis_tags or [])}"
                embedding = await generate_embedding(embed_input)
                if embedding is not None:
                    company.embedding = embedding
                    await db.commit()
            except Exception as e:
                logger.warning(f"Embedding storage failed for {company.name}: {e}")

        async for chunk in emit("stage", "Generating investment brief...", {"stage": 4, "total": 4}):
            yield chunk
        await asyncio.sleep(0.3)

        async for chunk in emit("complete", "Analysis complete", {"startup": _startup_to_card(company, score)}):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.post("/{startup_id}/import-meeting")
async def import_meeting_summary(
    startup_id: str,
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from anthropic import AsyncAnthropic
    from app.core.config import settings
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    row = (await db.execute(
        _joined_query(user_id).where(FirmCompanyScore.id == score_uuid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    company, score = row

    summary = payload.get("summary", "").strip()
    if not summary:
        raise HTTPException(status_code=400, detail="No summary provided")

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": f"""You are a VC analyst. Structure this meeting summary into clean notes.

Company: {company.name}
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
    user_id = _user_id_from_request(request)

    max_result = await db.execute(
        select(func.max(Company.scraped_at))
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
    )
    last_scraped_at = max_result.scalar()
    if not last_scraped_at:
        return {"last_scraped_at": None, "companies": [], "count": 0}

    result = await db.execute(
        _joined_query(user_id)
        .where(Company.scraped_at >= last_scraped_at.replace(tzinfo=None) - timedelta(hours=12))
        .where(FirmCompanyScore.fit_score >= 1)
        .order_by(FirmCompanyScore.fit_score.desc().nulls_last())
        .limit(50)
    )
    pairs = result.all()
    return {
        "last_scraped_at": _utc_isoformat(last_scraped_at),
        "companies": [_startup_to_card(c, s) for c, s in pairs],
        "count": len(pairs),
    }


@router.get("/{startup_id}/similar")
async def get_similar_startups(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Return up to 3 semantically similar companies using pgvector cosine similarity."""
    from sqlalchemy import text
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    # Fetch the embedding from the global Company record via this firm's score
    emb_result = await db.execute(
        select(Company.embedding)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )
    row = emb_result.first()
    if not row or row.embedding is None:
        return []

    embedding = row.embedding

    similar = await db.execute(
        text("""
            SELECT fcs.id, c.name, fcs.fit_score, fcs.pipeline_status, c.scraped_at,
                   1 - (c.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM companies c
            JOIN firm_company_scores fcs ON fcs.company_id = c.id
            WHERE fcs.id != CAST(:score_id AS uuid)
              AND fcs.user_id = :user_id
              AND c.embedding IS NOT NULL
              AND 1 - (c.embedding <=> CAST(:embedding AS vector)) > 0.72
            ORDER BY similarity DESC
            LIMIT 3
        """),
        {
            "embedding": "[" + ",".join(str(x) for x in embedding) + "]",
            "score_id": startup_id,
            "user_id": user_id,
        }
    )
    rows = similar.fetchall()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "fit_score": r.fit_score,
            "pipeline_status": r.pipeline_status,
            "scraped_at": (r.scraped_at.isoformat() + "Z") if r.scraped_at else None,
            "similarity": round(r.similarity, 2),
        }
        for r in rows
    ]


@router.get("/{startup_id}")
async def get_startup(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    row = (await db.execute(
        _joined_query(user_id).where(FirmCompanyScore.id == score_uuid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    company, score = row

    # Lazily classify if fit_reasoning is missing
    if not (score.fit_reasoning and score.fit_reasoning.strip()):
        from app.services.classifier import classify_startup
        profile_result = await db.execute(
            select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1)
        )
        profile = profile_result.scalars().first()
        if profile:
            classification = await classify_startup(
                name=company.name,
                description=company.one_liner or company.ai_summary or company.name,
                website=company.website,
                source=company.source or "",
                firm=profile,
            )
            if classification:
                # Global fields → Company
                for field in GLOBAL_FIELDS:
                    v = classification.get(field)
                    if v is not None:
                        setattr(company, field, v)
                # Firm fields → FirmCompanyScore
                for field in FIRM_FIELDS:
                    v = classification.get(field)
                    if v is not None:
                        if field in ("key_risks", "bull_case") and isinstance(v, list):
                            v = _normalize_text_or_list(v)
                        elif field == "comparable_companies":
                            v = v if isinstance(v, list) else []
                        setattr(score, field, v)
                await db.commit()
                await db.refresh(company)
                await db.refresh(score)

    return _startup_to_card(company, score)


@router.patch("/{startup_id}", response_model=StartupResponse)
async def update_startup(startup_id: str, data: StartupUpdate, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    row = (await db.execute(
        _joined_query(user_id).where(FirmCompanyScore.id == score_uuid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    company, score = row

    old_pipeline_status = score.pipeline_status
    old_meeting_notes_len = len(score.meeting_notes or [])
    old_conviction_score = score.conviction_score

    # Apply only FirmCompanyScore fields (Company fields are immutable from this endpoint)
    update_data = data.model_dump(exclude_none=True)
    update_data.pop("sector", None)
    update_data.pop("one_liner", None)

    for key, value in update_data.items():
        if key in _SCORE_UPDATE_FIELDS:
            setattr(score, key, value)

    if data.investment_date is not None:
        try:
            from datetime import datetime as dt
            score.investment_date = dt.fromisoformat(data.investment_date) if data.investment_date else None
        except Exception:
            pass

    await db.commit()

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
            content = f"{company.name}: {action}. Sector: {company.sector or 'unknown'}. Fit score: {score.fit_score}/5."
            if company.one_liner:
                content += f" Description: {company.one_liner}"
            await write_memory(
                db=db, user_id=user_id, memory_type="decision", content=content,
                company_id=str(company.id), company_name=company.name,
            )
        except Exception as e:
            logger.warning(f"Failed to write pipeline memory: {e}")

        try:
            from app.services.activity_writer import write_pipeline_moved
            await write_pipeline_moved(
                db=db, company_id=score.company_id, startup_name=company.name,
                new_status=data.pipeline_status, old_status=old_pipeline_status, user_id=user_id,
            )
        except Exception as e:
            logger.warning(f"Failed to write pipeline activity: {e}")

    if data.meeting_notes and len(data.meeting_notes) > old_meeting_notes_len:
        try:
            from app.services.associate_memory_service import write_memory
            latest_note = data.meeting_notes[-1]
            note_text = latest_note.get("note", "") if isinstance(latest_note, dict) else str(latest_note)
            if note_text and len(note_text) > 20:
                await write_memory(
                    db=db, user_id=user_id, memory_type="fact",
                    content=f"{company.name}: meeting note added. {note_text[:300]}",
                    company_id=str(company.id), company_name=company.name,
                )
        except Exception as e:
            logger.warning(f"Failed to write meeting notes memory: {e}")

        try:
            from app.services.activity_writer import write_meeting_note_added
            latest_note = data.meeting_notes[-1]
            note_text = latest_note.get("note", "") if isinstance(latest_note, dict) else str(latest_note)
            await write_meeting_note_added(
                db=db, company_id=score.company_id, startup_name=company.name,
                note_preview=note_text[:200] if note_text else None, user_id=user_id,
            )
        except Exception as e:
            logger.warning(f"Failed to write meeting note activity: {e}")

    if data.conviction_score is not None and data.conviction_score != old_conviction_score:
        try:
            from app.services.associate_memory_service import write_memory
            conviction_labels = {1: "very low", 2: "low", 3: "moderate", 4: "high", 5: "very high"}
            label = conviction_labels.get(data.conviction_score, str(data.conviction_score))
            await write_memory(
                db=db, user_id=user_id, memory_type="decision",
                content=f"{company.name}: analyst conviction set to {data.conviction_score}/5 ({label}). Sector: {company.sector or 'unknown'}. Fit score: {score.fit_score}/5.",
                company_id=str(company.id), company_name=company.name,
            )
        except Exception as e:
            logger.warning(f"Failed to write conviction memory: {e}")

        try:
            from app.services.activity_writer import write_conviction_set
            await write_conviction_set(
                db=db, company_id=score.company_id, startup_name=company.name,
                conviction_score=data.conviction_score, user_id=user_id,
            )
        except Exception as e:
            logger.warning(f"Failed to write conviction activity: {e}")

    await db.refresh(company)
    await db.refresh(score)
    return _startup_to_card(company, score)


@router.delete("/{startup_id}")
async def delete_startup(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Delete the firm's score for this company. Never deletes the global Company row."""
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    score = (await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )).scalar_one_or_none()
    if not score:
        raise HTTPException(status_code=404, detail="Company not found")

    await db.delete(score)
    await db.commit()
    return {"success": True}


@router.post("/{startup_id}/refresh")
async def refresh_startup(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup
    user_id = _user_id_from_request(request)
    score_uuid = _to_uuid(startup_id)

    row = (await db.execute(
        _joined_query(user_id).where(FirmCompanyScore.id == score_uuid)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    company, score = row

    profile_result = await db.execute(
        select(FirmProfile).where(FirmProfile.is_active == True).where(FirmProfile.user_id == user_id).limit(1)
    )
    profile = profile_result.scalars().first()

    classification = await classify_startup(
        name=company.name,
        description=company.one_liner or "",
        website=company.website or "",
        source=company.source or "manual",
        firm=profile,
    )

    for key, value in classification.items():
        if value is None:
            continue
        if key in GLOBAL_FIELDS and hasattr(company, key):
            if key in ("key_risks", "bull_case") and isinstance(value, list):
                value = _normalize_text_or_list(value)
            setattr(company, key, value)
        elif key in FIRM_FIELDS and hasattr(score, key):
            if key in ("key_risks", "bull_case") and isinstance(value, list):
                value = _normalize_text_or_list(value)
            setattr(score, key, value)

    await db.commit()
    await db.refresh(company)
    await db.refresh(score)
    return _startup_to_card(company, score)
