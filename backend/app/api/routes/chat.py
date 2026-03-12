from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile
from app.core.config import settings
import anthropic

router = APIRouter(prefix="/chat")

class ChatMessage(BaseModel):
    message: str

@router.post("/")
async def chat(data: ChatMessage, db: AsyncSession = Depends(get_db)):
    profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
    profile = profile_result.scalar_one_or_none()

    result = await db.execute(select(Startup).order_by(Startup.fit_score.desc().nulls_last()).limit(100))
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

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1000,
        system=system_prompt,
        messages=[{"role": "user", "content": data.message}]
    )

    return {"response": message.content[0].text}
