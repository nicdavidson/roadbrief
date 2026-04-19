import time
import urllib.request
import urllib.parse
import json

from sqlmodel import Session

from app.models import Stop, Leg


def generate_legs_for_day(day_id: int, session: Session) -> list[Leg]:
    """Generate legs between consecutive stops using OSRM routing API."""
    stops = session.query(Stop).where(Stop.day_id == day_id).order_by(Stop.order_in_day).all()

    if len(stops) < 2:
        return []

    # Delete existing legs for this day
    existing = session.query(Leg).where(Leg.day_id == day_id).all()
    for leg in existing:
        session.delete(leg)
    session.commit()

    new_legs: list[Leg] = []
    for i in range(len(stops) - 1):
        start = stops[i]
        end = stops[i + 1]

        # Call OSRM public demo API
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{start.lng},{start.lat};{end.lng},{end.lat}"
            f"?overview=full&geometries=polyline"
        )

        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())

            if data.get("routes"):
                route = data["routes"][0]
                poly = route.get("geometry", "")
                dist_m = route.get("distance", 0)
                dur_s = route.get("duration", 0)

                leg = Leg(
                    day_id=day_id,
                    start_stop_id=start.id,
                    end_stop_id=end.id,
                    route_geometry=poly,
                    distance_miles=round(dist_m * 0.000621371, 2),  # meters to miles
                    duration_minutes=round(dur_s / 60),
                    order_in_day=i,
                )
                session.add(leg)
                new_legs.append(leg)

        except Exception as e:
            print(f"  Failed to generate leg {start.name} -> {end.name}: {e}")

        time.sleep(1)  # OSRM rate limit: 1 req/sec

    session.commit()
    return new_legs


def generate_all_legs(session: Session, ride_id: int) -> int:
    """Generate legs for all days of a ride. Returns number of legs created."""
    from app.models import Day
    days = session.query(Day).where(Day.ride_id == ride_id).order_by(Day.day_number).all()
    total = 0
    for day in days:
        legs = generate_legs_for_day(day.id, session)
        total += len(legs)
    return total
