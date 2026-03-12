from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.models.firm_profile import FirmProfile
from app.models.startup import Startup
from app.core.config import settings
import json

router = APIRouter(prefix="/firm-profile")

class FirmProfileCreate(BaseModel):
    firm_name: str
    investment_stages: List[str] = []
    geography_focus: List[str] = []
    check_size_min: Optional[int] = None
    check_size_max: Optional[int] = None
    investment_thesis: Optional[str] = None
    excluded_sectors: List[str] = []
    fit_threshold: int = 3
    notify_top_match: Optional[bool] = True
    notify_diligence_signal: Optional[bool] = True
    notify_weekly_summary: Optional[bool] = True
    notify_min_fit_score: Optional[int] = 4
    notification_emails: Optional[str] = "remi@balassanian.com"

class FirmProfileResponse(BaseModel):
    id: int
    firm_name: str
    investment_stages: List[str]
    geography_focus: List[str]
    check_size_min: Optional[int]
    check_size_max: Optional[int]
    investment_thesis: Optional[str]
    excluded_sectors: List[str]
    fit_threshold: int
    is_active: bool
    notify_top_match: Optional[bool] = True
    notify_diligence_signal: Optional[bool] = True
    notify_weekly_summary: Optional[bool] = True
    notify_min_fit_score: Optional[int] = 4
    notification_emails: Optional[str] = "remi@balassanian.com"

    class Config:
        from_attributes = True

@router.get("/", response_model=Optional[FirmProfileResponse])
async def get_firm_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = result.scalar_one_or_none()
    return profile

@router.post("/", response_model=FirmProfileResponse)
async def create_firm_profile(data: FirmProfileCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    existing = result.scalar_one_or_none()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        await db.commit()
        await db.refresh(existing)
        return existing
    profile = FirmProfile(**data.model_dump())
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.put("/", response_model=FirmProfileResponse)
async def update_firm_profile(data: FirmProfileCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No active firm profile found")
    for key, value in data.model_dump().items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.post("/rescore")
async def rescore_companies(db: AsyncSession = Depends(get_db)):
    from app.services.classifier import classify_startup

    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No active firm profile found")

    result = await db.execute(select(Startup))
    startups = result.scalars().all()
    scored = 0

    def clamp(v):
        try:
            return max(1, min(5, int(v)))
        except:
            return None

    for startup in startups:
        try:
            description = startup.ai_summary or startup.one_liner or startup.name
            data = await classify_startup(
                name=startup.name,
                description=description,
                website=startup.website,
                source=startup.source or "scraped",
                firm=profile
            )
            cleaned_name = data.get("name")
            if cleaned_name is not None and str(cleaned_name).strip():
                startup.name = str(cleaned_name).strip()[:255]
            if data.get("fit_score") is not None:
                startup.fit_score = clamp(data["fit_score"])
            if data.get("ai_score") is not None:
                startup.ai_score = clamp(data["ai_score"])
            if data.get("fit_reasoning"):
                startup.fit_reasoning = str(data["fit_reasoning"])[:999]
            if data.get("recommended_next_step"):
                startup.recommended_next_step = str(data["recommended_next_step"])[:499]
            scored += 1
        except Exception as e:
            continue

    await db.commit()
    return {"success": True, "scored": scored, "total": len(startups)}