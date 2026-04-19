# RoadBrief — Data Model

Use SQLModel (combines SQLAlchemy ORM + Pydantic validation). PostgreSQL with PostGIS for spatial queries.

## Models

### Organization
Multi-tenant root. Each ride org gets one.
```python
class Organization(SQLModel, table=True):
    id: int  # primary key
    name: str  # "Eastern Montana Bible Camp"
    slug: str  # "embc" — unique, used in URLs
    created_at: datetime
```

### Ride
A multi-day group ride event.
```python
class Ride(SQLModel, table=True):
    id: int
    org_id: int  # FK → Organization
    name: str  # "EMBC Ride 2026"
    description: str | None
    start_date: date
    end_date: date
    share_code: str  # unique, 8-char random for invite links
    status: str  # "draft" | "published" | "archived"
    created_by: int  # FK → Rider (admin)
    created_at: datetime
```

### Day
One riding day within a ride.
```python
class Day(SQLModel, table=True):
    id: int
    ride_id: int  # FK → Ride
    day_number: int  # 1, 2, 3...
    date: date
    title: str  # "Glendive to Hot Springs"
    notes: str | None  # general day notes
```

### Stop
A waypoint within a day. Ordered sequentially.
```python
class Stop(SQLModel, table=True):
    id: int
    day_id: int  # FK → Day
    name: str  # "Hulett, WY"
    lat: float
    lng: float
    stop_type: str  # "start" | "gas" | "meal" | "overnight" | "waypoint" | "end"
    order_in_day: int  # 0, 1, 2...
    destination_mode: str  # "city_center" | "pinned"
    rally_point_lat: float | None  # specific meetup spot if pinned
    rally_point_lng: float | None
    rally_point_name: str | None  # "Cenex on Main St"
```

### Leg
A route segment between two consecutive stops. Generated after stops are set.
```python
class Leg(SQLModel, table=True):
    id: int
    day_id: int  # FK → Day
    start_stop_id: int  # FK → Stop
    end_stop_id: int  # FK → Stop
    route_geometry: str  # encoded polyline (Google format)
    distance_miles: float
    duration_minutes: int
    order_in_day: int
```

### POI
Point of interest near a stop. Auto-indexed or manually added.
```python
class POI(SQLModel, table=True):
    id: int
    stop_id: int  # FK → Stop
    name: str  # "Town Pump"
    address: str | None
    lat: float
    lng: float
    poi_type: str  # "gas" | "food" | "hotel" | "campground"
    hours: str | None  # freeform "6am-10pm"
    rating: float | None  # 0-5
    phone: str | None
    motorcycle_friendly: bool  # default False, admin or user can flag
    source: str  # "google" | "osm" | "manual"
    source_id: str | None  # external ID for dedup
```

### Highlight
Admin-authored note attached to a day, leg, or stop.
```python
class Highlight(SQLModel, table=True):
    id: int
    ride_id: int  # FK → Ride
    day_id: int | None  # FK → Day (if day-level)
    leg_id: int | None  # FK → Leg (if leg-level)
    stop_id: int | None  # FK → Stop (if stop-level)
    title: str  # "Needles Highway"
    body: str  # markdown content
    category: str  # "scenic" | "warning" | "cost" | "tip" | "info"
    sort_order: int  # for ordering within parent
```

### Rider
A participant. Three auth tiers.
```python
class Rider(SQLModel, table=True):
    id: int
    org_id: int  # FK → Organization
    display_name: str  # "Nic"
    email: str | None  # optional
    password_hash: str | None  # None for local-only riders
    profile_photo_url: str | None
    motorcycle: str | None  # freeform "2019 Indian Scout Bobber"
    emergency_contact: str | None  # admin-visible only
    auth_type: str  # "anonymous" | "local" | "account"
    role: str  # "admin" | "leader" | "rider"
    created_at: datetime
```

### RideRider
Join table — riders ↔ rides (many-to-many).
```python
class RideRider(SQLModel, table=True):
    ride_id: int  # FK → Ride
    rider_id: int  # FK → Rider
    group_name: str | None  # sub-group within the ride
```

### Photo
Geotagged image posted by a rider.
```python
class Photo(SQLModel, table=True):
    id: int
    ride_id: int  # FK → Ride
    rider_id: int | None  # FK → Rider
    image_url: str  # R2 URL
    lat: float | None
    lng: float | None
    caption: str | None
    nearest_stop_id: int | None  # FK → Stop
    taken_at: datetime | None  # from EXIF
    uploaded_at: datetime
    featured: bool  # default False, admin can pin
```

## Indexes
- `Stop`: compound index on (day_id, order_in_day)
- `Leg`: compound index on (day_id, order_in_day)
- `POI`: spatial index on (lat, lng), index on (stop_id, poi_type)
- `Photo`: index on (ride_id, nearest_stop_id)
- `Ride`: unique index on share_code
- `Organization`: unique index on slug

## Seed Data
The EMBC 2026 ride data is in `routes/embc-2026.md`. Use it to seed the database after models are created.
