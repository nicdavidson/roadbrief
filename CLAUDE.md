# RoadBrief — AI Dev Context

## What This Is

Group motorcycle ride planning platform. NOT a navigation app — it's the planning layer above navigation. Organizer builds the route plan, shares with riders, riders export legs to Google Maps for turn-by-turn.

**First real use case:** EMBC (Eastern Montana Bible Camp) Ride 2026 — 4-day ride from Glendive MT through the Black Hills.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLModel, PostgreSQL + PostGIS, Alembic migrations
- **Frontend:** React (Vite), TypeScript strict, Tailwind CSS, Mapbox GL JS
- **Auth:** JWT, three tiers (anonymous, local-name, full account)
- **Photos:** Cloudflare R2
- **Hosting:** Fly.io (backend + frontend as separate apps)
- **Native:** Capacitor (PWA → App Store / Play Store)

## Architecture

```
Frontend (React/Vite) → /api/* proxy → Backend (FastAPI)
                                        ↓
                                   PostgreSQL + PostGIS
```

Single main endpoint `GET /api/v1/rides/{share_code}` loads everything for a ride. Admin endpoints for CRUD ops. Export endpoints generate Google Maps / GPX links per leg.

## Key Files

- `specs/` — Focused spec files (data-model, api, frontend, auth, offline)
- `routes/embc-2026.md` — Actual ride data for the EMBC trip
- `backend/app/models.py` — SQLModel schemas
- `backend/app/routes/` — FastAPI route modules
- `frontend/src/pages/RideView.tsx` — Main ride view page
- `frontend/src/components/RideMap.tsx` — Mapbox map component
- `DEPLOY.md` — Fly.io deployment guide

## Conventions

- Python: type hints everywhere, async endpoints, Pydantic validation
- API: REST, JSON, versioned under `/api/v1/`
- Distances in miles, coordinates as float (lat, lng)
- Frontend: functional React, TypeScript strict, Tailwind
- Migrations: Alembic — always create migration for model changes

## Current State

Backend and frontend are functional with core routes implemented:
- Rides, Days, Stops, Legs, POIs, Highlights, Photos, Export, Auth
- Frontend has map view, day selector, stop cards, export bar, photo gallery
- Deployed to Fly.io (PostgreSQL, NGINX proxy)
- Some unstaged changes in working directory (see git status)

## What Needs Work

See TASKS.md for the ordered build list. Key areas:
- Offline support (service worker, IndexedDB cache)
- Native app packaging (Capacitor)
- Real-time features (WebSocket for live location sharing)
- Admin panel (ride builder UI)
- POI auto-population refinement
- Photo EXIF processing pipeline
- Push notifications for ride updates

## Dev Workflow

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev  # port 5173

# Database
# PostgreSQL must be running with PostGIS extension
alembic upgrade head  # from backend/
```

## Testing

Run backend tests with pytest from the backend directory. Frontend currently has no test suite.
