import time
import urllib.request
import urllib.parse
import urllib.error
import json
import http.client

from sqlmodel import Session

from app.config import settings
from app.database import engine
from app.models import Ride, Day, Stop, Leg, POI, Highlight
from app.services.routing import generate_legs_for_day
from app.services.poi import index_pois_for_stop
from sqlalchemy import insert


def geocode(stop_name: str) -> tuple[float, float]:
    """Geocode a place name using Nominatim (OpenStreetMap)."""
    # Hardcoded fallbacks for places Nominatim struggles with
    # Keys are bare names; matching is done via substring check against full DB names
    fallbacks = {
        "Mule Creek Jct": (44.3692, -104.2856),  # WY-585 & US-85 junction
        "Old Hill City Rd": (43.7478, -103.4664),  # Old Hill City Road area
        "US-385/US-87 junction": (43.5898, -103.3311),  # Hot Springs area junction
        "US-87 south": (43.5500, -103.3500),  # Approximate on 87 south of Keystone
        "SD-385 south": (43.6800, -103.6200),  # Approximate on 385 south near Needles
        "SD-16A": (43.7800, -103.5100),  # Iron Mountain Rd scenic byway
    }
    for key, coords in fallbacks.items():
        if key.lower() in stop_name.lower():
            print(f"  Using cached coords for '{stop_name}' (matched '{key}'): {coords}")
            return coords

    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(stop_name)}&format=json&limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": "RoadBrief/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"  Geocoding {stop_name} failed: {e}")
    return 0.0, 0.0


def create_ride(seed_session: Session) -> Ride:
    """Create the EMBC ride."""
    return _create_ride(seed_session, 1)


def create_ride_with_creator(seed_session: Session, creator_id: int) -> Ride:
    """Create the EMBC ride with a specific creator rider."""
    return _create_ride(seed_session, creator_id)


def _create_ride(seed_session: Session, creator_id: int) -> Ride:
    import secrets
    ride = Ride(
        org_id=1,
        name="EMBC 2026 - Montana Freedom Caucus Ride",
        description="Annual Eastern Montana Bicycle Club ride through the Black Hills and beyond.",
        start_date="2026-07-15",
        end_date="2026-07-18",
        share_code=secrets.token_urlsafe(16),
        status="published",
        created_by=creator_id,
    )
    seed_session.add(ride)
    seed_session.commit()
    seed_session.refresh(ride)
    return ride


def get_or_create_rider(seed_session: Session, display_name: str) -> int:
    """Get or create a default admin rider."""
    from app.models import Rider
    rider = seed_session.query(Rider).filter(Rider.display_name == display_name).first()
    if not rider:
        rider = Rider(
            org_id=1,
            display_name=display_name,
            auth_type="local",
            role="admin",
        )
        seed_session.add(rider)
        seed_session.commit()
        seed_session.refresh(rider)
    return rider.id


def seed_stops(seed_session: Session, ride: Ride) -> dict[int, dict]:
    """Create all stops for the EMBC ride with geocoding.
    Returns {day_number: {"day_id": int, "stop_ids": list[int]}}.
    """
    # Days and stops from routes/embc-2026.md
    days_data = [
        {
            "day_number": 1, "date": "2026-07-15", "title": "Day 1: Glendive to Hot Springs",
            "stops": [
                {"name": "Glendive, MT", "type": "start"},
                {"name": "Alzada, MT", "type": "gas"},
                {"name": "Hulett, WY", "type": "meal"},
                {"name": "Sundance, WY", "type": "gas"},
                {"name": "Mule Creek Jct, WY", "type": "waypoint"},
                {"name": "Hot Springs, SD", "type": "end"},
            ]
        },
        {
            "day_number": 2, "date": "2026-07-16", "title": "Day 2/3: Black Hills Loop (Iron Mountain / Needles)",
            "stops": [
                {"name": "Hot Springs, SD", "type": "start"},
                {"name": "US-385/US-87 junction, SD", "type": "waypoint"},
                {"name": "Hill City, SD", "type": "meal"},
                {"name": "Old Hill City Rd, SD", "type": "waypoint"},
                {"name": "Keystone, SD", "type": "meal"},
                {"name": "SD-16A (Iron Mountain Rd), SD", "type": "scenic"},
                {"name": "US-87 south, SD", "type": "waypoint"},
                {"name": "SD-385 south, SD", "type": "waypoint"},
                {"name": "Hot Springs, SD", "type": "end"},
            ]
        },
        {
            "day_number": 3, "date": "2026-07-17", "title": "Activity Day (non-ride day)",
            "stops": [
                {"name": "Hot Springs, SD", "type": "start"},
            ]
        },
        {
            "day_number": 4, "date": "2026-07-18", "title": "Day 4: Return to Glendive",
            "stops": [
                {"name": "Hot Springs, SD", "type": "start"},
                {"name": "Custer, SD", "type": "gas"},
                {"name": "Cheyenne Crossing, SD", "type": "meal"},
                {"name": "Spearfish, SD", "type": "meal"},
                {"name": "Belle Fourche, SD", "type": "gas"},
                {"name": "Bowman, ND", "type": "gas"},
                {"name": "Baker, MT", "type": "gas"},
                {"name": "Glendive, MT", "type": "end"},
            ]
        },
    ]

    # Rider already created in main() before seed_stops is called
    stop_ids_by_day: dict[int, dict] = {}

    for day_data in days_data:
        day = Day(
            ride_id=ride.id,
            day_number=day_data["day_number"],
            date=day_data["date"],
            title=day_data["title"],
        )
        seed_session.add(day)
        seed_session.flush()

        day_stop_ids: list[int] = []
        for i, stop_data in enumerate(day_data["stops"]):
            lat, lng = geocode(stop_data["name"])
            time.sleep(1)  # Nominatim rate limit: 1 req/sec

            stop = Stop(
                day_id=day.id,
                name=stop_data["name"],
                lat=lat,
                lng=lng,
                stop_type=stop_data["type"],
                order_in_day=i,
                destination_mode="city_center",
            )
            seed_session.add(stop)
            seed_session.flush()
            day_stop_ids.append(stop.id)

        seed_session.commit()
        stop_ids_by_day[day_data["day_number"]] = {
            "day_id": day.id,
            "stop_ids": day_stop_ids,
        }

    return stop_ids_by_day


