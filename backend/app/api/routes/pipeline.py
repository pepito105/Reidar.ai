from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import List, Optional, Any
from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore

router = APIRouter(prefix="/pipeline")
PIPELINE_STAGES = ["watching", "outreach", "diligence", "passed", "invested"]

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

class PipelineMove(BaseModel):
    startup_id: str
    new_status: str

class PipelineCard(BaseModel):
    id: str
    name: str
    one_liner: Optional[str]
    fit_score: Optional[int]
    funding_stage: Optional[str]
    pipeline_status: Optional[str]
    thesis_tags: Optional[List[Any]]
    is_portfolio: Optional[bool]
    class Config:
        from_attributes = True

@router.get("/", response_model=dict)
async def get_pipeline(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    query = (
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.pipeline_status.in_(PIPELINE_STAGES))
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
    )
    result = await db.execute(query)
    rows = result.fetchall()

    # Fetch last activity timestamps for all pipeline companies
    from sqlalchemy import func
    from app.models.activity_event import ActivityEvent

    company_ids = [row[0].id for row in rows]
    last_activity_map = {}
    if company_ids:
        activity_result = await db.execute(
            select(
                ActivityEvent.company_id,
                func.max(ActivityEvent.created_at).label('last_at')
            )
            .where(ActivityEvent.company_id.in_(company_ids))
            .where(ActivityEvent.user_id == user_id)
            .group_by(ActivityEvent.company_id)
        )
        for ar in activity_result.fetchall():
            last_activity_map[ar.company_id] = ar.last_at

    board = {stage: [] for stage in PIPELINE_STAGES}
    for row in rows:
        company, score = row[0], row[1]
        if score.pipeline_status in board:
            board[score.pipeline_status].append({
                "id": str(score.id),
                "company_id": str(company.id),
                "name": company.name,
                "slug": company.slug,
                "one_liner": company.one_liner,
                "enriched_one_liner": company.enriched_one_liner,
                "ai_summary": company.ai_summary,
                "website": company.website,
                "fit_score": score.fit_score,
                "ai_score": None,
                "fit_reasoning": score.fit_reasoning,
                "funding_stage": company.funding_stage,
                "funding_amount_usd": company.funding_amount_usd,
                "top_investors": company.top_investors,
                "sector": company.sector,
                "mandate_category": score.mandate_category,
                "thesis_tags": score.thesis_tags,
                "business_model": company.business_model,
                "target_customer": company.target_customer,
                "pipeline_status": score.pipeline_status,
                "notes": score.notes,
                "conviction_score": score.conviction_score,
                "next_action": score.next_action,
                "next_action_due": (score.next_action_due.isoformat() + "Z") if score.next_action_due else None,
                "activity_log": score.activity_log or [],
                "meeting_notes": score.meeting_notes or [],
                "founder_contacts": score.founder_contacts or [],
                "comparable_companies": score.comparable_companies or [],
                "recommended_next_step": score.recommended_next_step,
                "key_risks": score.key_risks,
                "bull_case": score.bull_case,
                "traction_signals": company.traction_signals,
                "red_flags": score.red_flags,
                "sources_visited": company.sources_visited,
                "research_status": score.research_status,
                "research_completed_at": (score.research_completed_at.isoformat() + "Z") if score.research_completed_at else None,
                "has_unseen_signals": bool(score.has_unseen_signals) if score.has_unseen_signals is not None else False,
                "is_portfolio": score.is_portfolio or False,
                "scraped_at": (company.scraped_at.isoformat() + "Z") if company.scraped_at else None,
                "updated_at": (company.scraped_at.isoformat() + "Z") if company.scraped_at else None,
                "last_activity_at": last_activity_map.get(company.id).isoformat() if last_activity_map.get(company.id) else None,
            })
    return board

@router.post("/move")
async def move_in_pipeline(data: PipelineMove, request: Request, db: AsyncSession = Depends(get_db)):
    if data.new_status not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {PIPELINE_STAGES}")
    user_id = _user_id_from_request(request)

    import uuid as _uuid
    try:
        score_uuid = _uuid.UUID(data.startup_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid ID format: {data.startup_id}")

    row = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )
    row = row.first()
    if not row:
        raise HTTPException(status_code=404, detail="Startup not found")
    company, score = row[0], row[1]

    old_status = score.pipeline_status
    score.pipeline_status = data.new_status
    await db.commit()

    # Write memory for pipeline status change
    if old_status != data.new_status:
        try:
            from app.services.associate_memory_service import write_memory
            status_labels = {
                "watching": "moved to Watching — worth monitoring",
                "outreach": "moved to Outreach — actively pursuing",
                "diligence": "moved to Diligence — serious consideration",
                "passed": "passed on",
                "invested": "invested in",
            }
            action = status_labels.get(data.new_status, f"updated status to {data.new_status}")
            content = f"{company.name}: {action}. Sector: {company.sector or 'unknown'}. Fit score: {score.fit_score}/5."
            if company.one_liner:
                content += f" Description: {company.one_liner}"
            await write_memory(
                db=db,
                user_id=user_id,
                memory_type="decision",
                content=content,
                company_id=str(company.id),
                company_name=company.name,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to write pipeline memory: {e}")

    # Write activity event
    if old_status != data.new_status:
        try:
            from app.services.activity_writer import write_pipeline_moved
            await write_pipeline_moved(
                db=db,
                company_id=company.id,
                startup_name=company.name,
                new_status=data.new_status,
                old_status=old_status,
                user_id=user_id,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to write pipeline activity for {company.name}: {e}"
            )

    # Trigger immediate signal check when company enters pipeline
    if data.new_status in ("watching", "outreach", "diligence"):
        try:
            import asyncio
            from app.core.database import AsyncSessionLocal
            from app.services.refresh_service import refresh_company

            score_id = score.id

            async def _background_signal_check():
                try:
                    async with AsyncSessionLocal() as bg_db:
                        bg_result = await bg_db.execute(
                            select(FirmCompanyScore).where(FirmCompanyScore.id == score_id)
                        )
                        s = bg_result.scalar_one_or_none()
                        if s:
                            await refresh_company(s, bg_db)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Background signal check failed for score {score_id}: {e}"
                    )

            asyncio.create_task(_background_signal_check())
            import logging
            logging.getLogger(__name__).info(
                f"Background signal check triggered for {company.name} "
                f"(moved to {data.new_status})"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to trigger signal check for {company.name}: {e}"
            )

    return {"success": True, "startup_id": data.startup_id}
