from fastapi import Depends, HTTPException, Request
from sqlmodel import Session

from app.database import get_session
from app.models import Rider


def _get_ip(request: Request) -> str:
    """Extract client IP from request, respecting proxy headers."""
    # Check X-Forwarded-For header (for behind reverse proxy / fly.io)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    
    return "unknown"


def get_current_rider(request: Request = None, session: Session = Depends(get_session)) -> Rider:
    """Get the current authenticated rider from JWT token."""
    from fastapi import Header
    
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication scheme.",
        )

    from app.auth import decode_access_token
    
    try:
        payload = decode_access_token(parts[1])
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token.",
        )

    rider_id = payload.get("sub")
    if rider_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload.",
        )

    rider = session.get(Rider, int(rider_id))
    if rider is None:
        raise HTTPException(
            status_code=401,
            detail="User not found.",
        )

    return rider


def require_admin(rider: Rider = Depends(get_current_rider)) -> Rider:
    """Ensure the current rider is an admin."""
    if rider.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required.",
        )
    return rider


def require_owner_or_admin(rider: Rider, target_rider_id: int = None, session: Session = Depends(get_session)) -> Rider:
    """Ensure the current rider is the owner or an admin."""
    if rider.role == "admin":
        return rider
    
    # Check if this is a ride-level operation (owner check via context)
    raise HTTPException(
        status_code=403,
        detail="Insufficient permissions.",
    )


def get_client_ip(request: Request) -> str:
    """Get client IP for rate limiting."""
    return _get_ip(request)
