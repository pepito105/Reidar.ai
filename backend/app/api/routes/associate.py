import json
import logging
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.database import get_db
from app.core.config import settings
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile
from app.services.associate_memory_service import retrieve_memories, format_memories_for_prompt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/associate")
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


def _user_id_from_request(request: Request):
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


async def _build_pipeline_context(db: AsyncSession, user_id: str) -> str:
    """Build a summary of the current pipeline state."""
    result = await db.execute(
        select(Startup)
        .where(Startup.user_id == user_id)
        .where(Startup.pipeline_status.in_(["watching", "outreach", "diligence", "passed"]))
        .order_by(Startup.fit_score.desc())
        .limit(30)
    )
    startups = result.scalars().all()
    if not startups:
        return "No companies in pipeline yet."

    lines = ["CURRENT PIPELINE:"]
    for s in startups:
        line = f"- {s.name} ({s.pipeline_status}, fit {s.fit_score}/5, {s.sector or 'unknown sector'})"
        if s.one_liner:
            line += f": {s.one_liner[:100]}"
        lines.append(line)
    return "\n".join(lines)


async def _build_firm_context(db: AsyncSession, user_id: str) -> str:
    """Build firm profile context."""
    result = await db.execute(
        select(FirmProfile)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    firm = result.scalars().first()
    if not firm:
        return ""
    stages = ", ".join(firm.investment_stages or [])
    return f"FIRM: {firm.firm_name}\nThesis: {firm.investment_thesis or 'Not set'}\nStages: {stages}"


@router.post("/chat")
async def associate_chat(
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """SSE streaming associate chat endpoint."""
    user_id = _user_id_from_request(request)
    messages = payload.get("messages", [])
    current_message = messages[-1]["content"] if messages else ""

    async def event_generator():
        # Retrieve relevant memories
        memories = await retrieve_memories(db, user_id, current_message, limit=6)
        memory_context = await format_memories_for_prompt(memories)

        # Build pipeline context
        pipeline_context = await _build_pipeline_context(db, user_id)
        firm_context = await _build_firm_context(db, user_id)

        system_prompt = f"""You are Radar's AI Associate — a senior investment analyst embedded in a VC firm's deal flow platform.

You have full context about the firm's pipeline, past decisions, and investment thesis. You are direct, specific, and never generic. You cite actual company names, scores, and data from the pipeline. You think like a partner, not an intern.

{firm_context}

{pipeline_context}

{memory_context}

When asked about specific companies, draw on what you know from the pipeline and memory above.
When asked for recommendations, be specific and actionable — name companies, suggest next steps, flag risks.
When you notice patterns, surface them proactively.
Keep responses concise — this is a chat interface, not a report. Use bullet points for lists."""

        # Stream response
        try:
            async with client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=1000,
                system=system_prompt,
                messages=[{"role": m["role"], "content": m["content"]} for m in messages],
            ) as stream:
                async for text in stream.text_stream:
                    yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error(f"Associate chat error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/memories")
async def get_memories(request: Request, db: AsyncSession = Depends(get_db)):
    """Return recent memories for the current user."""
    from app.models.associate_memory import AssociateMemory
    user_id = _user_id_from_request(request)
    result = await db.execute(
        select(AssociateMemory)
        .where(AssociateMemory.user_id == user_id)
        .order_by(AssociateMemory.created_at.desc())
        .limit(20)
    )
    memories = result.scalars().all()
    return [
        {
            "id": m.id,
            "memory_type": m.memory_type,
            "content": m.content,
            "company_name": m.company_name,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in memories
    ]
