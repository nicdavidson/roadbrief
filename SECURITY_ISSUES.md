# RoadBrief Security Issues

Last reviewed: 2026-04-18
Status: Critical/High fixes applied, remaining items below.

---

## Fixed (applied 2026-04-18)

### C1. Hardcoded JWT secret -- FIXED
**File:** `backend/app/config.py`
- Made `JWT_SECRET` a required env var with no default. Startup fails if missing or equals placeholder.

### C2. CORS allows all origins with credentials -- FIXED
**File:** `backend/app/main.py`
- Restricted to known frontend origins: `http://localhost:5173`, `http://localhost:8000`
- Replaced `allow_headers=["*"]` with specific headers: Authorization, Content-Type, Accept, X-Requested-With

### C3. Photos route broken imports -- FIXED
**File:** `backend/app/routes/photos.py`
- Rewrote with correct imports, UUID-based filenames, extension whitelist (JPEG/PNG/WebP), path traversal protection.

### C4. Path traversal via file upload -- FIXED
**File:** `backend/app/routes/photos.py`
- Uses absolute paths with explicit base directory. Resolved path validated to stay within UPLOADS_DIR.

### C5. No rate limiting on auth endpoints -- FIXED
**File:** `backend/app/routes/auth.py`
- Login/register limited to 5 attempts per 5 minutes (IP-based, in-memory). Returns HTTP 429 when exceeded.
- Failed attempts recorded for rate limiting; successful logins do not count against the limit.

### H4. No input validation on freeform text fields -- FIXED
**File:** All route files
- Added `_sanitize_text()` helper to all routes: strips control characters, enforces length limits.
- auth.py: display_name (100 chars), email (254 chars), identifier (255 chars)
- rides.py: name (200 chars), description (5000 chars)
- days.py: title (200 chars), notes (5000 chars)
- highlights.py: title (200 chars), body (10000 chars)
- stops.py: name (200 chars), batch create limited to 50 items
- pois.py: name (200 chars)
- riders.py: display_name (100 chars), email (254 chars)
- export.py: filename sanitization for Content-Disposition headers

### M5. No password strength requirements -- FIXED
**File:** `backend/app/routes/auth.py`
- Minimum 8 characters enforced on registration.

---

## Remaining Critical (fix before production)

### C6. No ownership validation on ride/day operations
**File:** `backend/app/routes/rides.py:121`, `backend/app/routes/days.py:41`

Any admin can modify any ride, even rides they didn't create and aren't assigned to. The `require_admin` check is too broad -- it should also verify the rider has a relationship to this ride (created_by or RideRider entry).

**Fix:** Add ownership check: verify `rider.id == ride.created_by` or rider is in the RideRider table for that ride.

### C7. Public endpoints expose full nested data without auth
**File:** `backend/app/routes/rides.py:112`, `backend/app/routes/export.py`

Anyone with a valid share_code gets the full ride including all days, stops (with lat/lng), POIs (with phone numbers, ratings), and highlights. This is fine for a public ride viewer but:
- No rate limiting on these endpoints
- Draft rides are still queryable by share_code (the `publish` endpoint generates the code, but a ride can be created with `share_code="embc2026"` directly in seed)
- No check that the ride is `published` before serving publicly

**Fix:** Add a `published_only=True` flag to public endpoints, or skip them entirely for draft rides.

### C8. No Content-Security-Policy or security headers
**File:** `backend/app/main.py`

No middleware sets security headers (CSP, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).

**Fix:** Add a security headers middleware. Example:
```python
from fastapi.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
```

---

## Remaining High Priority (fix before production)

### H1. OSRM public demo endpoint -- no caching, abuse vector
**File:** `backend/app/services/routing.py:30`

Calls the free public OSRM demo server with no caching. A single day with 20 stops = 19 sequential API calls, ~20 seconds. Can be triggered repeatedly by any admin user.

