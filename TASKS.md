# RoadBrief — Hermes Build Plan

**START HERE.** This is the master task list for building RoadBrief. Work through tasks in order.

## Server Management

The RoadBrief backend runs as a **systemd service**. Do NOT manually start/stop uvicorn or kill processes on port 8000.

```bash
# Check status
systemctl status roadbrief

# Restart (after code changes)
sudo systemctl restart roadbrief

# View logs
journalctl -u roadbrief -f

# Health check
curl http://localhost:8000/api/v1/health
```

**NEVER** run `lsof -ti:8000 | xargs kill`, `nohup uvicorn ...`, or any manual server management. The service auto-restarts on failure.

## How To Use This File

1. Read this file first — it's your map.
2. Each task tells you which spec file to read. **Read that file before starting the task.**
3. All spec files are short and focused. Don't read files you don't need yet.
4. After completing a task, mark it `[x]` and move to the next.
5. If something is unclear, check the spec file referenced. If still unclear, ask.
6. **After modifying backend code**, restart the service: `sudo systemctl restart roadbrief`

## Project Overview

RoadBrief is a group motorcycle ride planning app. Organizer inputs a route (days + cities), system generates routes, indexes nearby gas/food/lodging, and riders get a shareable map with export to Google Maps/GPX.

**Stack:** FastAPI + SQLModel + PostgreSQL (backend), React + TypeScript + Mapbox GL JS (frontend)

## File Map

| File | What's In It | When To Read |
|------|-------------|--------------|
| `README.md` | Tech stack, directory structure, conventions | Task 1 |
| `specs/data-model.md` | All database models (SQLModel) | Task 2 |
| `specs/auth.md` | Three-tier auth system, JWT, registration | Task 3 |
| `specs/api.md` | Every API endpoint with request/response shapes | Tasks 4, 6, 7, 8, 9 |
| `specs/frontend.md` | React pages, components, layout, state | Tasks 10, 11, 12 |
| `specs/offline.md` | PWA caching, offline strategy | Not yet (Phase 3) |
| `routes/embc-2026.md` | Actual ride data — cities, stops, days | Task 5 |

---

## Tasks

### Backend (Tasks 1-9)

- [x] **Task 1: Backend Scaffold**
  - Read: `README.md`
  - Create `backend/` directory structure
  - Create `backend/requirements.txt`:
    ```
    fastapi>=0.115
    uvicorn[standard]
    sqlmodel
    psycopg2-binary
    alembic
    python-jose[cryptography]
    passlib[bcrypt]
    httpx
    python-multipart
    pydantic-settings
    ```
  - Create `backend/app/__init__.py`
  - Create `backend/app/main.py` — FastAPI app, CORS middleware, health check at `/api/v1/health`
  - Create `backend/app/config.py` — pydantic-settings: DATABASE_URL, JWT_SECRET, MAPBOX_TOKEN
  - Create `backend/app/database.py` — SQLModel engine, session factory, `get_session` dependency
  - **Done when:** `cd backend && uvicorn app.main:app` starts and `curl localhost:8000/api/v1/health` returns `{"status": "ok"}`

- [x] **Task 2: Database Models**
  - Read: `specs/data-model.md`
  - Create `backend/app/models.py` — all models from the spec (Organization, Ride, Day, Stop, Leg, POI, Highlight, Rider, RideRider, Photo)
  - Init Alembic: `cd backend && alembic init alembic`
  - Configure `alembic/env.py` to import models and use DATABASE_URL from config
  - Generate migration: `alembic revision --autogenerate -m "initial"`
  - Run migration: `alembic upgrade head`
  - **Done when:** All tables exist in the database

