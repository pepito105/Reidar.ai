import os
import httpx
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str | None:
    if not credentials:
        return None
    token = credentials.credentials
    clerk_secret = os.getenv("CLERK_SECRET_KEY", "")
    if not clerk_secret:
        return None
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://api.clerk.com/v1/tokens/verify",
                headers={"Authorization": f"Bearer {clerk_secret}"},
                params={"token": token}
            )
            if res.status_code == 200:
                data = res.json()
                return data.get("sub") or data.get("user_id")
    except Exception:
        pass
    return None

async def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    user_id = await get_current_user_id(request, credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