def find_stop_by_name(seed_session: Session, name: str) -> int | None:
    """Find a stop ID by exact name match."""
    from app.models import Stop
    stop = seed_session.query(Stop).filter(Stop.name == name).first()
    return stop.id if stop else None


def seed_highlights(seed_session: Session, ride: Ride, day_info: dict):
    """Add sample highlights for the EMBC ride.
    
    Args:
        day_info: {day_number: {"day_id": int, "stop_ids": list[int]}}
                  Also has leg info after routing runs.
    """
    from app.models import Leg
    
    highlights = [
        # Day-level
        Highlight(
            ride_id=ride.id, day_id=None, leg_id=None, stop_id=None,
            title="Black Hills Base Camp (Days 2-3)",
            body="Base your stay in Hot Springs. One day is the Iron Mountain/Needles loop (~100mi of some of the best riding in the Black Hills). The other day follows the main route north through Cheyenne Crossing.",
            category="tip",
            sort_order=1,
        ),
        # Stop-level (Hulett)
        Highlight(
            ride_id=ride.id, day_id=None, leg_id=None, stop_id=None,
            title="Devils Tower",
            body="Devils Tower National Monument is 9 miles from Hulett — worth a detour if time allows. The approach road has tight switchbacks.",
            category="scenic",
            sort_order=2,
        ),
        # Stop-level (Alzada)
        Highlight(
            ride_id=ride.id, day_id=None, leg_id=None, stop_id=None,
            title="Alzada - Verify Gas",
            body="Tiny town — verify gas availability before relying on this as a fuel stop. Weather can affect pumps.",
            category="warning",
            sort_order=3,
        ),
    ]

    # Find specific stops for highlight references
    hulett_stop = find_stop_by_name(seed_session, "Hulett, WY")
    
    # Day 2 legs: get them to create leg-specific highlights
    day2_info = day_info.get(2)
    if day2_info and "legs" in day2_info:
        legs = day2_info["legs"]
        # Find the Iron Mountain Rd leg (Old Hill City Rd -> Keystone or similar)
        for leg in legs:
            start_name = ""
            end_name = ""
            try:
                ss = seed_session.query(Stop).filter(Stop.id == leg.start_stop_id).first()
                es = seed_session.query(Stop).filter(Stop.id == leg.end_stop_id).first()
                if ss and es:
                    start_name = ss.name.lower()
                    end_name = es.name.lower()
            except:
                pass
            
            # Iron Mountain Road highlight (16A between Hill City area and Keystone)
            if ("hill city" in start_name or "old hill city" in start_name) and "keystone" in end_name:
                highlights.append(Highlight(
                    ride_id=ride.id, day_id=None, leg_id=leg.id, stop_id=None,
                    title="Iron Mountain Road (16A)",
                    body="This scenic byway features pigtail bridges and one-lane tunnels that frame Mt Rushmore. Watch clearance on baggers — lower limits apply on some sections.",
                    category="scenic",
                    sort_order=4,
                ))
            
            # Needles Highway highlight (SD-385 south section)
            if "385" in start_name or "385" in end_name:
                highlights.append(Highlight(
                    ride_id=ride.id, day_id=None, leg_id=leg.id, stop_id=None,
                    title="Needles Highway",
                    body="Custer State Park entry fee required ($20/vehicle). Tight switchbacks and granite tunnels — a rider's dream but watch for slow traffic.",
                    category="warning",
                    sort_order=5,
                ))

    # Stop-level highlight for Hulett with proper reference
    if hulett_stop:
        h = Highlight(
            ride_id=ride.id, day_id=None, leg_id=None, stop_id=hulett_stop,
            title="Devils Tower Detour",
            body="Devils Tower National Monument is 9 miles from Hulett — worth a detour if time allows. The approach road has tight switchbacks.",
            category="scenic",
            sort_order=2,
        )
        # Replace the generic one above (sort_order=2)
        highlights[1] = h

    for h in highlights:
        seed_session.add(h)
    seed_session.commit()


