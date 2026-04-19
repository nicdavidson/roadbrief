from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
import re

from app.database import get_session
from app.dependencies import require_admin
from app.models import Day, Highlight, Leg, Ride, Stop

router = APIRouter(prefix="/api/v1/rides/{ride_id}", tags=["Days"])


def _sanitize_text(text, max_length=1000):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


class DayCreate(BaseModel):
    day_number: int
    date: str
    title: str
    notes: Optional[str] = None


class DayUpdate(BaseModel):
    day_number: Optional[int] = None
    date: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None


@router.post("/days", response_model=Day)
def create_day(ride_id: int, body: DayCreate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create a new day for a ride. [admin]"""
    ride = session.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
    
    title = _sanitize_text(body.title, max_length=200)
    notes = _sanitize_text(body.notes, max_length=5000) if body.notes else None
    
    day = Day(ride_id=ride_id, day_number=body.day_number, date=body.date, title=title, notes=notes)
    session.add(day)
    session.commit()
    session.refresh(day)
    return day


@router.put("/days/{day_id}", response_model=Day)
def update_day(ride_id: int, day_id: int, body: DayUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update a day. [admin]"""
    day = session.get(Day, day_id)
    if not day or day.ride_id != ride_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")
    if body.day_number is not None: day.day_number = body.day_number
    if body.date is not None: day.date = body.date
    if body.title is not None: day.title = _sanitize_text(body.title, max_length=200)
    if body.notes is not None: day.notes = _sanitize_text(body.notes, max_length=5000)
    session.add(day)
    session.commit()
    session.refresh(day)
    return day


@router.delete("/days/{day_id}")
def delete_day(ride_id: int, day_id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Delete a day (cascades to stops, legs, highlights). [admin]"""
    day = session.get(Day, day_id)
    if not day or day.ride_id != ride_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")
    session.delete(day)
    session.commit()
    return {"ok": True}
