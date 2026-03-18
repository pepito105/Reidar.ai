import json
import logging
from collections import Counter
from datetime import datetime
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


ASSOCIATE_TOOLS = [
    {
        "name": "search_pipeline",
        "description": "Search and filter the user's startup pipeline. Use this when the user asks about specific companies, pipeline status, fit scores, sectors, or wants to find companies matching criteria.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "description": "Filter by pipeline status: new, watching, outreach, diligence, passed, invested",
                },
                "min_fit_score": {
                    "type": "integer",
                    "description": "Minimum fit score (1-5)",
                },
                "sector": {
                    "type": "string",
                    "description": "Filter by sector name",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 10)",
                }
            },
            "required": []
        }
    },
    {
        "name": "get_pipeline_insights",
        "description": "Analyze the pipeline for patterns, stale deals, mandate drift, and actionable insights. Use this when the user asks for recommendations, what to prioritize, or what patterns exist.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "run_research",
        "description": "Run deep research on a specific company using web search. Use this when the user asks to research a company, get more details, or deploy research agents on a company. Requires the company name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "The exact name of the company to research"
                },
                "custom_focus": {
                    "type": "string",
                    "description": "Optional specific question or focus area for the research"
                }
            },
            "required": ["company_name"]
        }
    },
    {
        "name": "draft_memo",
        "description": "Draft an investment memo for a company that has already been researched. Use this when the user asks to draft or generate a memo for a company.",
        "input_schema": {
            "type": "object",
            "properties": {
                "company_name": {
                    "type": "string",
                    "description": "The exact name of the company to draft a memo for"
                }
            },
            "required": ["company_name"]
        }
    }
]


