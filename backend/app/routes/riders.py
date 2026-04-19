from typing import List, Optional
import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from app.database import get_session
from app.dependencies import get_current_rider, require_admin
from app.models import Rider, RiderRead

router = APIRouter(prefix="/api/v1/riders", tags=["Riders"])


def _sanitize_text(text, max_length=200):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


class RiderUpdate(BaseModel):
    display_name: str = None
    email: str = None


@router.get("/me", response_model=RiderRead)
def get_me(session: Session = Depends(get_session), rider=Depends(get_current_rider)):
    """Get current rider profile. [authenticated]"""
    return rider


@router.put("/me", response_model=RiderRead)
def update_me(body: RiderUpdate, session: Session = Depends(get_session), rider=Depends(get_current_rider)):
    """Update current rider profile. [authenticated]"""
    if body.display_name is not None:
        rider.display_name = _sanitize_text(body.display_name, max_length=100)
    if body.email is not None:
        rider.email = _sanitize_text(body.email, max_length=254).lower()
    
    session.add(rider)
    session.commit()
    session.refresh(rider)
    return rider


@router.get("/", response_model=List[RiderRead])
def list_riders(session: Session = Depends(get_session), rider=Depends(require_admin)):
    """List all riders. [admin]"""
    return session.query(Rider).where(Rider.org_id == rider.org_id).all()


@router.put("/{rider_id}", response_model=RiderRead)
def update_rider(rider_id: int, body: RiderUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update a rider. [admin]"""
    target = session.get(Rider, rider_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found.")
    
    if body.display_name is not None:
        target.display_name = _sanitize_text(body.display_name, max_length=100)
    if body.email is not None:
        target.email = _sanitize_text(body.email, max_length=254).lower()
    
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


# -- Password helpers ---------------------------------------------------------

from passlib.context import CryptContext

_password_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(plain: str) -> str:
    return _password_ctx.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    return _password_ctx.verify(plain, hashed)


@router.put("/{rider_id}/set-password", response_model=RiderRead)
def set_password(rider_id: int, body: dict = None, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Set a rider's password. [admin]"""
    if not body or "password" not in body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required.")
    
    password = body["password"]
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters.")
    
    target = session.get(Rider, rider_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rider not found.")
    
    target.password_hash = _hash_password(password)
    session.add(target)
    session.commit()
    session.refresh(target)
    return target
