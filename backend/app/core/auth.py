from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str | None:
    token = None
    if credentials:
        token = credentials.credentials
    else:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    try:
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
        return decoded.get("sub")
    except Exception:
        return None

async def require_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    user_id = await get_current_user_id(request, credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
