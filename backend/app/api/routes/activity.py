import logging
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.activity_writer import get_company_activity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activity", tags=["activity"])


def _user_id_from_request(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["RS256", "HS256"]
            )
            return decoded.get("sub")
        except Exception:
            return None
    return None


EVENT_ICONS = {
    "pipeline_moved":     "🔄",
    "added_to_pipeline":  "➕",
    "conviction_set":     "🎯",
    "notes_saved":        "📝",
    "meeting_note_added": "💬",
    "research_complete":  "⚡",
    "signal_detected":    "📡",
}


@router.get("/{startup_id}")
async def get_activity(
    startup_id: int,
    request: Request,
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)
    events = await get_company_activity(
        db=db,
        startup_id=startup_id,
        user_id=user_id,
        limit=limit,
    )
    # Add icon to each event
    for e in events:
        e["icon"] = EVENT_ICONS.get(e["event_type"], "📋")
    return {"events": events, "count": len(events)}
