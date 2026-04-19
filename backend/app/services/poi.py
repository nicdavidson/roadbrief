"""POI indexing service using Overpass API (OpenStreetMap)."""
import json
import time
import urllib.request
import urllib.parse

from sqlmodel import Session

from app.models import Stop, POI


def index_pois_for_stop(stop_id: int, session: Session) -> list[POI]:
    """Query Overpass API for nearby gas, food, and lodging."""
    stop = session.get(Stop, stop_id)
    if not stop:
        return []

    # Radius by stop_type
    radii = {
        "gas": 3200,        # 2 miles
        "meal": 8000,       # 5 miles
        "overnight": 16000, # 10 miles
        "start": 3200,
        "end": 3200,
        "waypoint": 3200,
    }
    radius = radii.get(stop.stop_type, 3200)

    poi_type_map = {
        "gas": ["fuel"],
        "meal": ["restaurant", "fast_food", "cafe"],
        "overnight": ["hotel", "motel", "camp_site", "hostel"],
    }
    poi_types = poi_type_map.get(stop.stop_type, ["fuel"])

    # Build query based on stop type
    if stop.stop_type == "overnight":
        overnight_q = (f'node["tourism"="hotel"](around:{radius},{stop.lat},{stop.lng});'
                       f'node["tourism"="motel"](around:{radius},{stop.lat},{stop.lng});'
                       f'node["tourism"="camp_site"](around:{radius},{stop.lat},{stop.lng});'
                       f'node["hostel"](around:{radius},{stop.lat},{stop.lng});')
        query_str = f"[out:json];{overnight_q};out;"
        poi_type = "hotel"
    elif stop.stop_type in ("gas", "start", "end"):
        query_str = f'[out:json];node["amenity"="fuel"](around:{radius},{stop.lat},{stop.lng});out;'
        poi_type = "gas"
    elif stop.stop_type in ("meal", "waypoint"):
        query_str = (f'[out:json];(node["amenity"="restaurant"](around:{radius},{stop.lat},{stop.lng});'
                     f'node["amenity"="fast_food"](around:{radius},{stop.lat},{stop.lng});'
                     f'node["amenity"="cafe"](around:{radius},{stop.lat},{stop.lng}));out;')
        poi_type = "food" if stop.stop_type == "meal" else "poi"
    else:
        return []

    url = "https://overpass-api.de/api/interpreter"
    
    # Pool results
    all_results: dict[str, dict] = {}
    
    # Retry with backoff — Overpass is flaky
    max_retries = 3
    for attempt in range(max_retries):
        try:
            data = query_str.encode("utf-8")
            req = urllib.request.Request(
                url, data=data, method="POST",
                headers={
                    "User-Agent": "RoadBrief/1.0 (motorcycle ride planning)",
                    "Accept": "*/*",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                overpass_data = json.loads(resp.read())
            
            for node in overpass_data.get("elements", []):
                nid = str(node.get("id", ""))
                if nid in all_results:
                    continue
                all_results[nid] = {
                    "stop_id": stop.id,
                    "name": node.get("tags", {}).get("name", node.get("tags", {}).get("addr:housename", "Unknown") or f"POI {nid}"),
                    "address": _get_address(node),
                    "lat": node.get("lat"),
                    "lng": node.get("lon"),
                    "poi_type": poi_type,
                    "hours": node.get("tags", {}).get("opening_hours"),
                    "rating": _parse_rating(node),
                    "phone": node.get("tags", {}).get("phone"),
                    "motorcycle_friendly": _is_motorcycle_friendly(node),
                    "source": "osm",
                    "source_id": nid,
                }
            
            if attempt > 0 and not all_results:
                print(f"  Overpass retry {attempt+1}/{max_retries} for stop {stop_id}")
            break  # Success
            
        except urllib.error.HTTPError as e:
            if attempt == max_retries - 1:
                print(f"  Overpass HTTP error for stop {stop_id}: {e.code} {e.reason}")
                return []
            time.sleep(3 * (attempt + 1))
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  Overpass query failed for stop {stop_id}: {e}")
                return []
            time.sleep(2 * (attempt + 1))

    pois = []
    for data in all_results.values():
        poi = POI(**data)
        session.add(poi)
        pois.append(poi)

    session.commit()
    return pois


def _get_address(node: dict) -> str | None:
    """Extract address from OSM node."""
    tags = node.get("tags", {})
    parts = []
    for key in ["addr:housenumber", "addr:street", "addr:city", "addr:postcode"]:
        val = tags.get(key)
        if val:
            parts.append(val)
    return ", ".join(parts) if parts else None


def _parse_rating(node: dict) -> float | None:
    """Extract rating from OSM tags."""
    tags = node.get("tags", {})
    rating_str = tags.get("rate") or tags.get("star_rating")
    if rating_str:
        try:
            return float(rating_str)
        except (ValueError, TypeError):
            pass
    # Check for rating = 4/5 etc.
    if tags.get("★") or tags.get("stars"):
        return None
    return None


def _is_motorcycle_friendly(node: dict) -> bool:
    """Check if a place is motorcycle-friendly."""
    tags = node.get("tags", {})
    # Highway facilities with motorcycle parking = yes
    return bool(tags.get("motorcycle_parking") == "yes") or bool(tags.get("motorcycle"))
