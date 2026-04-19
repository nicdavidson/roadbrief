# RoadBrief

Group ride planning and route-sharing platform for organized motorcycle rides.

**Not a navigation app.** It's the planning layer above navigation — the digital trip binder. Organizer builds the route plan, shares it with riders, riders export legs to Google Maps / Beeline / Calimoto for actual turn-by-turn.

## First Use Case
Eastern Montana Bible Camp (EMBC) Ride 2026 — 4-day ride from Glendive MT through the Black Hills and back.

## Tech Stack
- **Backend:** Python, FastAPI, SQLModel (SQLAlchemy), PostgreSQL + PostGIS
- **Frontend:** React (Vite), TypeScript, Mapbox GL JS
- **Auth:** JWT, three tiers (anonymous, local-name, full account)
- **Photos:** Cloudflare R2
- **Hosting:** Fly.io (prod), local dev server (dev)
- **Native:** Capacitor (PWA → App Store / Play Store)

## Directory Structure
```
roadbrief/
├── README.md
├── SPEC.md              # Full product spec (reference)
├── TASKS.md             # Ordered build tasks
├── specs/               # Focused spec files (for task execution)
│   ├── data-model.md
│   ├── api.md
│   ├── frontend.md
│   ├── auth.md
│   └── offline.md
├── routes/
│   └── embc-2026.md     # EMBC ride route data
├── backend/             # FastAPI app
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── routes/
│   │   ├── services/
│   │   └── config.py
│   ├── requirements.txt
│   └── alembic/
└── frontend/            # React app
    ├── src/
    ├── package.json
    └── vite.config.ts
```

## Key Conventions
- Python: type hints everywhere, async endpoints, Pydantic for validation
- API: REST, JSON, versioned under `/api/v1/`
- Models: SQLModel (combines SQLAlchemy + Pydantic)
- Migrations: Alembic
- Frontend: functional React components, TypeScript strict mode
- CSS: Tailwind
- All distances in miles, coordinates as float (lat, lng)
