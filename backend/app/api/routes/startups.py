from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel
from datetime import timedelta, timezone
from typing import List, Optional, Any, Dict


def _utc_isoformat(dt) -> Optional[str]:
    """Serialize datetime as UTC ISO string ending with Z so the frontend parses correctly."""
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        dt = dt.astimezone(timezone.utc)
    else:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
from app.core.database import get_db
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile

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
    }


@router.get("/", response_model=List[StartupResponse])
async def get_startups(
    stage: Optional[str] = Query(None),
    fit_level: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    sort: Optional[str] = Query("fit_score"),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db)
):
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()
    threshold = profile.fit_threshold if profile else 3

    query = select(Startup)
    query = query.where(Startup.fit_score >= threshold)
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
async def get_startups_count(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(select(func.count()).select_from(Startup))
    return {"count": result.scalar() or 0}


class AddCompanyRequest(BaseModel):
    name: str
    website: Optional[str] = None
    description: Optional[str] = None
    meeting_notes: Optional[str] = None
    funding_stage: Optional[str] = None
    source: Optional[str] = "manual"

@router.post("/add")
async def add_company(data: AddCompanyRequest, db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup
    from app.models.firm_profile import FirmProfile
    import re as _re, datetime as _dt

    firm_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).limit(1))
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
        business_model=t(result.get("business_model"), 99),
        target_customer=t(result.get("target_customer"), 199),
        thesis_tags=result.get("thesis_tags", []),
        recommended_next_step=t(result.get("recommended_next_step"), 499),
        funding_stage=t(data.funding_stage or result.get("funding_stage") or "unknown", 49),
        source=data.source or "manual",
        meeting_notes=[{"note": data.meeting_notes, "created_at": _dt.datetime.now().isoformat()}] if data.meeting_notes else [],
        scraped_at=_dt.datetime.now(_dt.timezone.utc),
    )

    db.add(startup)
    await db.commit()
    await db.refresh(startup)
    return _startup_to_card(startup)

@router.get("/last-scrape")
async def get_last_scrape(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func as sqlfunc
    max_result = await db.execute(select(sqlfunc.max(Startup.scraped_at)))
    last_scraped_at = max_result.scalar()
    if not last_scraped_at:
        return {"last_scraped_at": None, "companies": [], "count": 0}

    result = await db.execute(
        select(Startup)
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


@router.get("/{startup_id}")
async def get_startup(startup_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    if not (startup.fit_reasoning and startup.fit_reasoning.strip()):
        from app.services.classifier import classify_startup
        profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
        profile = profile_result.scalar_one_or_none()
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
async def update_startup(startup_id: int, data: StartupUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(startup, key, value)
    await db.commit()
    await db.refresh(startup)
    return startup

@router.post("/{startup_id}/refresh")
async def refresh_startup(startup_id: int, db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup
    from app.models.firm_profile import FirmProfile
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()
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
