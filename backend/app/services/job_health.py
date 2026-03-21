import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scheduler_run import SchedulerRun

logger = logging.getLogger(__name__)

async def start_job_run(db: AsyncSession, job_name: str, user_id: str = None) -> SchedulerRun:
    """Call at the start of every scheduler job."""
    run = SchedulerRun(
        job_name=job_name,
        started_at=datetime.utcnow(),
        status="running",
        user_id=user_id,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    logger.info(f"Job started: {job_name} (run_id={run.id})")
    return run

async def complete_job_run(
    db: AsyncSession,
    run_id,
    stats: dict = None,
    firm_count: int = None,
) -> None:
    """Call when a job completes successfully."""
    from sqlalchemy import select, update
    from app.models.scheduler_run import SchedulerRun
    await db.execute(
        update(SchedulerRun)
        .where(SchedulerRun.id == run_id)
        .values(
            status="success",
            completed_at=datetime.utcnow(),
            stats=stats or {},
            firm_count=firm_count,
        )
    )
    await db.commit()
    logger.info(f"Job completed: run_id={run_id} stats={stats}")

async def fail_job_run(
    db: AsyncSession,
    run_id,
    error: str = None,
    job_name: str = None,
) -> None:
    """Call when a job fails."""
    from sqlalchemy import update
    from app.models.scheduler_run import SchedulerRun
    await db.execute(
        update(SchedulerRun)
        .where(SchedulerRun.id == run_id)
        .values(
            status="failure",
            completed_at=datetime.utcnow(),
            error_message=error,
        )
    )
    await db.commit()
    logger.error(f"Job failed: run_id={run_id} error={error}")

    # Send admin alert on job failure
    try:
        from app.core.config import settings
        if settings.SENDGRID_API_KEY and settings.NOTIFICATION_EMAIL:
            import httpx
            subject = f"Radar: Scheduler job failed — {job_name or run_id}"
            html = f"""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="color:#ef4444;font-size:18px;font-weight:700;margin-bottom:12px;">
                ⚠️ Scheduler Job Failed
              </div>
              <div style="background:#0f0f1a;border:1px solid #2a2a4a;border-left:4px solid #ef4444;
                          border-radius:8px;padding:16px;margin-bottom:16px;">
                <div style="color:#f0f0ff;font-size:14px;font-weight:600;margin-bottom:6px;">
                  {job_name or run_id}
                </div>
                <div style="color:#8888aa;font-size:13px;margin-bottom:8px;">
                  Failed at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
                </div>
                {f'<div style="color:#ef4444;font-size:12px;font-family:monospace;word-break:break-all;">{error}</div>' if error else ''}
              </div>
              <div style="color:#555577;font-size:12px;">
                Check Railway logs for full traceback.
              </div>
            </div>
            """
            recipients = [r.strip() for r in settings.NOTIFICATION_EMAIL.split(',') if r.strip()]
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "personalizations": [{"to": [{"email": r} for r in recipients]}],
                        "from": {"email": settings.FROM_EMAIL},
                        "subject": subject,
                        "content": [{"type": "text/html", "value": html}],
                    },
                    timeout=10.0,
                )
            logger.info(f"Admin failure alert sent for {job_name or run_id}")
    except Exception as alert_err:
        logger.warning(f"Failed to send admin failure alert: {alert_err}")
