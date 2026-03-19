import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from app.models.notification import Notification
from app.models.firm_company_score import FirmCompanyScore

logger = logging.getLogger(__name__)


async def write_new_company_notification(db, score, user_id: str = None, company_name: str = None):
    """Called from classifier when a company scores 4 or 5. score is FirmCompanyScore."""
    if (score.fit_score or 0) < 4:
        return
    event_type = "new_top_match" if score.fit_score == 5 else "new_strong_fit"
    if not company_name:
        company_name = "Unknown"
    title = f"New {'top match' if score.fit_score == 5 else 'strong fit'}: {company_name}"
    notif = Notification(
        user_id=user_id,
        event_type=event_type,
        title=title,
        body="",
        company_id=score.company_id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={}
    )
    db.add(notif)
    await db.commit()
    logger.info(f"Notification written: {event_type} for {company_name}")


async def write_research_complete_notification(db, score, user_id: str = None, company_name: str = None):
    """Called when research_status becomes complete. score is FirmCompanyScore."""
    if not company_name:
        company_name = "Unknown"
    notif = Notification(
        user_id=user_id,
        event_type="research_complete",
        title=f"Research complete: {company_name}",
        body=f"Full investment brief is ready for {company_name}.",
        company_id=score.company_id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={}
    )
    db.add(notif)
    await db.commit()
    logger.info(f"Notification written: research_complete for {company_name}")


async def write_company_signal_notification(db, score, signal, user_id: str = None, company_name: str = None):
    """Called from refresh service when a new CompanySignal is created.
    score is FirmCompanyScore, signal is CompanySignal."""
    if not company_name:
        company_name = "Unknown"
    notif = Notification(
        user_id=user_id or score.user_id,
        event_type="company_signal",
        title=signal.title,
        body=signal.summary,
        company_id=score.company_id,
        startup_name=company_name,
        fit_score=score.fit_score,
        metadata_={
            "signal_type": signal.signal_type,
            "pipeline_status": score.pipeline_status,
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
    from app.models.company import Company

    THRESHOLDS = {
        "watching": 14,
        "outreach": 21,
        "diligence": 30,
    }

    query = (
        select(FirmCompanyScore, Company.name)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.pipeline_status.in_(list(THRESHOLDS.keys())))
    )
    if user_id:
        query = query.where(FirmCompanyScore.user_id == user_id)
    result = await db.execute(query)
    rows = result.fetchall()
    scores = [(row[0], row[1]) for row in rows]

    # Batch fetch last activity timestamps from activity_events
    company_ids = [s.company_id for s, _ in scores]
    last_activity_map = {}
    if company_ids:
        activity_result = await db.execute(
            select(
                ActivityEvent.company_id,
                func.max(ActivityEvent.created_at).label('last_at')
            )
            .where(ActivityEvent.company_id.in_(company_ids))
            .group_by(ActivityEvent.company_id)
        )
        for row in activity_result.fetchall():
            last_activity_map[row.company_id] = row.last_at

    for score, company_name in scores:
        threshold_days = THRESHOLDS.get(score.pipeline_status)
        if not threshold_days:
            continue

        last_activity = last_activity_map.get(score.company_id)
        cutoff = datetime.utcnow() - timedelta(days=threshold_days)
        is_stale = (last_activity is None) or (last_activity < cutoff)
        if not is_stale:
            continue

        # Don't write duplicate stale notifications within 7 days
        existing = await db.execute(
            select(Notification).where(
                Notification.company_id == score.company_id,
                Notification.event_type == "stale_deal",
                Notification.created_at >= datetime.utcnow() - timedelta(days=7),
            )
        )
        if existing.scalar_one_or_none():
            continue

        days_stale = (datetime.utcnow() - last_activity).days \
            if last_activity else threshold_days + 1
        notif = Notification(
            user_id=user_id or score.user_id,
            event_type="stale_deal",
            title=f"{company_name} needs attention",
            body=f"In {score.pipeline_status.capitalize()} for "
                 f"{days_stale} days with no activity.",
            company_id=score.company_id,
            startup_name=company_name,
            fit_score=score.fit_score,
            metadata_={
                "pipeline_status": score.pipeline_status,
                "days_stale": days_stale,
            }
        )
        db.add(notif)

    await db.commit()
    logger.info("Stale deal notifications written")