async def _execute_tool(tool_name: str, tool_input: dict, db: AsyncSession, user_id: str) -> str:
    """Execute a tool call and return the result as a string."""
    if tool_name == "search_pipeline":
        query = select(Startup).where(Startup.user_id == user_id)
        if tool_input.get("status"):
            query = query.where(Startup.pipeline_status == tool_input["status"])
        if tool_input.get("min_fit_score"):
            query = query.where(Startup.fit_score >= tool_input["min_fit_score"])
        if tool_input.get("sector"):
            query = query.where(Startup.sector.ilike(f"%{tool_input['sector']}%"))
        query = query.order_by(Startup.fit_score.desc()).limit(tool_input.get("limit", 10))
        result = await db.execute(query)
        startups = result.scalars().all()
        if not startups:
            return "No companies found matching those criteria."
        lines = []
        for s in startups:
            line = f"- {s.name} (fit {s.fit_score}/5, {s.pipeline_status or 'new'}, {s.sector or 'unknown'})"
            if s.one_liner:
                line += f": {s.one_liner[:100]}"
            if s.scraped_at:
                days_ago = (datetime.utcnow() - s.scraped_at.replace(tzinfo=None)).days
                line += f" [added {days_ago}d ago]"
            lines.append(line)
        return "\n".join(lines)

    elif tool_name == "get_pipeline_insights":
        result = await db.execute(
            select(Startup)
            .where(Startup.user_id == user_id)
            .where(Startup.pipeline_status.in_(["watching", "outreach", "diligence"]))
        )
        startups = result.scalars().all()
        insights = []
        now = datetime.utcnow()

        # Stale deals
        stale = []
        for s in startups:
            if s.scraped_at:
                days = (now - s.scraped_at.replace(tzinfo=None)).days
                if days > 14:
                    stale.append(f"{s.name} ({s.pipeline_status}, {days}d)")
        if stale:
            insights.append(f"STALE DEALS (>14 days): {', '.join(stale)}")

        # Sector clustering
        sectors = Counter(s.sector for s in startups if s.sector)
        dominant = [(s, c) for s, c in sectors.most_common(3) if c >= 3]
        if dominant:
            insights.append(f"SECTOR CLUSTERING: {', '.join(f'{s} ({c} companies)' for s, c in dominant)}")

        # High fit scores not acted on
        high_fit_new = [s.name for s in startups if (s.fit_score or 0) >= 5 and s.pipeline_status == "watching"]
        if high_fit_new:
            insights.append(f"TOP MATCHES STILL WATCHING: {', '.join(high_fit_new)}")

        return "\n".join(insights) if insights else "Pipeline looks healthy — no major issues detected."

    elif tool_name == "run_research":
        company_name = tool_input.get("company_name", "")
        custom_focus = tool_input.get("custom_focus")

        # Find the company in the database
        result = await db.execute(
            select(Startup)
            .where(Startup.user_id == user_id)
            .where(Startup.name.ilike(f"%{company_name}%"))
            .limit(1)
        )
        startup = result.scalar_one_or_none()
        if not startup:
            return f"Could not find a company named '{company_name}' in your pipeline."

        # Get firm profile
        firm_result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
        )
        firm = firm_result.scalars().first()

        from app.services.classifier import research_startup
        result_data = await research_startup(
            name=startup.name,
            description=startup.one_liner or startup.name,
            website=startup.website,
            firm=firm,
            custom_focus=custom_focus,
            db=db,
        )

        if not result_data:
            return f"Research failed for {company_name}."

        # Save results back to the startup
        fit_reasoning = result_data.get("fit_reasoning")
        if isinstance(fit_reasoning, dict):
            startup.fit_reasoning = json.dumps(fit_reasoning)
        elif isinstance(fit_reasoning, str):
            startup.fit_reasoning = fit_reasoning[:3000]
        if result_data.get("traction_signals"):
            startup.traction_signals = result_data["traction_signals"]
        if result_data.get("red_flags"):
            startup.red_flags = result_data["red_flags"]
        if result_data.get("enriched_one_liner"):
            startup.enriched_one_liner = result_data["enriched_one_liner"]
        if result_data.get("ai_summary"):
            startup.ai_summary = result_data["ai_summary"]
        if result_data.get("fit_score"):
            startup.fit_score = result_data["fit_score"]
        if result_data.get("research_status") == "complete":
            startup.research_status = "complete"
            startup.research_completed_at = datetime.utcnow()
        await db.commit()

        # Write memory
        from app.services.associate_memory_service import write_memory
        await write_memory(
            db=db,
            user_id=user_id,
            memory_type="fact",
            content=f"{startup.name}: research completed via associate. Fit: {result_data.get('fit_score')}/5. {(result_data.get('traction_signals') or '')[:150]}",
            company_id=startup.id,
            company_name=startup.name,
        )

        summary = f"Research complete for {startup.name}.\n"
        summary += f"Fit score: {result_data.get('fit_score')}/5\n"
        if result_data.get("traction_signals"):
            summary += f"Traction: {result_data['traction_signals'][:300]}\n"
        if result_data.get("red_flags"):
            summary += f"Red flags: {result_data['red_flags'][:200]}\n"
        if result_data.get("recommended_next_step"):
            summary += f"Recommendation: {result_data['recommended_next_step']}"

        sources = result_data.get("sources_visited", [])
        if sources:
            summary += f"\n\n📎 Sources visited:\n" + "\n".join(f"- {s}" for s in sources[:8])
        return summary

    elif tool_name == "draft_memo":
        company_name = tool_input.get("company_name", "")

        result = await db.execute(
            select(Startup)
            .where(Startup.user_id == user_id)
            .where(Startup.name.ilike(f"%{company_name}%"))
            .limit(1)
        )
        startup = result.scalar_one_or_none()
        if not startup:
            return f"Could not find '{company_name}' in your pipeline."
        if not startup.fit_reasoning:
            return f"{startup.name} hasn't been researched yet. Run research first before drafting a memo."

        firm_result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
        )
        firm = firm_result.scalars().first()

        from app.api.routes.memo import generate_memo_for_startup
        memo = await generate_memo_for_startup(startup, firm, db)

        if not memo:
            return f"Failed to generate memo for {company_name}."

        startup.memo = memo
        startup.memo_generated_at = datetime.utcnow()
        await db.commit()

        return f"Memo drafted for {startup.name}. It's now available in the Memo tab of the company detail panel. Here's the executive summary:\n\n{memo[:500]}..."

    return f"Unknown tool: {tool_name}"


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

        try:
            # First call with tools
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                system=system_prompt,
                tools=ASSOCIATE_TOOLS,
                messages=[{"role": m["role"], "content": m["content"]} for m in messages],
            )

            # Handle tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    yield f"data: {json.dumps({'type': 'tool_call', 'tool': block.name})}\n\n"
                    result = await _execute_tool(block.name, block.input, db, user_id)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            # If tools were called, make a second call with results
            if tool_results:
                all_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
                all_messages.append({"role": "assistant", "content": response.content})
                all_messages.append({"role": "user", "content": tool_results})

                async with client.messages.stream(
                    model="claude-sonnet-4-6",
                    max_tokens=1000,
                    system=system_prompt,
                    messages=all_messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
            else:
                # No tools called — stream directly
                for block in response.content:
                    if hasattr(block, 'text'):
                        yield f"data: {json.dumps({'type': 'text', 'content': block.text})}\n\n"

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
