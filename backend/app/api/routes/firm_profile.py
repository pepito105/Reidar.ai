from fastapi import APIRouter, Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.models.firm_profile import FirmProfile
from app.models.startup import Startup
from app.core.auth import get_current_user_id

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
    notification_emails: Optional[str] = None

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
    notification_emails: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=Optional[FirmProfileResponse])
async def get_firm_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            user_id = decoded.get("sub")
        except Exception:
            user_id = None
    else:
        user_id = None
    if user_id:
        result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id, FirmProfile.is_active == True)
        )
        existing = result.scalar_one_or_none()
        print(f"GET firm-profile: user_id={user_id}, found={existing is not None}")
        return existing
    else:
        print(f"GET firm-profile: user_id={user_id}, found=False")
        return None

@router.post("/", response_model=FirmProfileResponse)
async def create_firm_profile(
    data: FirmProfileCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False))
):
    user_id = await get_current_user_id(request, credentials)
    if user_id:
        result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id, FirmProfile.is_active == True)
        )
    else:
        result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id.is_(None), FirmProfile.is_active == True)
        )
    existing = result.scalar_one_or_none()
    if existing:
        profile = existing
        for key, value in data.model_dump().items():
            setattr(profile, key, value)
        await db.commit()
        await db.refresh(profile)
        return profile
    profile = FirmProfile(**data.model_dump(), user_id=user_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.put("/", response_model=FirmProfileResponse)
async def update_firm_profile(
    data: FirmProfileCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False))
):
    user_id = await get_current_user_id(request, credentials)
    if user_id:
        result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id, FirmProfile.is_active == True)
        )
    else:
        return None
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No active firm profile found")
    for key, value in data.model_dump().items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.post("/rescore")
async def rescore_companies(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Security(HTTPBearer(auto_error=False))
):
    from app.services.classifier import classify_startup
    user_id = await get_current_user_id(request, credentials)

    if user_id:
        profile_result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id, FirmProfile.is_active == True)
        )
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No active firm profile found")

    if user_id:
        result = await db.execute(select(Startup).where(Startup.user_id == user_id))
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
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
            if data.get("fit_score") is not None:
                startup.fit_score = clamp(data["fit_score"])
            if data.get("ai_score") is not None:
                startup.ai_score = clamp(data["ai_score"])
            if data.get("mandate_category"):
                startup.mandate_category = data["mandate_category"][:99]
            if data.get("fit_reasoning"):
                startup.fit_reasoning = str(data["fit_reasoning"])[:999]
            if data.get("recommended_next_step"):
                startup.recommended_next_step = str(data["recommended_next_step"])[:499]
            scored += 1
        except:
            continue

    await db.commit()
    return {"success": True, "scored": scored, "total": len(startups)}
