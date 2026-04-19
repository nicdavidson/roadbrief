# RoadBrief — fly.io Deployment Guide

## Prerequisites

- [fly.io](https://fly.io) account with `flyctl` installed and authenticated
- Mapbox token (free tier at [mapbox.com](https://www.mapbox.com))

## Architecture

```
fly.io
├── roadbrief-api  (FastAPI + PostgreSQL) — port 8000
└── roadbrief-web  (React/NGINX)          — port 80
```

The frontend serves static files and proxies `/api/*` requests to the backend via fly.io internal DNS (`roadbrief-api.internal`).

## Step 1 — Create PostgreSQL Database

```bash
fly postgres create --name roadbrief-db --region us-montana --size shared-cpu-1x
```

This provisions a managed PostgreSQL database. fly.io sets the `DATABASE_URL` env var automatically — no manual config needed.

## Step 2 — Deploy Backend API

```bash
cd backend

# Create the app (replace with your desired name)
fly apps create roadbrief-api --region us-montana

# Set environment variables (JWT_SECRET must be a strong random string)
fly secrets set JWT_SECRET=$(openssl rand -hex 32) MAPBOX_TOKEN=your_mapbox_token

# Deploy (runs migrations automatically via entrypoint.sh)
fly deploy --build-only
```

The `entrypoint.sh` script runs Alembic migrations on startup. If you need to seed data, run:

```bash
fly ssh console --app roadbrief-api --command "python seed.py"
```

## Step 3 — Deploy Frontend Web App

```bash
cd ../frontend

# Create the app (replace with your desired name)
fly apps create roadbrief-web --region us-montana

# Set environment variables (Mapbox token only — API is proxied)
fly secrets set VITE_MAPBOX_TOKEN=your_mapbox_token

# Deploy
fly deploy --build-only
```

## Step 4 — Set Up Domains (optional)

```bash
# Add a custom domain to the frontend app
fly domains create roadbrief-web --domain yourdomain.com

# Or use the auto-assigned fly.io subdomain
# e.g., https://roadbrief-web.fly.dev
```

## Environment Variables Reference

### Backend (`backend/.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (prod) | Set automatically by fly.io PostgreSQL addon. Override with your own if needed. |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens. Generate with `openssl rand -hex 32`. |
| `MAPBOX_TOKEN` | No | Mapbox token for map rendering. Can also be set on the frontend directly. |

### Frontend (`frontend/.env.example`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox token for map rendering. |

## Deployment Architecture Notes

- **Backend**: Python 3.12 slim → uvicorn on port 8000. Entry script runs Alembic migrations before starting the server.
- **Frontend**: Multi-stage build — Node 20 compiles React, then nginx serves static files and proxies `/api/*` to `roadbrief-api.internal`.
- **Database**: fly.io managed PostgreSQL. Connection string is injected as `DATABASE_URL` automatically.
- **Scaling**: Both apps use `shared-cpu-1x` (256MB backend, 128MB frontend). Increase in `fly.toml` if needed.
- **Strategy**: Canary deployment with max 1 unavailable instance — zero-downtime deploys.

## Troubleshooting

### Backend won't start
```bash
fly logs --app roadbrief-api
```
Check that `DATABASE_URL` is set (it should be auto-set by the PostgreSQL addon).

### Frontend can't reach API
Verify the backend app name matches `roadbrief-api` in `nginx.conf`:
```nginx
set $backend "roadbrief-api.internal";  # must match your backend app name
```

### Database migration errors
```bash
fly ssh console --app roadbrief-api
python -c "from alembic.config import Config; from alembic import command; command.upgrade(Config('alembic.ini'), 'head')"
```