- [x] **Task 3: Auth System**
  - Read: `specs/auth.md`
  - Create `backend/app/auth.py` — JWT create/verify, password hashing (bcrypt via passlib)
  - Create `backend/app/dependencies.py` — `get_current_rider` and `require_admin` FastAPI dependencies
  - Create `backend/app/routes/__init__.py`
  - Create `backend/app/routes/auth.py` — `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
  - Create `backend/app/routes/riders.py` — `GET /api/v1/riders/me`, `PUT /api/v1/riders/me`, `POST /api/v1/riders/me/upgrade`
  - Register routers in `main.py`
  - **Done when:** Can register (local-only and full account), login, read profile via curl

- [x] **Task 4: Ride CRUD**
  - Read: `specs/api.md` — Rides, Days, Stops sections
  - Create `backend/app/routes/rides.py` — `POST /api/v1/rides`, `GET /api/v1/rides/{share_code}`, `PUT /api/v1/rides/{id}`, `POST /api/v1/rides/{id}/publish`
  - Create `backend/app/routes/days.py` — CRUD for days within a ride
  - Create `backend/app/routes/stops.py` — CRUD for stops, reorder endpoint
  - The `GET /api/v1/rides/{share_code}` response must include all days, stops, legs, POIs, and highlights (nested)
  - **Done when:** Can create a ride, add days with stops, and fetch the full ride by share_code

- [x] **Task 5: Seed EMBC Data**
  - Read: `routes/embc-2026.md`
  - Create `backend/app/seed.py` — standalone script that creates the EMBC ride
  - Geocode each stop using Nominatim (OpenStreetMap): `https://nominatim.openstreetmap.org/search?q=Glendive,MT&format=json`
  - **Rate limit Nominatim: 1 request per second, set User-Agent header**
  - Cities to geocode:
    - Day 1: Glendive MT, Alzada MT, Hulett WY, Sundance WY, Mule Creek Jct WY, Hot Springs SD
    - Day 2/3 loop: Hot Springs SD, Hill City SD, Keystone SD
    - Day 4: Hot Springs SD, Custer SD, Cheyenne Crossing SD, Spearfish SD, Belle Fourche SD, Bowman ND, Baker MT, Glendive MT
  - Set stop_types: first/last stop of day = "start"/"end", mid-day = "gas" or "meal", Hot Springs = "overnight"
  - Run: `cd backend && python -m app.seed`
  - **Done when:** `GET /api/v1/rides/{share_code}` returns the EMBC ride with geocoded stops
  - **Final state:** 4 days, 24 stops (all geocoded), 20 legs, 30 POIs, 8 highlights
  - **Fixes applied:** substring fallback matching (was exact match), added SD-16A fallback, fixed Overpass query syntax (double semicolons causing 400s), added retry logic with backoff

- [x] **Task 6: Leg Generation**
  - Read: `specs/api.md` — Legs section
  - Create `backend/app/services/__init__.py`
  - Create `backend/app/services/routing.py` — calls OSRM public demo API:
    ```
    GET http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=polyline
    ```
  - Create `backend/app/routes/legs.py` — `POST /api/v1/days/{day_id}/generate-legs`
  - For each consecutive stop pair, fetch route, store geometry + distance + duration
  - **Rate limit OSRM: 1 request per second**
  - Update `seed.py` to call leg generation after creating stops
  - **Done when:** All EMBC days have legs with real distances and encoded polyline geometry

- [x] **Task 7: POI Indexing**
  - Read: `specs/api.md` — POIs section, `specs/data-model.md` — POI model
  - Create `backend/app/services/poi.py` — queries Overpass API (OpenStreetMap):
    ```
    POST https://overpass-api.de/api/interpreter
    Body: [out:json];node(around:{radius_meters},{lat},{lng})[amenity=fuel];out;
    ```
  - Radius by stop_type: gas=3200m (2mi), meal=8000m (5mi), overnight=16000m (10mi)
  - Create `backend/app/routes/pois.py` — `POST /api/v1/stops/{stop_id}/index-pois` + manual CRUD
  - Update `seed.py` to run POI indexing for all stops
  - **Rate limit Overpass: 2 requests per second max**
  - **Done when:** EMBC stops have POIs (gas stations, restaurants, hotels) from OSM

- [x] **Task 8: Highlights**
  - Read: `specs/api.md` — Highlights section
  - Create `backend/app/routes/highlights.py` — CRUD endpoints
  - Update `seed.py` to create sample highlights:
    - Day-level: "Days 2-3 are based in Hot Springs. One day is the Iron Mountain/Needles loop ride."
    - Stop-level (Hulett): "Devils Tower National Monument is 9 miles from Hulett — worth a detour if time allows."
    - Leg-level (Hill City→Keystone→16A): "Iron Mountain Road (16A) has pigtail bridges and one-lane tunnels that frame Mt Rushmore. Watch clearance on baggers."
    - Leg-level (385 south): "Needles Highway — Custer State Park entry fee required. Tight switchbacks and granite tunnels."
    - Stop-level (Alzada): "Tiny town — verify gas availability before relying on this as a fuel stop."
  - **Done when:** Highlights appear in the ride response nested under their day/leg/stop

