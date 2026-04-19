import xml.etree.ElementTree as ET
from datetime import datetime


def generate_gpx(legs_data: list[dict], stops_data: list[dict]) -> str:
    """Generate a GPX XML string from legs and stops."""
    root = ET.Element("gpx", {
        "version": "1.1",
        "creator": "RoadBrief",
        "xmlns": "http://www.topografix.com/GPX/1/1",
    })

    # Add waypoints for each stop
    trk = ET.SubElement(root, "trk")
    ET.SubElement(trk, "name", text="RoadBrief Route")
    trkseg = ET.SubElement(trk, "trkseg")

    for stop in stops_data:
        wpt = ET.SubElement(root, "wpt", {
            "lat": str(stop.get("lat", 0)),
            "lon": str(stop.get("lng", 0)),
        })
        ET.SubElement(wpt, "name").text = stop.get("name", "Stop")
        ET.SubElement(wpt, "desc").text = f"Stop: {stop.get('name', '')} (Type: {stop.get('stop_type', '')})"

    # Add track points from legs
    for leg in legs_data:
        poly = leg.get("route_geometry", "")
        if poly:
            coords = _decode_polyline(poly)
            for i, (lat, lng) in enumerate(coords):
                trkpt = ET.SubElement(trkseg, "trkpt", {"lat": str(lat), "lon": str(lng)})
                if i == 0:
                    ET.SubElement(trkpt, "ele").text = str(leg.get("distance_miles", 0))

    return ET.tostring(root, encoding="unicode")


def google_maps_url(stops_data: list[dict]) -> str:
    """Generate a Google Maps directions URL with waypoints."""
    stops = stops_data.copy()
    if not stops:
        return ""

    parts = []
    for i, s in enumerate(stops):
        lat = s.get("lat", 0)
        lng = s.get("lng", 0)
        name = s.get("name", f"{lat},{lng}")
        if i == 0:
            parts.append(f"{lat},{lng}")
        else:
            parts.append(f"+{lat},{lng}")

    return f"https://www.google.com/maps/dir/{'/'.join(parts)}"


def _decode_polyline(encoded: str) -> list[tuple[float, float]]:
    """Decode Google polyline to list of (lat, lng) tuples."""
    if not encoded:
        return []

    result = []
    index = 0
    lat = 0
    lng = 0

    while index < len(encoded):
        byte = 0
        shift = 0
        while True:
            char = ord(encoded[index]) - 63
            byte |= (char & 0x1f) << shift
            index += 1
            if (char & 0x20) == 0:
                break
            shift += 1

        dlat = byte if byte & 1 == 0 else ~(byte >> 1)
        lat += dlat

        byte = 0
        shift = 0
        while True:
            char = ord(encoded[index]) - 63
            byte |= (char & 0x1f) << shift
            index += 1
            if (char & 0x20) == 0:
                break
            shift += 1

        dlng = byte if byte & 1 == 0 else ~(byte >> 1)
        lng += dlng

        result.append((lat / 1e5, lng / 1e5))

    return result
