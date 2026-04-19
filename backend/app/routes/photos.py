"""Photo CRUD routes for rides."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlmodel import Session
from typing import Optional
import uuid
import os
import re
from pathlib import Path

from app.database import get_session
from app.models import Ride, Photo
from app.dependencies import get_current_rider

router = APIRouter(prefix="/api/v1", tags=["Photos"])

# Absolute uploads directory -- never relative
UPLOADS_DIR = Path(os.environ.get("ROADBRIEF_UPLOADS", "/data/roadbrief/uploads/photos"))
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(original_name: str) -> str:
    """Generate a safe filename -- UUID + validated extension."""
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
        ext = '.jpg'
    return f"{uuid.uuid4().hex}{ext}"


def _resolve_path(filename: str) -> Path:
    """Resolve the file path and ensure it stays within UPLOADS_DIR."""
    resolved = (UPLOADS_DIR / filename).resolve()
    if not str(resolved).startswith(str(UPLOADS_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename.")
    return resolved


def _validate_image_magic(data: bytes) -> None:
    """Validate image file by magic bytes, not Content-Type header."""
    if data[:3] == b'\xff\xd8\xff':
        return  # JPEG
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return  # PNG
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return  # WebP
    raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed.")


def _sanitize_text(text, max_length=500):
    """Sanitize text input."""
    if not text:
        return ""
    sanitized = re.sub(r'[\x00-\x1f]', '', text.strip())[:max_length]
    return sanitized


@router.get("/rides/{ride_id}/photos")
def list_photos(
    ride_id: int,
    session: Session = Depends(get_session),
):
    """List all photos for a ride. [public]"""
    ride = session.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    photos = (
        session.query(Photo)
        .filter(
            Photo.ride_id == ride_id,
        )
        .all()
    )

    return [
        {
            "id": p.id,
            "ride_id": p.ride_id,
            "rider_id": p.rider_id,
            "image_url": p.image_url,
            "caption": p.caption,
            "lat": p.lat,
            "lng": p.lng,
            "nearest_stop_id": p.nearest_stop_id,
            "taken_at": p.taken_at.isoformat() if p.taken_at else None,
            "uploaded_at": p.uploaded_at.isoformat(),
            "featured": p.featured,
        }
        for p in photos
    ]


@router.post("/rides/{ride_id}/photos")
async def upload_photo(
    ride_id: int,
    file: UploadFile = FastAPIFile(...),
    caption: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    nearest_stop_id: Optional[int] = None,
    session: Session = Depends(get_session),
    rider=Depends(get_current_rider),
):
    """Upload a photo for a ride. [admin]"""
    ride = session.get(Ride, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    # Read file contents (limit to 10MB + 1 byte to detect oversized files)
    contents = await file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")

    # Validate file type by magic bytes (not just Content-Type header)
    _validate_image_magic(contents)

    # Sanitize caption
    sanitized_caption = _sanitize_text(caption, max_length=500) if caption else None

    # Generate safe filename
    filename = _safe_filename(file.filename or "photo.jpg")
    file_path = _resolve_path(filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Store relative path for URL generation (e.g., "photos/abc123.jpg")
    relative_path = f"photos/{filename}"

    photo = Photo(
        ride_id=ride_id,
        rider_id=rider.id,
        image_url=relative_path,
        caption=sanitized_caption,
        lat=lat,
        lng=lng,
        nearest_stop_id=nearest_stop_id,
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    return {
        "id": photo.id,
        "ride_id": photo.ride_id,
        "rider_id": photo.rider_id,
        "image_url": photo.image_url,
        "caption": photo.caption,
        "lat": photo.lat,
        "lng": photo.lng,
        "nearest_stop_id": photo.nearest_stop_id,
    }


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, session: Session = Depends(get_session), rider=Depends(get_current_rider)):
    """Delete a photo. [owner/admin]"""
    from app.models import Photo
    
    photo = session.get(Photo, photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    # Only owner or admin can delete
    if photo.rider_id != rider.id and rider.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo.")

    # Delete file from disk (validate path stays within UPLOADS_DIR)
    try:
        filename = photo.image_url.replace("photos/", "")
        file_path = _resolve_path(filename)
        if file_path.exists():
            os.remove(file_path)
    except (OSError, HTTPException):
        pass  # File may have been deleted already or path invalid

    session.delete(photo)
    session.commit()
    return {"ok": True}
