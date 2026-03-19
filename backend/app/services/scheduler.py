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



async def job_refresh_signals():
    logger.info('Scheduler: Starting nightly signal refresh')
    from app.services.refresh_service import refresh_company
    from app.services.notification_service import send_diligence_batch_alert
    async with AsyncSessionLocal() as db:
        try:
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "signal_refresh")

            profiles_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
            profiles = profiles_result.scalars().all()

            cutoff = datetime.utcnow() - timedelta(hours=23)
            total_refreshed = 0
            total_signals = 0

            for profile in profiles:
                user_id = profile.user_id
                firm_name = profile.firm_name or "your firm"
                thesis = profile.investment_thesis or ""
                notify_emails = profile.notification_emails
                should_notify_diligence = profile.notify_diligence_signal

                result = await db.execute(
                    select(Startup)
                    .where(Startup.user_id == user_id)
                    .where(Startup.pipeline_status.in_(["watching", "outreach", "diligence"]))
                    .where(
                        (Startup.last_refreshed_at == None) |
                        (Startup.last_refreshed_at < cutoff)
                    )
                    .order_by(Startup.fit_score.desc())
                )
                companies = result.scalars().all()
                refreshed = 0
                new_signals = 0
                diligence_alerts = []
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

                if diligence_alerts and should_notify_diligence:
                    await send_diligence_batch_alert(
                        alerts=diligence_alerts,
                        firm_name=firm_name,
                        thesis=thesis,
                        notification_emails=notify_emails,
                    )
                    logger.info(f'Diligence batch alert sent for {len(diligence_alerts)} companies ({firm_name})')

                total_refreshed += refreshed
                total_signals += new_signals

            logger.info(f'Signal refresh complete: {total_refreshed} companies, {total_signals} signals')
            await complete_job_run(db, run.id, stats={"total_refreshed": total_refreshed, "total_signals": total_signals, "firms_processed": len(profiles)}, firm_count=len(profiles))
        except Exception as e:
            logger.error(f'Signal refresh failed: {e}', exc_info=True)
            try:
                await fail_job_run(db, run.id, error=str(e), job_name="signal_refresh")
            except Exception:
                pass


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
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "weekly_summary")
            firms_notified = 0

            profiles_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True))
            profiles = profiles_result.scalars().all()

            week_cutoff = datetime.utcnow() - timedelta(days=7)
            STALE_THRESHOLDS = {"watching": 14, "outreach": 21, "diligence": 30}

            for profile in profiles:
                user_id = profile.user_id
                firm_name = profile.firm_name or "your firm"
                thesis = profile.investment_thesis or ""
                notify_emails = profile.notification_emails
                should_notify = profile.notify_weekly_summary
                if not should_notify:
                    logger.info(f'Weekly summary disabled for {firm_name} — skipping')
                    continue

                new_result = await db.execute(
                    select(Startup)
                    .where(Startup.user_id == user_id)
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

                pipeline_result = await db.execute(
                    select(Startup)
                    .where(Startup.user_id == user_id)
                    .where(Startup.pipeline_status.in_(["watching", "outreach", "diligence", "passed", "invested"]))
                )
                pipeline_companies = pipeline_result.scalars().all()
                pipeline_summary = {}
                for s in pipeline_companies:
                    stage = s.pipeline_status
                    if stage not in pipeline_summary:
                        pipeline_summary[stage] = []
                    pipeline_summary[stage].append({"name": s.name})

                stale_deals = []
                for s in pipeline_companies:
                    if s.pipeline_status in ("passed", "invested"):
                        continue
                    threshold_days = STALE_THRESHOLDS.get(s.pipeline_status)
                    if not threshold_days:
                        continue
                    last = _last_activity_at(s)
                    if last and last.tzinfo:
                        last = last.replace(tzinfo=None)
                    cutoff = datetime.utcnow() - timedelta(days=threshold_days)
                    is_stale = (last is None) or (last < cutoff)
                    if not is_stale:
                        continue
                    days_stale = (datetime.utcnow() - last).days if last else threshold_days + 1
                    stale_deals.append({
                        "name": s.name,
                        "pipeline_status": s.pipeline_status,
                        "one_liner": s.one_liner,
                        "days_stale": days_stale,
                    })

                await send_weekly_summary(
                    new_companies=new_companies,
                    pipeline_summary=pipeline_summary,
                    stale_deals=stale_deals,
                    firm_name=firm_name,
                    thesis=thesis,
                    notification_emails=notify_emails,
                )
                logger.info(f'Weekly summary sent for {firm_name}')
                firms_notified += 1

            await complete_job_run(db, run.id, stats={"firms_notified": firms_notified}, firm_count=len(profiles))
        except Exception as e:
            logger.error(f'Weekly summary failed: {e}', exc_info=True)
            try:
                await fail_job_run(db, run.id, error=str(e), job_name="weekly_summary")
            except Exception:
                pass


async def job_run_research():
    logger.info('Scheduler: Starting autonomous research batch')
    from app.services.research_service import run_research_batch
    async with AsyncSessionLocal() as db:
        try:
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "research_batch")

            stats = await run_research_batch(db, limit=50)
            logger.info(f'Research batch complete: {stats}')
            await complete_job_run(db, run.id, stats={"result": str(stats)})
        except Exception as e:
            logger.error(f'Research batch failed: {e}', exc_info=True)
            try:
                await fail_job_run(db, run.id, error=str(e), job_name="research_batch")
            except Exception:
                pass


