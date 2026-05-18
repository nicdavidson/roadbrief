"""POI indexing service using Overpass API (OpenStreetMap).

Searches for gas, food, and lodging near every stop regardless of stop type.
Uses node/way queries and adaptive radius for rural areas.
"""
import json
import time
import urllib.request

from sqlmodel import Session

from app.models import Stop, POI


# Search categories — every stop gets all of these
SEARCH_CATEGORIES = [
    {
        "poi_type": "gas",
        "label": "fuel",
        "query": '(nwr["amenity"="fuel"](around:{radius},{lat},{lng}););',
        "radius": 8000,  # 5 miles — rural gas can be sparse
    },
    {
        "poi_type": "food",
        "label": "food",
        "query": (
            '(nwr["amenity"="restaurant"](around:{radius},{lat},{lng});'
            'nwr["amenity"="fast_food"](around:{radius},{lat},{lng});'
            'nwr["amenity"="cafe"](around:{radius},{lat},{lng}););'
        ),
        "radius": 8000,
    },
    {
        "poi_type": "hotel",
        "label": "lodging",
        "query": (
            '(nwr["tourism"="hotel"](around:{radius},{lat},{lng});'
            'nwr["tourism"="motel"](around:{radius},{lat},{lng});'
            'nwr["tourism"="camp_site"](around:{radius},{lat},{lng});'
            'nwr["tourism"="guest_house"](around:{radius},{lat},{lng}););'
        ),
        "radius": 16000,  # 10 miles
    },
]

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "RoadBrief/1.0 (motorcycle ride planning)"


def index_pois_for_stop(stop_id: int, session: Session, clear_existing: bool = True) -> list[POI]:
    """Query Overpass for gas, food, and lodging near a stop.

    Searches all categories regardless of stop type. Uses nwr (node/way/relation)
    to catch buildings mapped as areas, not just point nodes.
    """
    stop = session.get(Stop, stop_id)
    if not stop or not stop.lat or not stop.lng:
        return []

    if clear_existing:
        existing = session.query(POI).where(POI.stop_id == stop_id).all()
        for p in existing:
            session.delete(p)
        session.flush()

    all_pois: list[POI] = []
    seen_source_ids: set[str] = set()

    for cat in SEARCH_CATEGORIES:
        results = _query_overpass(
            cat["query"].format(radius=cat["radius"], lat=stop.lat, lng=stop.lng),
            cat["poi_type"],
            stop_id,
        )

        for poi_data in results:
            sid = poi_data.get("source_id", "")
            if sid in seen_source_ids:
                continue
            seen_source_ids.add(sid)

            poi = POI(**poi_data)
            session.add(poi)
            all_pois.append(poi)

        # Rate limit between Overpass queries
        time.sleep(1)

    session.commit()
    return all_pois


def _query_overpass(query_fragment: str, poi_type: str, stop_id: int) -> list[dict]:
    """Execute an Overpass query and return POI dicts."""
    query_str = f"[out:json][timeout:30];{query_fragment}out center 20;"

    for attempt in range(3):
        try:
            req = urllib.request.Request(
                OVERPASS_URL,
                data=query_str.encode("utf-8"),
                method="POST",
                headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read())

            results = []
            for elem in data.get("elements", []):
                name = _get_name(elem)
                if not name:
                    continue

                # For ways/relations, use center coordinates
                lat = elem.get("lat") or (elem.get("center", {}).get("lat"))
                lng = elem.get("lon") or (elem.get("center", {}).get("lon"))
                if not lat or not lng:
                    continue

                results.append({
                    "stop_id": stop_id,
                    "name": name,
                    "address": _get_address(elem),
                    "lat": lat,
                    "lng": lng,
                    "poi_type": poi_type,
                    "hours": elem.get("tags", {}).get("opening_hours"),
                    "rating": _parse_rating(elem),
                    "phone": elem.get("tags", {}).get("phone"),
                    "motorcycle_friendly": _is_motorcycle_friendly(elem),
                    "source": "osm",
                    "source_id": str(elem.get("id", "")),
                })

            return results

        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code == 504:
                time.sleep(5 * (attempt + 1))
                continue
            print(f"  Overpass HTTP {e.code} for stop {stop_id}: {e.reason}")
            return []
        except Exception as e:
            if attempt == 2:
                print(f"  Overpass failed for stop {stop_id}: {e}")
                return []
            time.sleep(3 * (attempt + 1))

    return []


def _get_name(elem: dict) -> str | None:
    """Extract a useful name from an OSM element."""
    tags = elem.get("tags", {})
    name = tags.get("name")
    if name:
        return name
    brand = tags.get("brand")
    if brand:
        return brand
    operator = tags.get("operator")
    if operator:
        return operator
    return None


def _get_address(elem: dict) -> str | None:
    """Build address string from OSM addr tags."""
    tags = elem.get("tags", {})
    parts = []
    for key in ["addr:housenumber", "addr:street", "addr:city", "addr:state", "addr:postcode"]:
        val = tags.get(key)
        if val:
            parts.append(val)
    return ", ".join(parts) if parts else None


def _parse_rating(elem: dict) -> float | None:
    """Extract numeric rating if available."""
    tags = elem.get("tags", {})
    for key in ["stars", "star_rating", "rate", "rating"]:
        val = tags.get(key)
        if val:
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
    return None


def _is_motorcycle_friendly(elem: dict) -> bool:
    """Check motorcycle-related tags."""
    tags = elem.get("tags", {})
    return tags.get("motorcycle_parking") == "yes" or "motorcycle" in tags
