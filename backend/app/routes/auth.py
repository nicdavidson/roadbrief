from typing import Optional
import time
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session

from app.auth import create_access_token
from app.database import get_session
from app.dependencies import get_client_ip, get_current_rider
from app.models import Rider

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


# ─── Rate limiting (in-memory, replace with Redis in production) ──────────────
_login_attempts = {}  # key: ip_address -> list of timestamps

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def _check_rate_limit(ip: str) -> None:
    """Check if IP has exceeded login attempts in the time window."""
    now = time.time()
    
    if ip not in _login_attempts:
        _login_attempts[ip] = []
    
    # Remove attempts outside the window
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < LOGIN_WINDOW_SECONDS]

    # Prune empty IP entries to prevent unbounded dict growth
    if not _login_attempts[ip]:
        del _login_attempts[ip]
        return

    if len(_login_attempts[ip]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )


def _record_login_attempt(ip: str) -> None:
    """Record a login attempt for rate limiting."""
    if ip not in _login_attempts:
        _login_attempts[ip] = []
    _login_attempts[ip].append(time.time())


def _sanitize_identifier(identifier: str) -> str:
    """Sanitize login identifier to prevent injection attacks."""
    sanitized = identifier.strip()[:255]
    return sanitized


def _sanitize_display_name(name: str) -> str:
    """Sanitize display name to prevent injection."""
    sanitized = re.sub(r'[\x00-\x1f]', '', name.strip())[:100]
    return sanitized


def _sanitize_email(email: Optional[str]) -> Optional[str]:
    """Sanitize email address."""
    if not email:
        return None
    sanitized = email.strip().lower()[:254]
    return sanitized


def _validate_password_strength(password: str) -> None:
    """Validate password meets minimum strength requirements."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long.",
        )


class RegisterRequest(BaseModel):
    display_name: str
    password: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str  # email or display_name
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rider_id: int
    auth_type: str
    role: str
    warning: Optional[str] = None


@router.post("/register", response_model=TokenResponse)
def register(request: Request, body: RegisterRequest, session: Session = Depends(get_session)):
    """Register a new rider.

    - No password -> Tier 2 (local, auth_type="local")
    - Password without email -> Tier 3 (account, auth_type="account") with warning
    - Password + email -> full Tier 3 account
    """
    # Rate limiting on registration
    ip = get_client_ip(request)
    _check_rate_limit(ip)

    # Sanitize inputs
    display_name = _sanitize_display_name(body.display_name)
    email = _sanitize_email(body.email)

    # Validate password strength if provided
    if body.password:
        _validate_password_strength(body.password)

    # Check for existing rider with same display_name
    existing = (
        session.query(Rider)
        .where(Rider.display_name == display_name)
        .where(Rider.org_id == 1)  # default org
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Display name already taken.",
        )

    password_hash = None
    auth_type = "local"
    if body.password:
        password_hash = _hash_password(body.password)
        auth_type = "account"

    rider = Rider(
        org_id=1,
        display_name=display_name,
        email=email,
        password_hash=password_hash,
        auth_type=auth_type,
        role="rider",
    )
    session.add(rider)
    session.commit()
    session.refresh(rider)

    token = create_access_token(
        rider_id=rider.id,
        role=rider.role,
        auth_type=rider.auth_type,
    )

    warning = None
    if rider.auth_type == "account" and not rider.email:
        warning = "No email provided -- you won't be able to reset your password."

    return TokenResponse(
        access_token=token,
        rider_id=rider.id,
        auth_type=rider.auth_type,
        role=rider.role,
        warning=warning,
    )


@router.post("/login", response_model=TokenResponse)
def login(request: Request, body: LoginRequest, session: Session = Depends(get_session)):
    """Log in a Tier 2 (local) or Tier 3 (account) rider.

    Local riders: identifier matches display_name, no password check.
    Account riders: require valid password.
    """
    # Rate limiting on login attempts
    ip = get_client_ip(request)
    _check_rate_limit(ip)

    # Sanitize inputs
    identifier = _sanitize_identifier(body.identifier)

    candidate = (
        session.query(Rider)
        .where(Rider.org_id == 1)
        .where(
            (Rider.email == identifier)
            | (Rider.display_name == identifier)
        )
        .first()
    )
    if candidate is None:
        _record_login_attempt(ip)  # Record failed attempt for rate limiting
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    if candidate.password_hash is not None:
        if not _verify_password(body.password, candidate.password_hash):
            _record_login_attempt(ip)  # Record failed attempt for rate limiting
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

    token = create_access_token(
        rider_id=candidate.id,
        role=candidate.role,
        auth_type=candidate.auth_type,
    )

    return TokenResponse(
        access_token=token,
        rider_id=candidate.id,
        auth_type=candidate.auth_type,
        role=candidate.role,
    )


# -- Password helpers ---------------------------------------------------------

from passlib.context import CryptContext

_password_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(plain: str) -> str:
    return _password_ctx.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return _password_ctx.verify(plain, hashed)
