import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.scheduler_run import SchedulerRun

logger = logging.getLogger(__name__)

async def start_job_run(db: AsyncSession, job_name: str) -> SchedulerRun:
    """Call at the start of every scheduler job."""
    run = SchedulerRun(
        job_name=job_name,
        started_at=datetime.utcnow(),
        status="running",
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