async def job_run_sourcing():
    logger.info('Scheduler: Starting nightly autonomous sourcing (deep mode)')
    from app.services.sourcing_service import run_autonomous_sourcing
    from app.services.research_service import run_research_batch
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        run = None
        try:
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "autonomous_sourcing")

            profiles_result = await db.execute(
                select(FirmProfile).where(FirmProfile.is_active == True)
            )
            profiles = profiles_result.scalars().all()
            if not profiles:
                logger.info('No active firm profiles — skipping nightly sourcing')
                await complete_job_run(db, run.id, stats={"firms_processed": 0}, firm_count=0)
                return
            for profile in profiles:
                firm_name = profile.firm_name or 'Unknown'
                user_id = profile.user_id
                thesis = profile.investment_thesis or ""
                logger.info(f'Nightly sourcing for: {firm_name}')

                run_started_at = datetime.utcnow()

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

                # Write stale deal notifications
                try:
                    from app.services.notification_writer import write_stale_deal_notifications
                    await write_stale_deal_notifications(db, user_id=user_id)
                    logger.info(f'Stale deal notifications written for {firm_name}')
                except Exception as e:
                    logger.error(f'Stale deal notifications failed for {firm_name}: {e}')

                # Step 4: Send top match email for new companies found in this run
                try:
                    from app.services.notification_service import send_sourcing_alert
                    if profile.notify_top_match and profile.notification_emails:
                        min_score = profile.notify_min_fit_score or 4
                        new_matches_result = await db.execute(
                            select(Startup)
                            .where(Startup.user_id == user_id)
                            .where(Startup.scraped_at >= run_started_at)
                            .where(Startup.fit_score >= min_score)
                            .order_by(Startup.fit_score.desc())
                        )
                        new_matches = new_matches_result.scalars().all()
                        if new_matches:
                            await send_sourcing_alert(
                                companies=[{
                                    "name": s.name,
                                    "one_liner": s.one_liner,
                                    "fit_score": s.fit_score,
                                    "sector": s.sector,
                                    "funding_stage": s.funding_stage,
                                } for s in new_matches],
                                firm_name=firm_name,
                                thesis=thesis,
                                notification_emails=profile.notification_emails,
                            )
                            logger.info(f'Sourcing alert sent for {len(new_matches)} companies ({firm_name})')
                        else:
                            logger.info(f'No new top matches from sourcing for {firm_name} — skipping alert')
                except Exception as e:
                    logger.error(f'Sourcing alert failed for {firm_name}: {e}')

            await complete_job_run(db, run.id, stats={"firms_processed": len(profiles)}, firm_count=len(profiles))
        except Exception as e:
            logger.error(f'Nightly sourcing job failed: {e}', exc_info=True)
            if run:
                try:
                    await fail_job_run(db, run.id, error=str(e), job_name="autonomous_sourcing")
                except Exception:
                    pass


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
        job_run_sourcing,
        CronTrigger(hour=4, minute=0, timezone='America/New_York'),
        id='autonomous_sourcing',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info('Scheduler started - signal refresh 3AM, deep sourcing 4AM ET, weekly summary Monday 8AM ET')
