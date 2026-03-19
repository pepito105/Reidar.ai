import logging
from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/sourcing", tags=["sourcing"])
logger = logging.getLogger(__name__)

_sourcing_running = False


@router.post("/run")
async def trigger_manual_sourcing(background_tasks: BackgroundTasks):
    global _sourcing_running
    if _sourcing_running:
        return {"message": "Sourcing already running", "started": False}

    async def run_sourcing():
        global _sourcing_running
        _sourcing_running = True
        try:
            logger.info("Manual sourcing triggered via API")
            from app.services.scheduler import job_run_sourcing
            await job_run_sourcing()
        except Exception as e:
            logger.error(f"Manual sourcing failed: {e}", exc_info=True)
        finally:
            _sourcing_running = False

    background_tasks.add_task(run_sourcing)
    return {
        "message": "Sourcing started — new companies will appear in Coverage as they are classified",
        "started": True,
    }


@router.get("/status")
async def sourcing_status():
    return {"is_running": _sourcing_running}
