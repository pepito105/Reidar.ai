import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update, text

from app.core.database import AsyncSessionLocal
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.models.scheduler_run import SchedulerRun

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
                    select(FirmCompanyScore)
                    .where(FirmCompanyScore.user_id == user_id)
                    .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
                    .where(
                        (FirmCompanyScore.last_refreshed_at == None) |
                        (FirmCompanyScore.last_refreshed_at < cutoff)
                    )
                    .order_by(FirmCompanyScore.fit_score.desc())
                )
                scores = result.scalars().all()
                logger.info(f"Signal refresh: found {len(scores)} pipeline companies for {firm_name}")
                refreshed = 0
                new_signals = 0
                diligence_alerts = []
                for score in scores:
                    try:
                        sigs = await refresh_company(score, db)
                        new_signals += len(sigs)
                        refreshed += 1

                        if sigs and score.pipeline_status == 'diligence' and should_notify_diligence:
                            signals_data = [
                                {
                                    "signal_type": s.signal_type,
                                    "title": s.title,
                                    "summary": s.summary,
                                }
                                for s in sigs
                            ]
                            # Get company name for the alert
                            company_result = await db.execute(
                                select(Company.name).where(Company.id == score.company_id)
                            )
                            company_name = company_result.scalar() or "Unknown"
                            diligence_alerts.append({
                                "company_name": company_name,
                                "signals": signals_data,
                                "fit_score": score.fit_score or 3,
                            })

                    except Exception as e:
                        logger.error(f'Refresh failed for score {score.id}: {e}')

                if diligence_alerts and should_notify_diligence:
                    await send_diligence_batch_alert(
                        alerts=diligence_alerts,
                        firm_name=firm_name,
                        thesis=thesis,
                        notification_emails=notify_emails,
                    )
                    logger.info(f'Diligence batch alert sent for {len(diligence_alerts)} companies ({firm_name})')
                elif not diligence_alerts:
                    logger.info(f"Diligence alert skipped — no diligence companies with new signals ({firm_name})")
                elif not should_notify_diligence:
                    logger.info(f"Diligence alert skipped — notify_diligence_signal is disabled ({firm_name})")

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


