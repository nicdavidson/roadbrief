from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_session
from app.dependencies import require_admin
from app.models import Day, Leg
from app.services.routing import generate_legs_for_day

router = APIRouter(prefix="/api/v1", tags=["Legs"])


@router.post("/days/{day_id}/generate-legs")
def generate_legs(day_id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Auto-generate legs between consecutive stops. [admin]"""
    from app.models import Day
    
    day = session.get(Day, day_id)
    if not day:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found.")

    legs = generate_legs_for_day(day_id, session)
    return {"ok": True, "legs_created": len(legs)}
