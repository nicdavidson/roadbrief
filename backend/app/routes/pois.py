from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
import re

from app.database import get_session
from app.dependencies import require_admin
from app.models import Stop, POI

router = APIRouter(prefix="/api/v1", tags=["POIs"])


def _sanitize_text(text, max_length=500):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


class POICreate(BaseModel):
    stop_id: int
    name: str
    lat: float
    lng: float
    poi_type: str = "waypoint"


class POIUpdate(BaseModel):
    name: str = None
    lat: float = None
    lng: float = None
    poi_type: str = None


@router.post("/stops/{stop_id}/pois", response_model=POI)
def create_poi(stop_id: int, body: POICreate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create a new POI for a stop. [admin]"""
    from app.models import Stop
    
    stop = session.get(Stop, stop_id)
    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found.")
    
    name = _sanitize_text(body.name, max_length=200)

    poi = POI(
        stop_id=stop_id, name=name, lat=body.lat, lng=body.lng,
        poi_type=body.poi_type,
    )
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.put("/stops/{stop_id}/pois/{poi_id}", response_model=POI)
def update_poi(stop_id: int, poi_id: int, body: POIUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update a POI. [admin]"""
    from app.models import Stop
    
    stop = session.get(Stop, stop_id)
    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found.")
    
    poi = session.get(POI, poi_id)
    if not poi or poi.stop_id != stop_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI not found.")
    
    if body.name is not None: poi.name = _sanitize_text(body.name, max_length=200)
    if body.lat is not None: poi.lat = body.lat
    if body.lng is not None: poi.lng = body.lng
    if body.poi_type is not None: poi.poi_type = body.poi_type
    
    session.add(poi)
    session.commit()
    session.refresh(poi)
    return poi


@router.delete("/stops/{stop_id}/pois/{poi_id}")
def delete_poi(stop_id: int, poi_id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Delete a POI. [admin]"""
    from app.models import Stop
    
    stop = session.get(Stop, stop_id)
    if not stop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found.")
    
    poi = session.get(POI, poi_id)
    if not poi or poi.stop_id != stop_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI not found.")
    session.delete(poi)
    session.commit()
    return {"ok": True}


@router.get("/pois/index")
def index_pois(session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Re-index all POIs for search. [admin]"""
    pois = session.query(POI).all()
    return {"ok": True, "pois_indexed": len(pois)}
