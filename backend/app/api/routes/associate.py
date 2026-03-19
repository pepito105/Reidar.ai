import json
import logging
from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from anthropic import AsyncAnthropic
from app.core.database import get_db
from app.core.config import settings
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
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
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence", "passed"]))
        .order_by(FirmCompanyScore.fit_score.desc())
        .limit(30)
    )
    rows = result.fetchall()
    if not rows:
        return "No companies in pipeline yet."

    lines = ["CURRENT PIPELINE:"]
    for row in rows:
        company, score = row[0], row[1]
        line = f"- {company.name} ({score.pipeline_status}, fit {score.fit_score}/5, {company.sector or 'unknown sector'})"
        if company.one_liner:
            line += f": {company.one_liner[:100]}"
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


async def _build_activity_context(db: AsyncSession, user_id: str) -> str:
    """
    Fetch recent activity events for pipeline companies.
    Gives the associate awareness of what's happened recently.
    """
    try:
        from app.models.activity_event import ActivityEvent
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)

        result = await db.execute(
            select(ActivityEvent)
            .join(FirmCompanyScore, ActivityEvent.company_id == FirmCompanyScore.company_id)
            .where(ActivityEvent.user_id == user_id)
            .where(ActivityEvent.created_at >= cutoff)
            .where(FirmCompanyScore.pipeline_status.in_(
                ['watching', 'outreach', 'diligence', 'passed', 'invested']
            ))
            .where(FirmCompanyScore.user_id == user_id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(30)
        )
        events = result.scalars().all()

        if not events:
            return ""

        lines = []
        for e in events:
            age = datetime.utcnow() - e.created_at
            days = age.days
            age_str = "today" if days == 0 else f"{days}d ago"
            lines.append(
                f"- [{age_str}] {e.startup_name}: {e.title}"
                + (f" — {e.detail[:100]}" if e.detail else "")
            )

        return "RECENT PIPELINE ACTIVITY (last 30 days):\n" + "\n".join(lines)
    except Exception as e:
        logger.warning(f"Failed to build activity context: {e}")
        return ""


async def _build_coverage_context(db: AsyncSession, user_id: str) -> str:
    """
    Surface top-fit Coverage companies not yet in pipeline.
    Lets the associate answer "what should we look at next?"
    """
    try:
        result = await db.execute(
            select(FirmCompanyScore)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.fit_score >= 4)
            .where(
                or_(
                    FirmCompanyScore.pipeline_status.is_(None),
                    FirmCompanyScore.pipeline_status == 'new'
                )
            )
            .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
            .order_by(FirmCompanyScore.fit_score.desc())
            .limit(20)
        )
        scores = result.scalars().all()
        if not scores:
            return ""

        # Load company names for these scores
        company_ids = [s.company_id for s in scores]
        companies_result = await db.execute(
            select(Company).where(Company.id.in_(company_ids))
        )
        companies_map = {c.id: c for c in companies_result.scalars().all()}

        lines = []
        for s in scores:
            c = companies_map.get(s.company_id)
            if not c:
                continue
            score_label = "Top Match" if s.fit_score == 5 else "Strong Fit"
            lines.append(
                f"- {c.name} ({score_label}, {c.sector or 'unknown sector'}): "
                f"{(c.one_liner or '')[:100]}"
            )
        return "TOP COVERAGE (not yet in pipeline, fit 4-5/5):\n" + "\n".join(lines)
    except Exception as e:
        logger.warning(f"Failed to build coverage context: {e}")
        return ""


async def _build_signals_context(db: AsyncSession, user_id: str) -> str:
    """
    Fetch actual signal content for pipeline companies.
    Lets the associate reason about real news and events.
    """
    try:
        from app.models.signal import CompanySignal
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        result = await db.execute(
            select(CompanySignal, Company.name)
            .join(Company, CompanySignal.company_id == Company.id)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(CompanySignal.detected_at >= cutoff)
            .where(FirmCompanyScore.pipeline_status.in_(
                ['watching', 'outreach', 'diligence']
            ))
            .order_by(CompanySignal.detected_at.desc())
            .limit(20)
        )
        rows = result.all()
        if not rows:
            return ""
        lines = []
        for signal, company_name in rows:
            age = datetime.utcnow() - signal.detected_at.replace(tzinfo=None)
            age_str = "today" if age.days == 0 else f"{age.days}d ago"
            line = f"- [{age_str}] {company_name} — {signal.title}"
            if signal.summary:
                line += f": {signal.summary[:120]}"
            if signal.source_url:
                line += f" ({signal.source_url})"
            lines.append(line)
        return "RECENT SIGNALS (pipeline companies, last 30 days):\n" + "\n".join(lines)
    except Exception as e:
        logger.warning(f"Failed to build signals context: {e}")
        return ""