def seed_rider_assignment(seed_session: Session, ride: Ride):
    """Create rider assignments for the EMBC ride."""
    from app.models import Rider, RideRider
    riders = seed_session.query(Rider).where(Rider.org_id == 1).all()
    for rider in riders:
        rr = RideRider(ride_id=ride.id, rider_id=rider.id, group_name="EMBC 2026")
        seed_session.add(rr)
    seed_session.commit()


def main():
    """Run the full EMBC seed."""
    print("=" * 60)
    print("RoadBrief EMBC 2026 Seeder")
    print("=" * 60)

    with Session(engine) as session:
        # Force reseed: clean up any existing EMBC data
        from app.models import Day, Stop, Leg, POI, Highlight, RideRider, Rider
        existing = session.query(Ride).filter(Ride.name.like("EMBC 2026%")).first()
        if existing:
            print("EMBC ride already exists. Dropping and reseeding...")
            # Clean up children in FK order
            session.query(Highlight).filter(
                (Highlight.ride_id == existing.id) |
                (Highlight.leg_id.in_(session.query(Leg.id).where(Leg.day_id.in_(session.query(Day.id).where(Day.ride_id == existing.id))))) |
                (Highlight.stop_id.in_(session.query(Stop.id).where(Stop.day_id.in_(session.query(Day.id).where(Day.ride_id == existing.id)))))
            ).delete(synchronize_session=False)
            session.query(POI).filter(POI.stop_id.in_(session.query(Stop.id).where(Stop.day_id.in_(session.query(Day.id).where(Day.ride_id == existing.id))))).delete(synchronize_session=False)
            session.query(Leg).filter(Leg.day_id.in_(session.query(Day.id).where(Day.ride_id == existing.id))).delete(synchronize_session=False)
            session.query(Stop).filter(Stop.day_id.in_(session.query(Day.id).where(Day.ride_id == existing.id))).delete(synchronize_session=False)
            session.query(Day).filter(Day.ride_id == existing.id).delete(synchronize_session=False)
            session.query(RideRider).filter(RideRider.ride_id == existing.id).delete(synchronize_session=False)
            session.delete(existing)  # Delete ride first (it references rider)
            session.query(Rider).filter(Rider.display_name == "embc_admin").delete(synchronize_session=False)
            session.commit()

        print("\n1. Creating admin rider...")
        rider_id = get_or_create_rider(session, "embc_admin")
        print(f"   Rider created/found: ID={rider_id}")

        print("\n2. Creating EMBC ride...")
        ride = create_ride_with_creator(session, rider_id)
        print(f"   Ride created: ID={ride.id}, share_code={ride.share_code}")

        print("\n3. Geocoding stops...")
        day_info = seed_stops(session, ride)
        for day_num, info in day_info.items():
            print(f"   Day {day_num}: {len(info['stop_ids'])} stops created")

        print("\n3. Generating legs (OSRM routing)...")
        total_legs = 0
        for day_num, info in day_info.items():
            legs = generate_legs_for_day(info["day_id"], session)
            info["legs"] = legs
            print(f"   Day {day_num}: {len(legs)} legs generated")
            total_legs += len(legs)
        print(f"   Total: {total_legs} legs")

        print("\n4. Indexing POIs (Overpass API)...")
        total_pois = 0
        for day_num, info in day_info.items():
            for stop_id in info["stop_ids"]:
                pois = index_pois_for_stop(stop_id, session)
                total_pois += len(pois)
        print(f"   Total: {total_pois} POIs indexed")

        print("\n5. Creating highlights...")
        seed_highlights(session, ride, day_info)
        print("   Highlights added")

        print("\n6. Assigning riders...")
        seed_rider_assignment(session, ride)

        print("\nDone! Get the ride with:")
        print(f"  GET http://localhost:8000/api/v1/rides/{ride.share_code}")


if __name__ == "__main__":
    main()