async def job_weekly_summary():
    logger.info('Scheduler: Sending weekly summary')
    from app.services.notification_service import send_weekly_summary
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
                    select(Company, FirmCompanyScore)
                    .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                    .where(FirmCompanyScore.user_id == user_id)
                    .where(Company.scraped_at >= week_cutoff)
                    .where(FirmCompanyScore.fit_score >= 4)
                    .order_by(FirmCompanyScore.fit_score.desc())
                    .limit(20)
                )
                new_companies = [
                    {
                        "name": row[0].name,
                        "fit_score": row[1].fit_score,
                        "one_liner": row[0].one_liner,
                        "funding_stage": row[0].funding_stage,
                        "sector": row[0].sector,
                    }
                    for row in new_result.fetchall()
                ]

                pipeline_result = await db.execute(
                    select(Company, FirmCompanyScore)
                    .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                    .where(FirmCompanyScore.user_id == user_id)
                    .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence", "passed", "invested"]))
                )
                pipeline_rows = pipeline_result.fetchall()
                pipeline_summary = {}
                for row in pipeline_rows:
                    company, score = row[0], row[1]
                    stage = score.pipeline_status
                    if stage not in pipeline_summary:
                        pipeline_summary[stage] = []
                    pipeline_summary[stage].append({"name": company.name})

                stale_deals = []
                for row in pipeline_rows:
                    company, score = row[0], row[1]
                    if score.pipeline_status in ("passed", "invested"):
                        continue
                    threshold_days = STALE_THRESHOLDS.get(score.pipeline_status)
                    if not threshold_days:
                        continue
                    cutoff = datetime.utcnow() - timedelta(days=threshold_days)
                    # Use last_refreshed_at as a proxy for activity (activity_events would be more accurate)
                    last = score.last_refreshed_at
                    if last and hasattr(last, 'tzinfo') and last.tzinfo:
                        last = last.replace(tzinfo=None)
                    is_stale = (last is None) or (last < cutoff)
                    if not is_stale:
                        continue
                    days_stale = (datetime.utcnow() - last).days if last else threshold_days + 1
                    stale_deals.append({
                        "name": company.name,
                        "pipeline_status": score.pipeline_status,
                        "one_liner": company.one_liner,
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


async def job_run_sourcing(user_id: str = None):
    logger.info('Scheduler: Starting nightly autonomous sourcing (deep mode)')
    from app.services.sourcing_service import run_autonomous_sourcing
    from app.services.research_service import run_research_batch
    async with AsyncSessionLocal() as db:
        # ── Distributed lock: prevent double-firing across Railway instances ──
        stale_cutoff = datetime.utcnow() - timedelta(hours=2)
        existing_result = await db.execute(
            select(SchedulerRun)
            .where(SchedulerRun.job_name == "autonomous_sourcing")
            .where(SchedulerRun.status == "running")
            .order_by(SchedulerRun.started_at.desc())
            .limit(1)
        )
        existing_run = existing_result.scalars().first()
        if existing_run:
            if existing_run.started_at > stale_cutoff:
                logger.info("Job already running on another instance, skipping")
                return
            else:
                logger.warning(f"Clearing stale lock for autonomous_sourcing (run_id={existing_run.id}, started={existing_run.started_at})")
                await db.execute(
                    update(SchedulerRun)
                    .where(SchedulerRun.id == existing_run.id)
                    .values(status="failure", error_message="stale lock cleared", completed_at=datetime.utcnow())
                )
                await db.commit()
        # ─────────────────────────────────────────────────────────────────────

        run = None
        try:
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "autonomous_sourcing")

            profile_query = select(FirmProfile).where(FirmProfile.is_active == True)
            if user_id is not None:
                profile_query = profile_query.where(FirmProfile.user_id == user_id)
            profiles_result = await db.execute(profile_query)
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

                # Step 2: Deep autonomous sourcing
                try:
                    stats = await run_autonomous_sourcing(db, user_id=user_id, nightly=True)
                    logger.info(f'Nightly sourcing complete for {firm_name}: {stats}')
                except Exception as e:
                    logger.error(f'Nightly sourcing failed for {firm_name}: {e}', exc_info=True)

                # Step 3: Auto-research top new matches
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
                            select(Company, FirmCompanyScore)
                            .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
                            .where(FirmCompanyScore.user_id == user_id)
                            .where(Company.scraped_at >= run_started_at)
                            .where(FirmCompanyScore.fit_score >= min_score)
                            .order_by(FirmCompanyScore.fit_score.desc())
                        )
                        new_match_rows = new_matches_result.fetchall()
                        if new_match_rows:
                            await send_sourcing_alert(
                                companies=[{
                                    "name": row[0].name,
                                    "one_liner": row[0].one_liner,
                                    "fit_score": row[1].fit_score,
                                    "sector": row[0].sector,
                                    "funding_stage": row[0].funding_stage,
                                } for row in new_match_rows],
                                firm_name=firm_name,
                                thesis=thesis,
                                notification_emails=profile.notification_emails,
                            )
                            logger.info(f'Sourcing alert sent for {len(new_match_rows)} companies ({firm_name})')
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


async def job_process_gmail_emails():
    logger.info('Scheduler: Starting Gmail email processing')
    from app.models.gmail_connection import GmailConnection
    from app.services.gmail_service import process_new_emails
    async with AsyncSessionLocal() as db:
        try:
            from app.services.job_health import start_job_run, complete_job_run, fail_job_run
            run = await start_job_run(db, "gmail_polling")

            result = await db.execute(
                select(GmailConnection)
                .where(GmailConnection.is_active == True)
            )
            connections = result.scalars().all()
            logger.info(f'Gmail polling: {len(connections)} active connections')

            total_processed = 0
            for conn in connections:
                try:
                    result = await process_new_emails(conn.user_id, db)
                    count = result.get("processed", 0)
                    total_processed += count
                    logger.info(f'Gmail: processed {count} emails for user {conn.user_id}')
                except Exception as e:
                    logger.error(f'Gmail processing failed for {conn.user_id}: {e}')

            await complete_job_run(db, run.id, stats={"total_processed": total_processed, "connections": len(connections)})
        except Exception as e:
            logger.error(f'Gmail polling job failed: {e}', exc_info=True)
            try:
                await fail_job_run(db, run.id, error=str(e), job_name="gmail_polling")
            except Exception:
                pass


async def run_startup_check():
    """Startup check — logging only, no automatic scrapes."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(text('SELECT COUNT(*) FROM companies'))
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
    scheduler.add_job(
        job_process_gmail_emails,
        CronTrigger(minute="*/15"),
        id='gmail_polling',
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.start()
    logger.info('Scheduler started - signal refresh 3AM, deep sourcing 4AM ET, weekly summary Monday 8AM ET, Gmail polling every 15min')
