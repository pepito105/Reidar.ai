from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel
from typing import List, Optional, Any
from app.core.database import get_db
from app.models.startup import Startup

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
    startup_id: int
    new_status: str

class PipelineCard(BaseModel):
    id: int
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
        select(Startup)
        .where(Startup.pipeline_status.in_(PIPELINE_STAGES))
        .where(Startup.user_id == user_id)
    )
    result = await db.execute(query)
    startups = result.scalars().all()
    board = {stage: [] for stage in PIPELINE_STAGES}
    for s in startups:
        if s.pipeline_status in board:
            board[s.pipeline_status].append({
                "id": s.id,
                "name": s.name,
                "one_liner": s.one_liner,
                "fit_score": s.fit_score,
                "funding_stage": s.funding_stage,
                "pipeline_status": s.pipeline_status,
                "thesis_tags": s.thesis_tags,
                "is_portfolio": s.is_portfolio or False,
            })
    return board

@router.post("/move")
async def move_in_pipeline(data: PipelineMove, request: Request, db: AsyncSession = Depends(get_db)):
    if data.new_status not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {PIPELINE_STAGES}")
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(Startup)
        .where(Startup.id == data.startup_id)
        .where(Startup.user_id == user_id)
    )
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    old_status = startup.pipeline_status
    startup.pipeline_status = data.new_status
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
            import logging
            logging.getLogger(__name__).warning(f"Failed to write pipeline memory: {e}")

    # Trigger immediate signal check when company enters pipeline
    if data.new_status in ("watching", "outreach", "diligence"):
        try:
            import asyncio
            from app.core.database import AsyncSessionLocal
            from app.services.refresh_service import refresh_company

            startup_id = startup.id

            async def _background_signal_check():
                try:
                    async with AsyncSessionLocal() as bg_db:
                        from sqlalchemy import select
                        from app.models.startup import Startup as StartupModel
                        result = await bg_db.execute(
                            select(StartupModel).where(StartupModel.id == startup_id)
                        )
                        s = result.scalar_one_or_none()
                        if s:
                            await refresh_company(s, bg_db)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(
                        f"Background signal check failed for startup {startup_id}: {e}"
                    )

            asyncio.create_task(_background_signal_check())
            import logging
            logging.getLogger(__name__).info(
                f"Background signal check triggered for {startup.name} "
                f"(moved to {data.new_status})"
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to trigger signal check for {startup.name}: {e}"
            )

    return {"success": True, "startup_id": data.startup_id}
