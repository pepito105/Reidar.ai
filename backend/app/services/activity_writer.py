import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.activity_event import ActivityEvent

logger = logging.getLogger(__name__)

PIPELINE_LABELS = {
    "watching": "Watching",
    "outreach": "Outreach",
    "diligence": "Diligence",
    "passed": "Passed",
    "invested": "Invested",
}


async def write_activity(
    db: AsyncSession,
    company_id,
    startup_name: str,
    event_type: str,
    title: str,
    detail: str = None,
    user_id: str = None,
) -> None:
    """Core writer — called by all specific event functions."""
    try:
        event = ActivityEvent(
            user_id=user_id,
            company_id=company_id,
            startup_name=startup_name,
            event_type=event_type,
            title=title,
            detail=detail,
            created_at=datetime.utcnow(),
        )
        db.add(event)
        await db.commit()
        logger.info(f"Activity written: {event_type} for {startup_name}")
    except Exception as e:
        logger.warning(f"Failed to write activity event for {startup_name}: {e}")


async def write_pipeline_moved(
    db: AsyncSession,
    company_id,
    startup_name: str,
    new_status: str,
    old_status: str = None,
    user_id: str = None,
    # legacy compat
    startup_id=None,
) -> None:
    """Called when a company moves to a new pipeline stage."""
    _id = company_id if company_id is not None else startup_id
    label = PIPELINE_LABELS.get(new_status, new_status.capitalize())
    is_first = not old_status or old_status == new_status
    event_type = "added_to_pipeline" if is_first else "pipeline_moved"
    title = f"Added to pipeline — {label}" if is_first else f"Moved to {label}"
    detail = f"Previous stage: {PIPELINE_LABELS.get(old_status, old_status)}" if old_status and not is_first else None
    await write_activity(db, _id, startup_name, event_type, title, detail, user_id)


async def write_conviction_set(
    db: AsyncSession,
    company_id,
    startup_name: str,
    conviction_score: int,
    user_id: str = None,
    startup_id=None,
) -> None:
    """Called when analyst sets or changes conviction score."""
    _id = company_id if company_id is not None else startup_id
    labels = {1: "Very Low", 2: "Low", 3: "Moderate", 4: "High", 5: "Very High"}
    label = labels.get(conviction_score, str(conviction_score))
    await write_activity(
        db, _id, startup_name,
        event_type="conviction_set",
        title=f"Conviction set to {conviction_score}/5 — {label}",
        user_id=user_id,
    )


async def write_notes_saved(
    db: AsyncSession,
    company_id,
    startup_name: str,
    notes_preview: str = None,
    user_id: str = None,
    startup_id=None,
) -> None:
    """Called when analyst saves notes."""
    _id = company_id if company_id is not None else startup_id
    await write_activity(
        db, _id, startup_name,
        event_type="notes_saved",
        title="Notes updated",
        detail=notes_preview[:200] if notes_preview else None,
        user_id=user_id,
    )


async def write_meeting_note_added(
    db: AsyncSession,
    company_id,
    startup_name: str,
    note_preview: str = None,
    user_id: str = None,
    startup_id=None,
) -> None:
    """Called when a meeting note is added."""
    _id = company_id if company_id is not None else startup_id
    await write_activity(
        db, _id, startup_name,
        event_type="meeting_note_added",
        title="Meeting note added",
        detail=note_preview[:200] if note_preview else None,
        user_id=user_id,
    )


async def write_research_complete(
    db: AsyncSession,
    company_id,
    startup_name: str,
    fit_score: int = None,
    user_id: str = None,
    startup_id=None,
) -> None:
    """Called when deep research finishes."""
    _id = company_id if company_id is not None else startup_id
    detail = f"Fit score: {fit_score}/5" if fit_score else None
    await write_activity(
        db, _id, startup_name,
        event_type="research_complete",
        title="Research completed — investment brief ready",
        detail=detail,
        user_id=user_id,
    )


async def write_signal_detected(
    db: AsyncSession,
    company_id,
    startup_name: str,
    signal_title: str,
    signal_type: str = None,
    user_id: str = None,
    startup_id=None,
) -> None:
    """Called when a new real signal is detected via Brave/Firecrawl."""
    _id = company_id if company_id is not None else startup_id
    type_labels = {
        "funding_round": "Funding round",
        "product_launch": "Product launch",
        "news_mention": "News mention",
        "headcount_growth": "Headcount growth",
        "leadership_change": "Leadership change",
        "traction_update": "Traction update",
    }
    type_label = type_labels.get(signal_type, "Signal")
    await write_activity(
        db, _id, startup_name,
        event_type="signal_detected",
        title=f"{type_label}: {signal_title}",
        user_id=user_id,
    )


async def get_company_activity(
    db: AsyncSession,
    company_id,
    user_id: str = None,
    limit: int = 50,
) -> list:
    """
    Retrieve activity timeline for a company.
    Used by CompanyDetail and the AI associate.
    """
    from sqlalchemy import select
    query = (
        select(ActivityEvent)
        .where(ActivityEvent.company_id == company_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(limit)
    )
    if user_id:
        query = query.where(ActivityEvent.user_id == user_id)
    result = await db.execute(query)
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "title": e.title,
            "detail": e.detail,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


async def get_last_activity_at(
    db: AsyncSession,
    company_id,
    user_id: str = None,
) -> datetime | None:
    """
    Get the timestamp of the most recent activity for a company.
    Used by pipeline list view and stale deal detection.
    """
    from sqlalchemy import select, func
    query = select(func.max(ActivityEvent.created_at)).where(
        ActivityEvent.company_id == company_id
    )
    if user_id:
        query = query.where(ActivityEvent.user_id == user_id)
    result = await db.execute(query)
    return result.scalar()
