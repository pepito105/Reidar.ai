import logging
from fastapi import APIRouter, BackgroundTasks, Request

router = APIRouter(prefix="/sourcing", tags=["sourcing"])
logger = logging.getLogger(__name__)

_sourcing_running = False


def _user_id_from_request(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            return decoded.get("sub")
        except Exception:
            return None
    return None


@router.post("/run")
async def trigger_manual_sourcing(background_tasks: BackgroundTasks, request: Request):
    global _sourcing_running
    if _sourcing_running:
        return {"message": "Sourcing already running", "started": False}

    user_id = _user_id_from_request(request)

    async def run_sourcing():
        global _sourcing_running
        _sourcing_running = True
        try:
            logger.info("Manual sourcing triggered via API")
            from app.services.scheduler import job_run_sourcing
            await job_run_sourcing(user_id=user_id)
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
