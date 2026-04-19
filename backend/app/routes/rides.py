import secrets
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.dependencies import get_current_rider, require_admin
from app.models import (
    Day, DayRead, Highlight, HighlightRead, Leg, LegRead, POI, POIRead,
    Ride, RideRead, RideRider, Stop, StopRead,
)

router = APIRouter(prefix="/api/v1/rides", tags=["Rides"])


def _sanitize_text(text: str, max_length: int = 500) -> str:
    """Sanitize text input: strip, limit length, remove control characters."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


def _sanitize_name(name: str) -> str:
    """Sanitize ride name."""
    return _sanitize_text(name, max_length=200)


def _sanitize_description(description: Optional[str]) -> Optional[str]:
    """Sanitize ride description."""
    if description is None:
        return None
    return _sanitize_text(description, max_length=5000)


class RideCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: str  # ISO date
    end_date: str


class RideUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


def _build_ride_read(ride, session: Session) -> RideRead:
    """Build a full RideRead with nested data."""
    days = session.query(Day).where(Day.ride_id == ride.id).order_by(Day.day_number).all()
    day_records = []
    for day in days:
        stops = session.query(Stop).where(Stop.day_id == day.id).order_by(Stop.order_in_day).all()
        stop_records = []
        for stop in stops:
            pois = session.query(POI).where(POI.stop_id == stop.id).all()
            stop_records.append(StopRead(
                id=stop.id, day_id=stop.day_id, name=stop.name, lat=stop.lat, lng=stop.lng,
                stop_type=stop.stop_type, order_in_day=stop.order_in_day,
                destination_mode=stop.destination_mode,
                rally_point_lat=stop.rally_point_lat,
                rally_point_lng=stop.rally_point_lng,
                rally_point_name=stop.rally_point_name,
                pois=[POIRead(
                    id=p.id, stop_id=p.stop_id, name=p.name,
                    address=p.address, lat=p.lat, lng=p.lng,
                    poi_type=p.poi_type, hours=p.hours,
                    rating=p.rating, phone=p.phone,
                    motorcycle_friendly=p.motorcycle_friendly,
                    source=p.source, source_id=p.source_id,
                ) for p in pois],
            ))
        legs = session.query(Leg).where(Leg.day_id == day.id).order_by(Leg.order_in_day).all()
        leg_records = [LegRead(
            id=leg.id, day_id=leg.day_id, start_stop_id=leg.start_stop_id,
            end_stop_id=leg.end_stop_id, route_geometry=leg.route_geometry,
            distance_miles=leg.distance_miles,
            duration_minutes=leg.duration_minutes,
            order_in_day=leg.order_in_day,
        ) for leg in legs]

        highlights = session.query(Highlight).where(
            (Highlight.day_id == day.id) | (Highlight.ride_id == ride.id)
        ).order_by(Highlight.sort_order).all()
        day_records.append(DayRead(
            id=day.id, ride_id=day.ride_id, day_number=day.day_number,
            date=day.date, title=day.title, notes=day.notes,
            stops=stop_records, legs=leg_records,
            highlights=[HighlightRead(
                id=h.id, ride_id=h.ride_id, day_id=h.day_id,
                leg_id=h.leg_id, stop_id=h.stop_id,
                title=h.title, body=h.body,
                category=h.category, sort_order=h.sort_order,
            ) for h in highlights],
        ))

    return RideRead(
        id=ride.id, org_id=ride.org_id, name=ride.name,
        description=ride.description, start_date=ride.start_date,
        end_date=ride.end_date, share_code=ride.share_code,
        status=ride.status, created_by=ride.created_by,
        created_at=ride.created_at, days=day_records,
    )


@router.post("/", response_model=RideRead)
def create_ride(body: RideCreate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create a new ride. [admin]"""
    import datetime
    
    # Sanitize inputs
    name = _sanitize_name(body.name)
    description = _sanitize_description(body.description)

    ride = Ride(
        org_id=body.org_id,
        name=name,
        description=description,
        start_date=body.start_date,
        end_date=body.end_date,
        share_code=secrets.token_urlsafe(8),
        status="draft",
        created_by=rider.id,
    )
    session.add(ride)
    session.commit()
    session.refresh(ride)
    return _build_ride_read(ride, session)


@router.get("/{share_code}", response_model=RideRead)
def get_ride(share_code: str, session: Session = Depends(get_session)):
    """Get ride by share_code. [public]"""
    ride = session.query(Ride).where(Ride.share_code == share_code).first()
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
    return _build_ride_read(ride, session)


@router.put("/{id}", response_model=RideRead)
def update_ride(id: int, body: RideUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update ride metadata. [admin]"""
    ride = session.get(Ride, id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
    if body.name is not None:
        ride.name = _sanitize_name(body.name)
    if body.description is not None:
        ride.description = _sanitize_description(body.description)
    if body.start_date is not None:
        ride.start_date = body.start_date
    if body.end_date is not None:
        ride.end_date = body.end_date
    session.add(ride)
    session.commit()
    session.refresh(ride)
    return _build_ride_read(ride, session)


@router.post("/{id}/publish", response_model=RideRead)
def publish_ride(id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Publish a ride and generate share_code. [admin]"""
    ride = session.get(Ride, id)
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found.")
    ride.status = "published"
    if not ride.share_code:
        ride.share_code = secrets.token_urlsafe(8)
    session.add(ride)
    session.commit()
    session.refresh(ride)
    return _build_ride_read(ride, session)
