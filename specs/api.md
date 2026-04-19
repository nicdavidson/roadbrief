# RoadBrief — API Specification

FastAPI, async, JSON. All endpoints under `/api/v1/`.

## Auth
- JWT tokens, issued on login or anonymous session start
- Token in `Authorization: Bearer <token>` header
- Three access levels: `public` (no token needed), `rider` (any valid token), `admin` (admin role)

## Endpoints

### Rides

```
GET  /api/v1/rides/{share_code}          [public]
```
Returns full ride data for the share link. This is the main endpoint riders hit.
Response includes: ride info, all days, stops, legs, POIs, highlights.
Single request loads everything needed for the map view.

```
POST /api/v1/rides                       [admin]
```
Create a new ride. Body: `{ name, description, start_date, end_date, org_id }`

```
PUT  /api/v1/rides/{id}                  [admin]
```
Update ride metadata.

```
POST /api/v1/rides/{id}/publish          [admin]
```
Change status to "published", generates share_code if not set.

### Days

```
GET  /api/v1/rides/{ride_id}/days        [public]
```
List all days for a ride with stops and legs.

```
POST /api/v1/rides/{ride_id}/days        [admin]
PUT  /api/v1/days/{id}                   [admin]
DELETE /api/v1/days/{id}                 [admin]
```

### Stops

```
POST /api/v1/days/{day_id}/stops         [admin]
PUT  /api/v1/stops/{id}                  [admin]
DELETE /api/v1/stops/{id}                [admin]
POST /api/v1/days/{day_id}/stops/reorder [admin]
```
Body for reorder: `{ stop_ids: [3, 1, 4, 2] }` — sets order_in_day.

### Legs

```
POST /api/v1/days/{day_id}/generate-legs [admin]
```
Auto-generates legs between consecutive stops. Calls routing API (Mapbox Directions or OSRM) to get geometry, distance, duration. Replaces existing legs for the day.

### POIs

```
POST /api/v1/stops/{stop_id}/index-pois  [admin]
```
Triggers POI indexing for a stop. Queries Google Places and/or Overpass API based on stop_type. Radius:
- gas: 2 miles (~3.2 km)
- meal: 5 miles (~8 km)
- overnight: 10 miles (~16 km)
Stores results as POI records.

```
POST /api/v1/stops/{stop_id}/pois        [admin]
PUT  /api/v1/pois/{id}                   [admin]
DELETE /api/v1/pois/{id}                 [admin]
```
Manual POI CRUD for admin-added spots.

### Highlights

```
POST /api/v1/highlights                  [admin]
```
Body: `{ ride_id, day_id?, leg_id?, stop_id?, title, body, category }`
Exactly one of day_id/leg_id/stop_id should be set.

```
PUT  /api/v1/highlights/{id}             [admin]
DELETE /api/v1/highlights/{id}           [admin]
```

### Export

```
GET /api/v1/legs/{leg_id}/export/gpx     [public]
```
Returns GPX file for a single leg.

```
GET /api/v1/days/{day_id}/export/gpx     [public]
```
Returns GPX file for all legs in a day (concatenated).

```
GET /api/v1/legs/{leg_id}/export/url     [public]
```
Returns Google Maps URL for the leg (via waypoints).

```
GET /api/v1/days/{day_id}/export/url     [public]
```
Returns Google Maps URL for the full day route.

### Riders / Auth

```
POST /api/v1/auth/register              [public]
```
Body: `{ display_name, email?, password?, motorcycle? }`
If no email+password: creates local-only rider, returns token.
If email but no password: error.
If email+password: creates full account, returns token.
If no email: warn in response `"warning": "Without an email, you cannot reset your password."`

```
POST /api/v1/auth/login                 [public]
```
Body: `{ email, password }` — returns JWT.

```
GET  /api/v1/riders/me                  [rider]
PUT  /api/v1/riders/me                  [rider]
```
Profile read/update.

### Photos

```
POST /api/v1/rides/{ride_id}/photos     [rider]
```
Multipart upload. Fields: `image` (file), `caption?`, `lat?`, `lng?`.
Server extracts EXIF geolocation if lat/lng not provided. Associates with nearest stop.

```
GET  /api/v1/rides/{ride_id}/photos     [public]
```
Returns all photos for a ride. Query params: `stop_id`, `rider_id`, `featured`.

```
PUT  /api/v1/photos/{id}/feature        [admin]
```
Toggle featured flag.

## Response Format

All responses follow:
```json
{
  "data": { ... },
  "error": null
}
```
Or on error:
```json
{
  "data": null,
  "error": { "message": "...", "code": "NOT_FOUND" }
}
```

## Rate Limiting
None for V1. Add if/when public.