async def _build_research_context(db: AsyncSession, user_id: str) -> str:
    """
    Surface fit reasoning and key risks for pipeline companies
    that have completed research. Lets the associate explain
    scoring decisions and surface red flags.
    """
    try:
        import json as _json
        from datetime import timedelta
        research_cutoff = datetime.utcnow() - timedelta(days=14)
        result = await db.execute(
            select(FirmCompanyScore, Company.name)
            .join(Company, Company.id == FirmCompanyScore.company_id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.research_status == 'complete')
            .where(FirmCompanyScore.research_completed_at >= research_cutoff)
            .where(FirmCompanyScore.fit_reasoning.isnot(None))
            .order_by(FirmCompanyScore.fit_score.desc())
            .limit(15)
        )
        rows = result.fetchall()
        if not rows:
            return ""
        lines = []
        for score, company_name in rows:
            lines.append(f"\n{company_name} (fit {score.fit_score}/5):")
            if score.fit_reasoning:
                try:
                    reasoning = _json.loads(score.fit_reasoning)
                    if isinstance(reasoning, dict):
                        summary = reasoning.get('summary') or reasoning.get('overall') or str(reasoning)[:200]
                    else:
                        summary = str(reasoning)[:200]
                except Exception:
                    summary = str(score.fit_reasoning)[:200]
                lines.append(f"  Fit reasoning: {summary}")
            if score.recommended_next_step:
                lines.append(f"  Next step: {str(score.recommended_next_step)[:150]}")
            if score.red_flags:
                try:
                    flags = _json.loads(score.red_flags) if isinstance(score.red_flags, str) else score.red_flags
                    if isinstance(flags, list) and flags:
                        lines.append(f"  Red flags: {str(flags[0])[:120]}")
                except Exception:
                    pass
        return "RESEARCH BRIEFS (pipeline companies with completed research):" + "\n".join(lines)
    except Exception as e:
        logger.warning(f"Failed to build research context: {e}")
        return ""


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
        query = (
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
        )
        if tool_input.get("status"):
            query = query.where(FirmCompanyScore.pipeline_status == tool_input["status"])
        if tool_input.get("min_fit_score"):
            query = query.where(FirmCompanyScore.fit_score >= tool_input["min_fit_score"])
        if tool_input.get("sector"):
            query = query.where(Company.sector.ilike(f"%{tool_input['sector']}%"))
        query = query.order_by(FirmCompanyScore.fit_score.desc()).limit(tool_input.get("limit", 10))
        result = await db.execute(query)
        rows = result.fetchall()
        if not rows:
            return "No companies found matching those criteria."
        lines = []
        for row in rows:
            company, score = row[0], row[1]
            line = f"- {company.name} (fit {score.fit_score}/5, {score.pipeline_status or 'new'}, {company.sector or 'unknown'})"
            if company.one_liner:
                line += f": {company.one_liner[:100]}"
            if company.scraped_at:
                days_ago = (datetime.utcnow() - company.scraped_at.replace(tzinfo=None)).days
                line += f" [added {days_ago}d ago]"
            lines.append(line)
        return "\n".join(lines)

    elif tool_name == "get_pipeline_insights":
        result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
        )
        rows = result.fetchall()
        insights = []
        now = datetime.utcnow()

        # Stale deals
        stale = []
        for row in rows:
            company, score = row[0], row[1]
            if company.scraped_at:
                days = (now - company.scraped_at.replace(tzinfo=None)).days
                if days > 14:
                    stale.append(f"{company.name} ({score.pipeline_status}, {days}d)")
        if stale:
            insights.append(f"STALE DEALS (>14 days): {', '.join(stale)}")

        # Sector clustering
        sectors = Counter(row[0].sector for row in rows if row[0].sector)
        dominant = [(s, c) for s, c in sectors.most_common(3) if c >= 3]
        if dominant:
            insights.append(f"SECTOR CLUSTERING: {', '.join(f'{s} ({c} companies)' for s, c in dominant)}")

        # High fit scores not acted on
        high_fit_new = [row[0].name for row in rows if (row[1].fit_score or 0) >= 5 and row[1].pipeline_status == "watching"]
        if high_fit_new:
            insights.append(f"TOP MATCHES STILL WATCHING: {', '.join(high_fit_new)}")

        return "\n".join(insights) if insights else "Pipeline looks healthy — no major issues detected."

    elif tool_name == "run_research":
        company_name = tool_input.get("company_name", "")
        custom_focus = tool_input.get("custom_focus")

        # Find the company in the database
        result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(Company.name.ilike(f"%{company_name}%"))
            .limit(1)
        )
        row = result.first()
        if not row:
            return f"Could not find a company named '{company_name}' in your pipeline."
        company, score = row[0], row[1]

        # Get firm profile
        firm_result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
        )
        firm = firm_result.scalars().first()

        from app.services.classifier import research_startup, GLOBAL_FIELDS, FIRM_FIELDS
        result_data = await research_startup(
            name=company.name,
            description=company.one_liner or company.name,
            website=company.website,
            firm=firm,
            custom_focus=custom_focus,
            db=db,
        )

        if not result_data:
            return f"Research failed for {company_name}."

        # Route results to correct table
        for field in GLOBAL_FIELDS:
            value = result_data.get(field)
            if value is not None:
                setattr(company, field, value)
        for field in FIRM_FIELDS:
            value = result_data.get(field)
            if value is not None:
                if field == "fit_reasoning" and isinstance(value, dict):
                    setattr(score, field, json.dumps(value))
                else:
                    setattr(score, field, value)
        if result_data.get("research_status") == "complete":
            score.research_status = "complete"
            score.research_completed_at = datetime.utcnow()
        await db.commit()

        # Write memory
        from app.services.associate_memory_service import write_memory
        await write_memory(
            db=db,
            user_id=user_id,
            memory_type="fact",
            content=f"{company.name}: research completed via associate. Fit: {result_data.get('fit_score')}/5. {(company.traction_signals or '')[:150]}",
            company_id=str(company.id),
            company_name=company.name,
        )

        summary = f"Research complete for {company.name}.\n"
        summary += f"Fit score: {result_data.get('fit_score')}/5\n"
        if company.traction_signals:
            summary += f"Traction: {company.traction_signals[:300]}\n"
        if score.red_flags:
            summary += f"Red flags: {score.red_flags[:200]}\n"
        if score.recommended_next_step:
            summary += f"Recommendation: {score.recommended_next_step}"

        sources = company.sources_visited or []
        if sources:
            summary += f"\n\n📎 Sources visited:\n" + "\n".join(f"- {s}" for s in sources[:8])
        return summary

    elif tool_name == "draft_memo":
        company_name = tool_input.get("company_name", "")

        result = await db.execute(
            select(Company, FirmCompanyScore)
            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
            .where(FirmCompanyScore.user_id == user_id)
            .where(Company.name.ilike(f"%{company_name}%"))
            .limit(1)
        )
        row = result.first()
        if not row:
            return f"Could not find '{company_name}' in your pipeline."
        company, score = row[0], row[1]
        if not score.fit_reasoning:
            return f"{company.name} hasn't been researched yet. Run research first before drafting a memo."

        firm_result = await db.execute(
            select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
        )
        firm = firm_result.scalars().first()

        from app.api.routes.memo import generate_memo_for_startup
        memo = await generate_memo_for_startup(score, firm, db, company=company)

        if not memo:
            return f"Failed to generate memo for {company_name}."

        score.memo = memo
        score.memo_generated_at = datetime.utcnow()
        await db.commit()

        return f"Memo drafted for {company.name}. It's now available in the Memo tab of the company detail panel. Here's the executive summary:\n\n{memo[:500]}..."

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
        activity_context = await _build_activity_context(db, user_id)
        coverage_context = await _build_coverage_context(db, user_id)
        signals_context = await _build_signals_context(db, user_id)
        research_context = await _build_research_context(db, user_id)

        system_prompt = f"""You are Radar's AI Associate — a senior investment analyst embedded in a VC firm's deal flow platform.

You have full context about the firm's pipeline, past decisions, and investment thesis. You are direct, specific, and never generic. You cite actual company names, scores, and data from the pipeline. You think like a partner, not an intern.

{firm_context}

{pipeline_context}

{activity_context + chr(10) + chr(10) if activity_context else ""}{coverage_context + chr(10) + chr(10) if coverage_context else ""}{signals_context + chr(10) + chr(10) if signals_context else ""}{research_context + chr(10) + chr(10) if research_context else ""}{memory_context}

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
            "created_at": (m.created_at.isoformat() + "Z") if m.created_at else None,
        }
        for m in memories
    ]
