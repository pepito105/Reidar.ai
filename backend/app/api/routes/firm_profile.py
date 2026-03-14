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


async def _generate_mandate_buckets(thesis: str) -> list:
    """Use Claude to extract 3-5 clean mandate bucket labels from the firm's thesis."""
    if not thesis or len(thesis.split()) < 8:
        return []
    try:
        from anthropic import AsyncAnthropic
        from app.core.config import settings
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": f"""Extract 3-5 short investment mandate category labels from this VC firm thesis.
Rules:
- Each label must be 2-4 words maximum
- Use title case (e.g. "Health & Wellness", "Consumer Marketplaces")
- Be specific to this firm's focus areas
- Always include "Other" as the last bucket as a fallback
- Return ONLY a JSON array of strings, no explanation

Thesis: {thesis}

Example output: ["Health & Wellness", "Consumer Marketplaces", "Digital Commerce", "Digital Subscriptions", "Other"]"""}]
        )
        import json, re
        raw = response.content[0].text.strip()
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        buckets = json.loads(raw.strip())
        if isinstance(buckets, list) and len(buckets) > 0:
            if "Other" not in buckets:
                buckets.append("Other")
            return buckets
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Bucket generation failed: {e}")
    return []


def _detect_ai_focus(thesis: str) -> bool:
    if not thesis:
        return False
    keywords = ["ai", "artificial intelligence", "machine learning", "llm", "large language model", "ml", "deep learning", "neural", "generative ai", "ai-native", "ai native"]
    thesis_lower = thesis.lower()
    return any(kw in thesis_lower for kw in keywords)


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
    mandate_buckets: Optional[List[str]] = []
    is_ai_focused: Optional[bool] = False

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
        if data.investment_thesis:
            profile.mandate_buckets = await _generate_mandate_buckets(data.investment_thesis)
            profile.is_ai_focused = _detect_ai_focus(data.investment_thesis)
        await db.commit()
        await db.refresh(profile)
        return profile
    buckets = await _generate_mandate_buckets(data.investment_thesis or "")
    ai_focused = _detect_ai_focus(data.investment_thesis or "")
    profile = FirmProfile(**data.model_dump(), user_id=user_id, mandate_buckets=buckets, is_ai_focused=ai_focused)
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
    if data.investment_thesis:
        profile.mandate_buckets = await _generate_mandate_buckets(data.investment_thesis)
        profile.is_ai_focused = _detect_ai_focus(data.investment_thesis)
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
