"""
Scrape management routes.
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.services.scheduler import job_refresh_signals

router = APIRouter(prefix="/scrape", tags=["scrape"])
logger = logging.getLogger(__name__)

_scrape_running = False


@router.get("/status")
async def get_scrape_status(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(
        select(func.count(Company.id))
    )
    total_companies = total_result.scalar() or 0

    week_ago = datetime.utcnow() - timedelta(days=7)
    new_result = await db.execute(
        select(func.count(Company.id)).where(Company.scraped_at >= week_ago)
    )
    new_this_week = new_result.scalar() or 0

    last_result = await db.execute(
        text("SELECT MAX(scraped_at) FROM companies")
    )
    last_scraped = last_result.scalar()

    return {
        "is_running": _scrape_running,
        "total_companies": total_companies,
        "new_this_week": new_this_week,
        "last_scraped": (last_scraped.isoformat() + "Z") if last_scraped else None,
        "next_scheduled": "2:00 AM ET nightly",
    }


@router.post("/run")
async def trigger_manual_scrape(background_tasks: BackgroundTasks):
    global _scrape_running
    if _scrape_running:
        return {"message": "Scrape already running", "started": False}

    async def run_scrape():
        global _scrape_running
        _scrape_running = True
        try:
            logger.info("Manual signal refresh triggered from UI")
            await job_refresh_signals()
        except Exception as e:
            logger.error(f"Manual signal refresh failed: {e}")
        finally:
            _scrape_running = False

    background_tasks.add_task(run_scrape)
    return {"message": "Signal refresh started", "started": True}
