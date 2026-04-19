from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7


def create_access_token(
    rider_id: int,
    role: str = "rider",
    auth_type: str = "anonymous",
) -> str:
    """Create a JWT access token."""
    exp = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(rider_id),
        "role": role,
        "auth_type": auth_type,
        "exp": exp,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Returns the payload dict or raises."""
    return jwt.decode(
        token, settings.JWT_SECRET, algorithms=[ALGORITHM]
    )
