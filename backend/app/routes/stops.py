from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
import re

from app.database import get_session
from app.dependencies import require_admin
from app.models import Day, Stop

router = APIRouter(prefix="/api/v1", tags=["Stops"])


VALID_STOP_TYPES = {"start", "gas", "meal", "overnight", "waypoint", "end", "scenic"}


def _sanitize_text(text, max_length=500):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


def _validate_stop_type(stop_type: str) -> str:
    if stop_type not in VALID_STOP_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid stop_type. Must be one of: {', '.join(sorted(VALID_STOP_TYPES))}")
    return stop_type


class StopCreate(BaseModel):
    day_id: int
    name: str
    lat: float
    lng: float
    stop_type: str = "waypoint"
    order_in_day: int = 0


class BatchStopCreate(BaseModel):
    name: str
    lat: float
    lng: float
    stop_type: str = "waypoint"


class StopUpdate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    stop_type: Optional[str] = None
    order_in_day: Optional[int] = None


@router.post("/days/{day_id}/stops", response_model=Stop)
def create_stop(day_id: int, body: StopCreate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create a new stop for a day. [admin]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")
    
    name = _sanitize_text(body.name, max_length=200)
    _validate_stop_type(body.stop_type)

    stop = Stop(
        day_id=day_id, name=name, lat=body.lat, lng=body.lng,
        stop_type=body.stop_type, order_in_day=body.order_in_day,
    )
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop


@router.put("/days/{day_id}/stops/{stop_id}", response_model=Stop)
def update_stop(day_id: int, stop_id: int, body: StopUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update a stop. [admin]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")
    
    stop = session.get(Stop, stop_id)
    if not stop or stop.day_id != day_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found.")
    
    if body.name is not None: stop.name = _sanitize_text(body.name, max_length=200)
    if body.lat is not None: stop.lat = body.lat
    if body.lng is not None: stop.lng = body.lng
    if body.stop_type is not None:
        _validate_stop_type(body.stop_type)
        stop.stop_type = body.stop_type
    if body.order_in_day is not None: stop.order_in_day = body.order_in_day
    
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop


@router.delete("/days/{day_id}/stops/{stop_id}")
def delete_stop(day_id: int, stop_id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Delete a stop. [admin]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")
    
    stop = session.get(Stop, stop_id)
    if not stop or stop.day_id != day_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found.")
    session.delete(stop)
    session.commit()
    return {"ok": True}


@router.post("/days/{day_id}/batch-stops", response_model=list)
def batch_create_stops(day_id: int, body: List[BatchStopCreate], session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create multiple stops for a day. [admin]"""
    from app.models import Day

    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")

    if len(body) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum 50 stops per batch.")

    created = []
    for i, stop_data in enumerate(body):
        name = _sanitize_text(stop_data.name, max_length=200)
        _validate_stop_type(stop_data.stop_type)
        stop = Stop(
            day_id=day_id, name=name, lat=stop_data.lat,
            lng=stop_data.lng, stop_type=stop_data.stop_type,
            order_in_day=i,
        )
        session.add(stop)
        created.append(stop)

    session.commit()
    for s in created:
        session.refresh(s)

    return created
