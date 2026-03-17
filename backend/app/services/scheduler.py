import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone='America/New_York')


async def job_run_scrapers():
    logger.info('Scheduler: Starting nightly scrape')
    from app.services.scraping_service import run_full_scrape
    from app.services.notification_service import send_new_top_match_alert
    async with AsyncSessionLocal() as db:
        try:
            stats = await run_full_scrape(db)
            logger.info(f'Nightly scrape complete: {stats}')

            # Get firm name for email
            profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
            profile = profile_result.scalar_one_or_none()
            firm_name = profile.firm_name if profile else "your firm"
            notify_emails = profile.notification_emails if profile else None
            min_score = profile.notify_min_fit_score if profile else 4
            should_notify = profile.notify_top_match if profile else True

            # Find new top matches from this scrape (last 2 hours)
            from datetime import timezone
            cutoff = datetime.utcnow() - timedelta(hours=2)
            new_result = await db.execute(
                select(Startup)
                .where(Startup.scraped_at >= cutoff)
                .where(Startup.fit_score >= min_score)
                .order_by(Startup.fit_score.desc())
            )
            new_top = new_result.scalars().all()

            if new_top and should_notify:
                logger.info(f'Sending top match alert for {len(new_top)} companies')
                companies = [
                    {
                        "name": s.name,
                        "fit_score": s.fit_score,
                        "one_liner": s.one_liner,
                        "funding_stage": s.funding_stage,
                        "sector": s.sector,
                    }
                    for s in new_top
                ]
                await send_new_top_match_alert(companies, firm_name, notification_emails=notify_emails)
            else:
                logger.info('No new top matches from this scrape — skipping alert')

        except Exception as e:
            logger.error(f'Nightly scrape failed: {e}', exc_info=True)


async def job_refresh_signals():
    logger.info('Scheduler: Starting nightly signal refresh')
    from app.services.refresh_service import refresh_company
    from app.services.notification_service import send_diligence_signal_alert, send_diligence_batch_alert
    async with AsyncSessionLocal() as db:
        try:
            # Get firm name
            profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
            profile = profile_result.scalar_one_or_none()
            firm_name = profile.firm_name if profile else "your firm"
            notify_emails = profile.notification_emails if profile else None
            should_notify_diligence = profile.notify_diligence_signal if profile else True

            cutoff = datetime.utcnow() - timedelta(hours=23)
            result = await db.execute(
                select(Startup)
                .where(Startup.fit_score >= 3)
                .where(
                    (Startup.last_refreshed_at == None) |
                    (Startup.last_refreshed_at < cutoff)
                )
                .order_by(Startup.fit_score.desc())
                .limit(30)
            )
            companies = result.scalars().all()
            refreshed = 0
            new_signals = 0
            diligence_alerts = []  # Collect all diligence signals to batch
            for company in companies:
                try:
                    sigs = await refresh_company(company, db)
                    new_signals += len(sigs)
                    refreshed += 1

                    if sigs and company.pipeline_status == 'diligence' and should_notify_diligence:
                        signals_data = [
                            {
                                "signal_type": s.signal_type,
                                "title": s.title,
                                "summary": s.summary,
                            }
                            for s in sigs
                        ]
                        diligence_alerts.append({
                            "company_name": company.name,
                            "signals": signals_data,
                            "fit_score": company.fit_score or 3,
                        })

                except Exception as e:
                    logger.error(f'Refresh failed for {company.name}: {e}')

            # Send one combined diligence alert for all companies
            if diligence_alerts and should_notify_diligence:
                await send_diligence_batch_alert(
                    alerts=diligence_alerts,
                    firm_name=firm_name,
                    notification_emails=notify_emails,
                )
                logger.info(f'Diligence batch alert sent for {len(diligence_alerts)} companies')

            logger.info(f'Signal refresh complete: {refreshed} companies, {new_signals} signals')
        except Exception as e:
            logger.error(f'Signal refresh failed: {e}', exc_info=True)


def _last_activity_at(startup: Startup) -> Optional[datetime]:
    log = startup.activity_log or []
    if not log:
        return None
    dates = []
    for entry in log:
        if isinstance(entry, dict) and entry.get("created_at"):
            try:
                dates.append(datetime.fromisoformat(entry["created_at"].replace("Z", "+00:00")))
            except Exception:
                pass
    return max(dates) if dates else None


