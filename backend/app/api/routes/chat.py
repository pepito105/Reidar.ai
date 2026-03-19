from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from anthropic import AsyncAnthropic
from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.core.config import settings

router = APIRouter(prefix="/chat")


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


class ChatMessage(BaseModel):
    message: str

@router.post("/")
async def chat(request: Request, data: ChatMessage, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1))
    profile = profile_result.scalars().first()

    result = await db.execute(select(Startup).where(Startup.user_id == user_id).order_by(Startup.fit_score.desc().nulls_last()).limit(100))
    startups = result.scalars().all()

    company_context = "\n".join([
        f"- {s.name} | {s.one_liner or ''} | Stage: {s.funding_stage or '?'} | Sector: {s.sector or '?'} | Fit: {s.fit_score}/5 | AI: {s.ai_score}/5 | Pipeline: {s.pipeline_status or 'new'}"
        for s in startups
    ])

    thesis = profile.investment_thesis if profile else "Early-stage technology"
    firm_name = profile.firm_name if profile else "the firm"
    stages = ", ".join(profile.investment_stages) if profile and profile.investment_stages else "various stages"

    system_prompt = f"""You are Radar, an AI investment associate for {firm_name}.

Firm Thesis: {thesis}
Investment Stages: {stages}

You have access to the firm's deal database. Here are the top companies:
{company_context}

Answer questions about the deal flow, specific companies, market trends, and investment thesis. Be direct, analytical, and specific. Reference actual companies from the database when relevant."""

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": data.message}]
    )

    return {"response": message.content[0].text}