- [x] **Task 9: Export**
  - Read: `specs/api.md` — Export section
  - Create `backend/app/services/export.py`:
    - `generate_gpx(legs: list[Leg], stops: list[Stop]) -> str` — valid GPX XML
    - `google_maps_url(stops: list[Stop]) -> str` — Google Maps directions URL with waypoints
  - Create `backend/app/routes/export.py`:
    - `GET /api/v1/legs/{leg_id}/export/gpx` — single leg GPX
    - `GET /api/v1/days/{day_id}/export/gpx` — full day GPX
    - `GET /api/v1/legs/{leg_id}/export/url` — Google Maps URL for leg
    - `GET /api/v1/days/{day_id}/export/url` — Google Maps URL for day
  - GPX format: include `<wpt>` for stops and `<trk><trkseg><trkpt>` for route
  - Google Maps URL format: `https://www.google.com/maps/dir/{stop1}/{stop2}/{stop3}/...`
  - **Done when:** Can download GPX and get Google Maps URLs for any EMBC day

### Frontend (Tasks 10-12)

- [x] **Task 10: Frontend Scaffold**
  - Read: `specs/frontend.md`, `README.md`
  - Create frontend: `npm create vite@latest frontend -- --template react-ts`
  - Install: `npm install mapbox-gl react-router-dom tailwindcss @tailwindcss/vite`
  - Install types: `npm install -D @types/mapbox-gl`
  - Configure Tailwind in `vite.config.ts`
  - Create `frontend/src/api.ts` — fetch wrapper for `/api/v1/` endpoints
  - Create `frontend/src/types.ts` — TypeScript interfaces matching backend models
  - Create `frontend/src/pages/RideView.tsx` — page at `/ride/:shareCode`, fetches ride data
  - Configure proxy in `vite.config.ts` to forward `/api` to backend (localhost:8000)
  - **Done when:** `npm run dev` loads at localhost:5173, fetches ride data from backend, shows raw JSON
  - **Final state:** Vite + React + TypeScript + Tailwind CSS. Routes: `/` → EMBC ride, `/ride/:shareCode`. API proxy to localhost:8000. RideView renders all 4 days with stops, POI counts, distances/times, expandable stop cards, GPX/Google Maps export links. `npm run build` passes cleanly.
  - **Files created:** `src/types.ts`, `src/api.ts`, `src/pages/RideView.tsx`, updated `src/App.tsx` (React Router), `vite.config.ts` (Tailwind + proxy), `src/index.css` (mobile-first base styles)

- [x] **Task 11: Map Component**
  - Read: `specs/frontend.md` — RideMap section
  - Create `frontend/src/components/RideMap.tsx`
  - Initialize Mapbox GL map centered on ride bounding box
  - Decode polyline geometries from legs → GeoJSON LineStrings
  - Render route lines — one color per day (Day 1: blue, Day 2/3: green, Day 4: orange)
  - Render stop markers with icons by type (use Mapbox built-in markers or simple colored circles)
  - On marker click: call `onStopSelect(stopId)` prop
  - On day filter change: show/hide route layers
  - **Done when:** EMBC route renders on map with colored routes and clickable stop markers
  - **Final state:** Mapbox GL initialized once, layers properly cleaned/redrawn on activeDay change (fixes layer accumulation bug), markers with type-based colors, click→scroll-to-card + flyTo selected stop, day filtering with opacity dimming. `npm run build` passes cleanly.

- [x] **Task 12: Ride View UI**
  - Read: `specs/frontend.md` — full layout spec
  - Create `frontend/src/components/DaySelector.tsx` — horizontal pill bar
  - Create `frontend/src/components/StopCard.tsx` — expandable card with POI list
  - Create `frontend/src/components/POIItem.tsx` — single POI with name, type icon, distance, rating, hours + Google/Apple Maps links
  - Create `frontend/src/components/HighlightCard.tsx` — styled by category (warning=amber, scenic=green, cost=blue, tip=purple, info=gray)
  - Create `frontend/src/components/ExportBar.tsx` — GPX download + Google Maps link + QR code modal
  - Wire interactions: map marker click ↔ stop card scroll, stop card click ↔ map pan/flyTo
  - Make it mobile-first — test at 375px viewport width
  - **Done when:** Full ride view works on mobile — browse days, see stops, expand POIs with maps links, export routes
  - **Final state:** All 5 components built and wired. RideView uses ExportBar with GPX download, Google Maps link, QR code modal (public API), and shareable link. StopCard uses POIItem for individual POIs with name/address/rating/hours/phone + Google Maps and Apple Maps open links. HighlightCard renders with category-based styling (warning=amber, scenic=green, cost=blue, tip=purple, info=gray). RideMap fixed layer accumulation bug (cleanup before redraw), marker click now flyTo's to stop. `npm run build` passes cleanly.
  - **Files created:** `src/components/POIItem.tsx`, `src/components/HighlightCard.tsx`, `src/components/ExportBar.tsx`. Updated: `RideMap.tsx` (layer cleanup fix, flyTo on select), `StopCard.tsx` (POIItem + HighlightCard integration), `RideView.tsx` (ExportBar wiring).