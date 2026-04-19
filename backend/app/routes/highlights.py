from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session
import re

from app.database import get_session
from app.dependencies import require_admin
from app.models import Highlight

router = APIRouter(prefix="/api/v1", tags=["Highlights"])


def _sanitize_text(text, max_length=5000):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


class HighlightCreate(BaseModel):
    ride_id: int
    day_id: int = None
    leg_id: int = None
    stop_id: int = None
    title: str
    body: str  # markdown
    category: str  # scenic | warning | cost | tip | info
    sort_order: int = 0


class HighlightUpdate(BaseModel):
    day_id: int = None
    leg_id: int = None
    stop_id: int = None
    title: str = None
    body: str = None
    category: str = None
    sort_order: int = None


@router.post("/highlights", response_model=Highlight)
def create_highlight(body: HighlightCreate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Create a new highlight. [admin]"""
    title = _sanitize_text(body.title, max_length=200)
    body_text = _sanitize_text(body.body, max_length=10000)

    highlight = Highlight(
        ride_id=body.ride_id,
        day_id=body.day_id,
        leg_id=body.leg_id,
        stop_id=body.stop_id,
        title=title,
        body=body_text,
        category=body.category,
        sort_order=body.sort_order,
    )
    session.add(highlight)
    session.commit()
    session.refresh(highlight)
    return highlight


@router.put("/highlights/{highlight_id}", response_model=Highlight)
def update_highlight(highlight_id: int, body: HighlightUpdate, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Update a highlight. [admin]"""
    highlight = session.get(Highlight, highlight_id)
    if not highlight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Highlight not found.")

    if body.day_id is not None:
        highlight.day_id = body.day_id
    if body.leg_id is not None:
        highlight.leg_id = body.leg_id
    if body.stop_id is not None:
        highlight.stop_id = body.stop_id
    if body.title is not None:
        highlight.title = _sanitize_text(body.title, max_length=200)
    if body.body is not None:
        highlight.body = _sanitize_text(body.body, max_length=10000)
    if body.category is not None:
        highlight.category = body.category
    if body.sort_order is not None:
        highlight.sort_order = body.sort_order

    session.add(highlight)
    session.commit()
    session.refresh(highlight)
    return highlight


@router.delete("/highlights/{highlight_id}")
def delete_highlight(highlight_id: int, session: Session = Depends(get_session), rider=Depends(require_admin)):
    """Delete a highlight. [admin]"""
    highlight = session.get(Highlight, highlight_id)
    if not highlight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Highlight not found.")
    session.delete(highlight)
    session.commit()
    return {"ok": True}
