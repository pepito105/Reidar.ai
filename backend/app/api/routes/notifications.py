import logging
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.core.database import get_db
from app.models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


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


ICONS = {
    "new_top_match":     "🎯",
    "new_strong_fit":    "✦",
    "research_complete": "⚡",
    "company_signal":    "📡",
    "stale_deal":        "⚠️",
}


def _serialize(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "event_type": n.event_type,
        "icon": ICONS.get(n.event_type, "📡"),
        "title": n.title,
        "body": n.body,
        "startup_id": str(n.company_id) if n.company_id else None,
        "startup_name": n.startup_name,
        "fit_score": n.fit_score,
        "is_seen": n.is_seen,
        "created_at": (n.created_at.isoformat() + "Z") if n.created_at else None,
        "metadata": n.metadata_ or {},
    }


@router.get("/feed")
async def get_notification_feed(
    request: Request,
    days: int = Query(30),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)
    cutoff = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(Notification)
        .where(Notification.created_at >= cutoff)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()

    unseen_result = await db.execute(
        select(func.count()).where(
            Notification.is_seen == False,
            Notification.created_at >= cutoff,
            Notification.user_id == user_id,
        )
    )
    unseen_count = unseen_result.scalar() or 0

    return {
        "feed": [_serialize(n) for n in notifications],
        "unseen_count": unseen_count,
    }


@router.post("/mark-all-seen")
async def mark_all_seen(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)
    await db.execute(
        update(Notification)
        .where(Notification.is_seen == False)
        .where(Notification.user_id == user_id)
        .values(is_seen=True)
    )
    await db.commit()
    return {"ok": True}


@router.post("/mark-seen/{notification_id}")
async def mark_seen(
    notification_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)
    try:
        notif_uuid = uuid.UUID(notification_id)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    await db.execute(
        update(Notification)
        .where(Notification.id == notif_uuid)
        .where(Notification.user_id == user_id)
        .values(is_seen=True)
    )
    await db.commit()
    return {"ok": True}
