import time
import logging
from typing import Optional
from urllib.parse import urlencode

import jwt
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.gmail_connection import GmailConnection

logger = logging.getLogger(__name__)
router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SCOPES = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
]
STATE_SECRET = settings.GOOGLE_CLIENT_SECRET or "gmail-state-fallback-secret"


def _user_id_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            decoded = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["RS256", "HS256"],
            )
            return decoded.get("sub")
        except Exception:
            return None
    return None


def _make_state_jwt(user_id: str) -> str:
    payload = {"user_id": user_id, "iat": int(time.time())}
    return jwt.encode(payload, STATE_SECRET, algorithm="HS256")


def _decode_state_jwt(state: str) -> Optional[str]:
    try:
        data = jwt.decode(state, STATE_SECRET, algorithms=["HS256"])
        return data.get("user_id")
    except Exception:
        return None


def _redirect_uri() -> str:
    return f"{settings.BACKEND_URL}/api/gmail/callback"


@router.get("/gmail/auth-url")
async def gmail_auth_url(request: Request):
    """Authenticated endpoint — returns Google OAuth URL as JSON."""
    user_id = _user_id_from_request(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if not settings.GOOGLE_CLIENT_ID:
        return JSONResponse({"error": "Google OAuth not configured"}, status_code=503)

    state = _make_state_jwt(user_id)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {"url": url}


@router.get("/gmail/callback")
async def gmail_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """No-auth endpoint — Google redirects here after consent."""
    frontend_url = settings.FRONTEND_URL

    if error or not code or not state:
        logger.warning(f"Gmail callback error: {error}")
        return RedirectResponse(f"{frontend_url}/app?gmail_error=true")

    user_id = _decode_state_jwt(state)
    if not user_id:
        logger.warning("Gmail callback: invalid state JWT")
        return RedirectResponse(f"{frontend_url}/app?gmail_error=true")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            # Exchange code for tokens
            token_resp = await client.post(GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": _redirect_uri(),
                "grant_type": "authorization_code",
            })
            token_data = token_resp.json()

        if "access_token" not in token_data:
            logger.error(f"Gmail token exchange failed: {token_data}")
            return RedirectResponse(f"{frontend_url}/app?gmail_error=true")

        access_token = token_data["access_token"]
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        from datetime import datetime, timedelta
        token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)

        # Get Gmail address from userinfo
        async with httpx.AsyncClient() as client:
            info_resp = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info = info_resp.json()
        email = info.get("email", "")

        # Upsert GmailConnection
        existing = await db.execute(
            select(GmailConnection).where(GmailConnection.user_id == user_id)
        )
        conn = existing.scalars().first()
        if conn:
            conn.email = email
            conn.access_token = access_token
            if refresh_token:
                conn.refresh_token = refresh_token
            conn.token_expiry = token_expiry
            conn.is_active = True
        else:
            conn = GmailConnection(
                user_id=user_id,
                email=email,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expiry=token_expiry,
                is_active=True,
            )
            db.add(conn)

        await db.commit()
        logger.info(f"Gmail connected for user {user_id}: {email}")
        return RedirectResponse(f"{frontend_url}/app?gmail_connected=true")

    except Exception as e:
        logger.error(f"Gmail callback exception: {e}", exc_info=True)
        return RedirectResponse(f"{frontend_url}/app?gmail_error=true")


@router.get("/gmail/status")
async def gmail_status(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    result = await db.execute(
        select(GmailConnection)
        .where(GmailConnection.user_id == user_id)
        .where(GmailConnection.is_active == True)
    )
    conn = result.scalars().first()
    if not conn:
        return {"connected": False, "email": None, "last_checked_at": None}

    return {
        "connected": True,
        "email": conn.email,
        "last_checked_at": conn.last_checked_at.isoformat() + "Z" if conn.last_checked_at else None,
    }


@router.delete("/gmail/disconnect")
async def gmail_disconnect(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    result = await db.execute(
        select(GmailConnection).where(GmailConnection.user_id == user_id)
    )
    conn = result.scalars().first()
    if conn:
        conn.is_active = False
        await db.commit()

    return {"success": True}


@router.post("/gmail/process")
async def gmail_process(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    if not user_id:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    from app.services.gmail_service import process_new_emails
    result = await process_new_emails(user_id, db)
    return result