**Fix:** Check if legs already exist before calling OSRM (the `generate_legs` endpoint already deletes existing legs, but there's no caching of the OSRM response). Consider a private OSRM instance or caching results by (start_lat, start_lng, end_lat, end_lng).

### H2. Share code entropy is weak
**File:** `backend/app/routes/rides.py:101`

```python
share_code=secrets.token_urlsafe(8)  # 8 bytes = ~53 bits
```

For a public URL parameter, this is vulnerable to brute-force enumeration. The seed script also hardcodes `share_code="embc2026"`.

**Fix:** Use 16+ bytes: `secrets.token_urlsafe(16)`. Remove hardcoded share codes from seed data.

### H3. Frontend TypeScript types don't match backend
**File:** `frontend/src/types.ts:113-129`

`RiderProfile` has `username` -- backend returns `display_name`.
`UpdateProfileRequest` has `bio`, `motorcycle_type`, `riding_experience` -- backend `/me` accepts `display_name`, `profile_photo_url`, `motorcycle`.

This mismatch will cause runtime errors or silent data loss.

**Fix:** Align frontend types with actual backend response shapes.

---

## Remaining Medium Priority

### M1. Database engine has `echo=True` in production
**File:** `backend/app/database.py:4`

Logs all SQL queries (including parameters with user data) to stdout. Exposes query patterns and potentially sensitive data in server logs.

**Fix:** Only enable `echo=True` when a debug env var is set (e.g., `DEBUG=true`).

### M2. No audit logging
**File:** All routes

No logging of who performed which action (create ride, publish, delete). For a multi-rider system with admin/leader roles, this is critical for accountability.

**Fix:** Add audit log entries on all write operations (CREATE, UPDATE, DELETE).

### M3. No request size limits on file uploads
The photos route checks 10MB but doesn't set a global request body limit.

**Fix:** Add `max_request_size` middleware or configure uvicorn's `limit_concurrency`.

### M4. No HTTPS enforcement
If deployed behind a reverse proxy, ensure `X-Forwarded-Proto` is respected.

### M5. No API versioning deprecation policy
Currently `/api/v1/` -- good start, but no deprecation policy for old versions.

---

## Rate Limiting Details (applied)

- **Auth endpoints** (`/register`, `/login`): 5 requests per IP per 5-minute window
- **Implementation**: In-memory dict (key: `ip_address` -> list of timestamps)
- **Production note**: Replace with Redis-based rate limiting (e.g., `slowapi` + Redis) for multi-instance deployments on fly.io
- **IP extraction**: Respects `X-Forwarded-For` header (for fly.io proxy)

---

## Input Validation Summary (applied)

All text inputs now pass through `_sanitize_text()`:
- Strips control characters (0x00-0x1F)
- Enforces per-field length limits
- Applied to: auth (display_name, email, identifier), rides (name, description), days (title, notes), highlights (title, body), stops (name), pois (name), riders (display_name, email), export (filename)

---

## .env Template (for local testing)

```bash
# Required
DATABASE_URL=sqlite:///./roadbrief.db
JWT_SECRET=*** with: python -c "import secrets; print(secrets.token_urlsafe(32))"

# Optional
MAPBOX_TOKEN=***
```

For fly.io deployment, these would be set as secrets via `fly secrets set`.

---

## Auth Model (as discussed)

The system has 3 authentication tiers + role-based permissions:

| Tier | auth_type | Description |
|------|-----------|-------------|
| 1 | `anonymous` | No account, no token. Read-only access to published rides via share_code. |
| 2 | `local` | Display name only, no password. Can create rides (as admin), manage content. |
| 3 | `account` | Email + password. Full account features, password reset capability. |

| Role | Permissions |
|------|-------------|
| `admin` | Full CRUD on rides they create or are assigned to. Can publish, delete, manage all content. |
| `leader` | Create/manage "groups" within a ride (like chat rooms). Manage stops/legs/highlights for their group. |
| `rider` | View rides, upload photos, join groups. Read-only on ride content unless in a group they lead. |

**Current gap:** Most routes only check `require_admin`. Leader and rider permissions are not implemented yet. This is expected -- auth is marked as "complete" but authorization (per-resource permission checks) needs work.
