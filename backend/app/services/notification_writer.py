import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from app.models.notification import Notification
from app.models.startup import Startup

logger = logging.getLogger(__name__)


async def write_new_company_notification(db, startup, user_id: str = None):
    """Called from classifier when a company scores 4 or 5."""
    if (startup.fit_score or 0) < 4:
        return
    event_type = "new_top_match" if startup.fit_score == 5 else "new_strong_fit"
    title = f"New {'top match' if startup.fit_score == 5 else 'strong fit'}: {startup.name}"
    body = startup.one_liner or ""
    notif = Notification(
        user_id=user_id,
        event_type=event_type,
        title=title,
        body=body,
        startup_id=startup.id,
        startup_name=startup.name,
        fit_score=startup.fit_score,
        metadata_={
            "funding_stage": startup.funding_stage,
            "sector": startup.sector,
        }
    )
    db.add(notif)
    await db.commit()
    logger.info(f"Notification written: {event_type} for {startup.name}")


async def write_research_complete_notification(db, startup, user_id: str = None):
    """Called when research_status becomes complete."""
    notif = Notification(
        user_id=user_id,
        event_type="research_complete",
        title=f"Research complete: {startup.name}",
        body=f"Full investment brief is ready for {startup.name}.",
        startup_id=startup.id,
        startup_name=startup.name,
        fit_score=startup.fit_score,
        metadata_={}
    )
    db.add(notif)
    await db.commit()
    logger.info(f"Notification written: research_complete for {startup.name}")


async def write_company_signal_notification(db, startup, signal, user_id: str = None):
    """Called from refresh service when a new CompanySignal is created."""
    notif = Notification(
        user_id=user_id,
        event_type="company_signal",
        title=signal.title,
        body=signal.summary,
        startup_id=startup.id,
        startup_name=startup.name,
        fit_score=startup.fit_score,
        metadata_={
            "signal_type": signal.signal_type,
            "pipeline_status": startup.pipeline_status,
        }
    )
    db.add(notif)
    await db.commit()


async def write_stale_deal_notifications(db, user_id: str = None):
    """
    Called nightly by scheduler. Writes stale_deal notifications
    using activity_events table for accurate last-activity detection.
    Stage-specific thresholds:
      - watching  > 14 days no activity
      - outreach  > 21 days no activity
      - diligence > 30 days no activity
    Does not write duplicate stale notifications within a 7-day window.
    """
    from sqlalchemy import func
    from app.models.activity_event import ActivityEvent

    THRESHOLDS = {
        "watching": 14,
        "outreach": 21,
        "diligence": 30,
    }

    if user_id:
        result = await db.execute(
            select(Startup)
            .where(Startup.pipeline_status.in_(list(THRESHOLDS.keys())))
            .where(Startup.user_id == user_id)
        )
    else:
        result = await db.execute(
            select(Startup).where(
                Startup.pipeline_status.in_(list(THRESHOLDS.keys()))
            )
        )
    companies = result.scalars().all()

    # Batch fetch last activity timestamps from activity_events
    startup_ids = [c.id for c in companies]
    last_activity_map = {}
    if startup_ids:
        activity_result = await db.execute(
            select(
                ActivityEvent.startup_id,
                func.max(ActivityEvent.created_at).label('last_at')
            )
            .where(ActivityEvent.startup_id.in_(startup_ids))
            .group_by(ActivityEvent.startup_id)
        )
        for row in activity_result.fetchall():
            last_activity_map[row.startup_id] = row.last_at

    for company in companies:
        threshold_days = THRESHOLDS.get(company.pipeline_status)
        if not threshold_days:
            continue

        last_activity = last_activity_map.get(company.id)
        cutoff = datetime.utcnow() - timedelta(days=threshold_days)
        is_stale = (last_activity is None) or (last_activity < cutoff)
        if not is_stale:
            continue

        # Don't write duplicate stale notifications within 7 days
        existing = await db.execute(
            select(Notification).where(
                Notification.startup_id == company.id,
                Notification.event_type == "stale_deal",
                Notification.created_at >= datetime.utcnow() - timedelta(days=7),
            )
        )
        if existing.scalar_one_or_none():
            continue

        days_stale = (datetime.utcnow() - last_activity).days \
            if last_activity else threshold_days + 1
        notif = Notification(
            user_id=user_id,
            event_type="stale_deal",
            title=f"{company.name} needs attention",
            body=f"In {company.pipeline_status.capitalize()} for "
                 f"{days_stale} days with no activity.",
            startup_id=company.id,
            startup_name=company.name,
            fit_score=company.fit_score,
            metadata_={
                "pipeline_status": company.pipeline_status,
                "days_stale": days_stale,
            }
        )
        db.add(notif)

    await db.commit()
    logger.info("Stale deal notifications written")
