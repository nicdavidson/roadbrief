from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select
import re

from app.database import get_session
from app.models import Day, Leg, Stop
from app.services.export import generate_gpx, google_maps_url

router = APIRouter(prefix="/api/v1", tags=["Export"])


def _sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal."""
    # Remove dangerous characters, limit length
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', name.strip())[:50]
    return sanitized


@router.get("/legs/{leg_id}/export/gpx")
def export_leg_gpx(leg_id: int, session: Session = Depends(get_session)):
    """Download GPX for a single leg. [public]"""
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leg not found.")

    stops = session.query(Stop).where(
        (Stop.id == leg.start_stop_id) | (Stop.id == leg.end_stop_id)
    ).order_by(Stop.order_in_day).all()

    stops_data = [{"lat": s.lat, "lng": s.lng, "name": s.name, "stop_type": s.stop_type} for s in stops]
    legs_data = [{
        "route_geometry": leg.route_geometry,
        "distance_miles": leg.distance_miles,
    }]

    gpx = generate_gpx(legs_data, stops_data)
    safe_name = _sanitize_filename(f"leg-{leg_id}")
    return Response(content=gpx, media_type="application/gpx+xml",
                    headers={"Content-Disposition": f'attachment; filename="{safe_name}.gpx"'})


@router.get("/days/{day_id}/export/gpx")
def export_day_gpx(day_id: int, session: Session = Depends(get_session)):
    """Download GPX for all legs in a day. [public]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")

    stops = session.query(Stop).where(Stop.day_id == day_id).order_by(Stop.order_in_day).all()
    legs = session.query(Leg).where(Leg.day_id == day_id).order_by(Leg.order_in_day).all()

    if not legs:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No legs found for this day.")

    stops_data = [{"lat": s.lat, "lng": s.lng, "name": s.name, "stop_type": s.stop_type} for s in stops]
    legs_data = [{
        "route_geometry": leg.route_geometry,
        "distance_miles": leg.distance_miles,
    } for leg in legs]

    gpx = generate_gpx(legs_data, stops_data)
    safe_name = _sanitize_filename(f"day-{day_id}")
    return Response(content=gpx, media_type="application/gpx+xml",
                    headers={"Content-Disposition": f'attachment; filename="{safe_name}.gpx"'})


@router.get("/legs/{leg_id}/export/url")
def export_leg_url(leg_id: int, session: Session = Depends(get_session)):
    """Get Google Maps URL for a single leg. [public]"""
    leg = session.get(Leg, leg_id)
    if not leg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leg not found.")

    stops = session.query(Stop).where(
        (Stop.id == leg.start_stop_id) | (Stop.id == leg.end_stop_id)
    ).order_by(Stop.order_in_day).all()

    stops_data = [{"lat": s.lat, "lng": s.lng, "name": s.name} for s in stops]
    url = google_maps_url(stops_data)
    return {"url": url}


@router.get("/days/{day_id}/export/url")
def export_day_url(day_id: int, session: Session = Depends(get_session)):
    """Get Google Maps URL for a full day. [public]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")

    stops = session.query(Stop).where(Stop.day_id == day_id).order_by(Stop.order_in_day).all()

    stops_data = [{"lat": s.lat, "lng": s.lng, "name": s.name} for s in stops]
    url = google_maps_url(stops_data)
    return {"url": url}