async def job_weekly_summary():
    logger.info('Scheduler: Sending weekly summary')
    from app.services.notification_service import send_weekly_summary
    from app.models.signal import CompanySignal
    async with AsyncSessionLocal() as db:
        try:
            profile_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
            profile = profile_result.scalar_one_or_none()
            firm_name = profile.firm_name if profile else "your firm"
            notify_emails = profile.notification_emails if profile else None
            should_notify = profile.notify_weekly_summary if profile else True
            if not should_notify:
                logger.info('Weekly summary disabled — skipping')
                return

            # New companies this week (fit >= 4)
            week_cutoff = datetime.utcnow() - timedelta(days=7)
            new_result = await db.execute(
                select(Startup)
                .where(Startup.scraped_at >= week_cutoff)
                .where(Startup.fit_score >= 4)
                .order_by(Startup.fit_score.desc())
                .limit(20)
            )
            new_companies = [
                {
                    "name": s.name,
                    "fit_score": s.fit_score,
                    "one_liner": s.one_liner,
                    "funding_stage": s.funding_stage,
                    "sector": s.sector,
                }
                for s in new_result.scalars().all()
            ]

            # Pipeline snapshot
            pipeline_result = await db.execute(select(Startup).where(
                Startup.pipeline_status.in_(["watching", "outreach", "diligence", "passed", "invested"])
            ))
            pipeline_companies = pipeline_result.scalars().all()
            pipeline_summary = {}
            for s in pipeline_companies:
                stage = s.pipeline_status
                if stage not in pipeline_summary:
                    pipeline_summary[stage] = []
                pipeline_summary[stage].append({"name": s.name})

            # Stale deals (no activity in 7+ days, in active stages)
            stale_cutoff = datetime.utcnow() - timedelta(days=7)
            stale_deals = []
            for s in pipeline_companies:
                if s.pipeline_status in ("passed", "invested"):
                    continue
                last = _last_activity_at(s)
                if last and last.tzinfo:
                    last = last.replace(tzinfo=None)
                if last is None or last < stale_cutoff:
                    stale_deals.append({
                        "name": s.name,
                        "pipeline_status": s.pipeline_status,
                        "one_liner": s.one_liner,
                    })

            await send_weekly_summary(new_companies, pipeline_summary, stale_deals, firm_name, notification_emails=notify_emails)
            logger.info('Weekly summary sent')
        except Exception as e:
            logger.error(f'Weekly summary failed: {e}', exc_info=True)


async def job_run_research():
    logger.info('Scheduler: Starting autonomous research batch')
    from app.services.research_service import run_research_batch
    async with AsyncSessionLocal() as db:
        try:
            stats = await run_research_batch(db, limit=50)
            logger.info(f'Research batch complete: {stats}')
        except Exception as e:
            logger.error(f'Research batch failed: {e}', exc_info=True)


async def job_run_sourcing():
    logger.info('Scheduler: Starting nightly autonomous sourcing (deep mode)')
    from app.services.sourcing_service import run_autonomous_sourcing
    from app.services.research_service import run_research_batch
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        try:
            profiles_result = await db.execute(
                select(FirmProfile).where(FirmProfile.is_active == True)
            )
            profiles = profiles_result.scalars().all()
            if not profiles:
                logger.info('No active firm profiles — skipping nightly sourcing')
                return
            for profile in profiles:
                firm_name = profile.firm_name or 'Unknown'
                user_id = profile.user_id
                logger.info(f'Nightly sourcing for: {firm_name}')

                # Step 2: Deep autonomous sourcing — 8 queries instead of 3
                try:
                    stats = await run_autonomous_sourcing(db, user_id=user_id, nightly=True)
                    logger.info(f'Nightly sourcing complete for {firm_name}: {stats}')
                except Exception as e:
                    logger.error(f'Nightly sourcing failed for {firm_name}: {e}', exc_info=True)

                # Step 3: Auto-research top new matches (fit >= 4, no research yet)
                try:
                    research_stats = await run_research_batch(db, limit=20, user_id=user_id, min_fit_score=4)
                    logger.info(f'Auto-research complete for {firm_name}: {research_stats}')
                except Exception as e:
                    logger.error(f'Auto-research failed for {firm_name}: {e}')

        except Exception as e:
            logger.error(f'Nightly sourcing job failed: {e}', exc_info=True)


async def run_startup_check():
    """Startup check — logging only, no automatic scrapes."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(text('SELECT COUNT(*), MAX(scraped_at) FROM startups'))
        row = result.fetchone()
        count = row[0] or 0
        logger.info(f'Database: {count} companies at startup')


def start_scheduler():
    scheduler.add_job(
        job_refresh_signals,
        CronTrigger(hour=3, minute=0),
        id='nightly_refresh',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        job_weekly_summary,
        CronTrigger(day_of_week='mon', hour=8, minute=0),
        id='weekly_summary',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        job_run_research,
        CronTrigger(hour=3, minute=30, timezone='America/New_York'),
        id='research_batch',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        job_run_sourcing,
        CronTrigger(hour=4, minute=0, timezone='America/New_York'),
        id='autonomous_sourcing',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info('Scheduler started - signal refresh 3AM, deep sourcing 4AM, weekly summary Monday 8AM ET')
