from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Column, ForeignKey, Integer, and_
from sqlalchemy.orm import Mapped, mapped_column
from sqlmodel import Field, Relationship, SQLModel


# ─── Base ──────────────────────────────────────────────────────────────────────
class ModelBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)


# ─── Organization ──────────────────────────────────────────────────────────────
class Organization(ModelBase, table=True):
    name: str
    slug: str = Field(unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    rides: List["Ride"] = Relationship(back_populates="organization")
    riders: List["Rider"] = Relationship(back_populates="organization")


# ─── Ride ──────────────────────────────────────────────────────────────────────
class Ride(ModelBase, table=True):
    org_id: int = Field(foreign_key="organization.id")
    name: str
    description: Optional[str] = None
    start_date: date
    end_date: date
    share_code: str = Field(unique=True)
    status: str = "draft"  # draft | published | archived
    created_by: int = Field(foreign_key="rider.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Organization = Relationship(back_populates="rides")
    days: List["Day"] = Relationship(back_populates="ride")
    highlights: List["Highlight"] = Relationship(back_populates="ride")
    ride_riders: List["RideRider"] = Relationship(back_populates="ride")
    photos: List["Photo"] = Relationship(back_populates="ride")


# ─── Day ───────────────────────────────────────────────────────────────────────
class Day(ModelBase, table=True):
    ride_id: int = Field(foreign_key="ride.id")
    day_number: int
    date: date
    title: str
    notes: Optional[str] = None

    ride: Ride = Relationship(back_populates="days")
    stops: List["Stop"] = Relationship(back_populates="day")
    legs: List["Leg"] = Relationship(back_populates="day")
    highlights: List["Highlight"] = Relationship(back_populates="day")


# ─── Stop ──────────────────────────────────────────────────────────────────────
class Stop(ModelBase, table=True):
    day_id: int = Field(foreign_key="day.id")
    name: str
    lat: float
    lng: float
    stop_type: str  # start | gas | meal | overnight | waypoint | end
    order_in_day: int
    destination_mode: str = "city_center"  # city_center | pinned
    rally_point_lat: Optional[float] = None
    rally_point_lng: Optional[float] = None
    rally_point_name: Optional[str] = None

    day: Day = Relationship(back_populates="stops")
    pois: List["POI"] = Relationship(back_populates="stop")
    highlights: List["Highlight"] = Relationship(back_populates="stop")
    photos: List["Photo"] = Relationship(back_populates="nearest_stop")
    start_legs: List["Leg"] = Relationship(
        back_populates="start_stop",
        sa_relationship_kwargs={"primaryjoin": "foreign(Leg.start_stop_id) == Stop.id"},
    )
    end_legs: List["Leg"] = Relationship(
        back_populates="end_stop",
        sa_relationship_kwargs={"primaryjoin": "foreign(Leg.end_stop_id) == Stop.id"},
    )


# ─── Leg ───────────────────────────────────────────────────────────────────────
class Leg(ModelBase, table=True):
    day_id: int = Field(foreign_key="day.id")
    start_stop_id: int = Field(foreign_key="stop.id")
    end_stop_id: int = Field(foreign_key="stop.id")
    route_geometry: str  # encoded polyline
    distance_miles: float
    duration_minutes: int
    order_in_day: int

    day: Day = Relationship(back_populates="legs")
    start_stop: Stop = Relationship(
        back_populates="start_legs",
        sa_relationship_kwargs={"primaryjoin": "foreign(Leg.start_stop_id) == Stop.id"},
    )
    end_stop: Stop = Relationship(
        back_populates="end_legs",
        sa_relationship_kwargs={"primaryjoin": "foreign(Leg.end_stop_id) == Stop.id"},
    )
    highlights: List["Highlight"] = Relationship(back_populates="leg")


# ─── POI ───────────────────────────────────────────────────────────────────────
class POI(ModelBase, table=True):
    stop_id: int = Field(foreign_key="stop.id")
    name: str
    address: Optional[str] = None
    lat: float
    lng: float
    poi_type: str  # gas | food | hotel | campground
    hours: Optional[str] = None
    rating: Optional[float] = None
    phone: Optional[str] = None
    motorcycle_friendly: bool = False
    source: str  # google | osm | manual
    source_id: Optional[str] = None

    stop: Stop = Relationship(back_populates="pois")


# ─── Highlight ─────────────────────────────────────────────────────────────────
class Highlight(ModelBase, table=True):
    ride_id: int = Field(foreign_key="ride.id")
    day_id: Optional[int] = Field(default=None, foreign_key="day.id")
    leg_id: Optional[int] = Field(default=None, foreign_key="leg.id")
    stop_id: Optional[int] = Field(default=None, foreign_key="stop.id")
    title: str
    body: str  # markdown
    category: str  # scenic | warning | cost | tip | info
    sort_order: int = 0

    ride: Ride = Relationship(back_populates="highlights")
    day: Optional[Day] = Relationship(back_populates="highlights")
    leg: Optional[Leg] = Relationship(back_populates="highlights")
    stop: Optional[Stop] = Relationship(back_populates="highlights")


# ─── Rider ─────────────────────────────────────────────────────────────────────
class Rider(ModelBase, table=True):
    org_id: int = Field(foreign_key="organization.id")
    display_name: str
    email: Optional[str] = None
    password_hash: Optional[str] = None  # None for local-only riders
    profile_photo_url: Optional[str] = None
    motorcycle: Optional[str] = None
    emergency_contact: Optional[str] = None
    auth_type: str = "anonymous"  # anonymous | local | account
    role: str = "rider"  # admin | leader | rider
    created_at: datetime = Field(default_factory=datetime.utcnow)

    organization: Organization = Relationship(back_populates="riders")
    ride_riders: List["RideRider"] = Relationship(back_populates="rider")
    photos: List["Photo"] = Relationship(back_populates="rider")


# ─── RideRider ─────────────────────────────────────────────────────────────────
# ─── RideRider (composite PK, no auto-id) ──────────────────────────────────────
class RideRider(SQLModel, table=True):
    ride_id: int = Field(primary_key=True, foreign_key="ride.id")
    rider_id: int = Field(primary_key=True, foreign_key="rider.id")
    group_name: Optional[str] = None

    ride: Ride = Relationship(back_populates="ride_riders")
    rider: Rider = Relationship(back_populates="ride_riders")


# ─── Photo ─────────────────────────────────────────────────────────────────────
class Photo(ModelBase, table=True):
    ride_id: int = Field(foreign_key="ride.id")
    rider_id: Optional[int] = Field(default=None, foreign_key="rider.id")
    image_url: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    caption: Optional[str] = None
    nearest_stop_id: Optional[int] = Field(default=None, foreign_key="stop.id")
    taken_at: Optional[datetime] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    featured: bool = False

    ride: Ride = Relationship(back_populates="photos")
    rider: Optional[Rider] = Relationship(back_populates="photos")
    nearest_stop: Optional[Stop] = Relationship(back_populates="photos")


# ─── Rider response (excludes sensitive fields) ──────────────────────────────
class RiderRead(SQLModel):
    id: int
    org_id: int
    display_name: str
    email: Optional[str] = None
    profile_photo_url: Optional[str] = None
    motorcycle: Optional[str] = None
    auth_type: str
    role: str
    created_at: datetime


# ─── Read/Response schemas (Pydantic-only, no table) ─────────────────────────

class RideRead(SQLModel):
    id: int
    org_id: int
    name: str
    description: Optional[str]
    start_date: date
    end_date: date
    share_code: str
    status: str
    created_by: int
    created_at: datetime
    days: List["DayRead"] = []


class DayRead(SQLModel):
    id: int
    ride_id: int
    day_number: int
    date: date
    title: str
    notes: Optional[str]
    stops: List["StopRead"] = []
    legs: List["LegRead"] = []
    highlights: List["HighlightRead"] = []


class StopRead(SQLModel):
    id: int
    day_id: int
    name: str
    lat: float
    lng: float
    stop_type: str
    order_in_day: int
    destination_mode: str
    rally_point_lat: Optional[float]
    rally_point_lng: Optional[float]
    rally_point_name: Optional[str]
    pois: List["POIRead"] = []


class LegRead(SQLModel):
    id: int
    day_id: int
    start_stop_id: int
    end_stop_id: int
    route_geometry: str
    distance_miles: float
    duration_minutes: int
    order_in_day: int


class POIRead(SQLModel):
    id: int
    stop_id: int
    name: str
    address: Optional[str]
    lat: float
    lng: float
    poi_type: str
    hours: Optional[str]
    rating: Optional[float]
    phone: Optional[str]
    motorcycle_friendly: bool
    source: str
    source_id: Optional[str]


class HighlightRead(SQLModel):
    id: int
    ride_id: int
    day_id: Optional[int]
    leg_id: Optional[int]
    stop_id: Optional[int]
    title: str
    body: str
    category: str
    sort_order: int
