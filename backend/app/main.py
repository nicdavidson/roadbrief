import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import engine
from app.routes.auth import router as auth_router
from app.routes.riders import router as riders_router
from app.routes.rides import router as rides_router
from app.routes.days import router as days_router
from app.routes.stops import router as stops_router
from app.routes.legs import router as legs_router
from app.routes.pois import router as pois_router
from app.routes.highlights import router as highlights_router
from app.routes.export import router as export_router
from app.routes.photos import router as photos_router

app = FastAPI(title="RoadBrief API", version="0.1.0")


# ─── Security headers middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(self), microphone=()"
        if os.environ.get("ROADBRIEF_ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# ─── CORS ────���───────────────────────────────���────────────────────────────────
FRONTEND_URLS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:8000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[u.strip() for u in FRONTEND_URLS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "X-Requested-With",
    ],
)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(riders_router)
app.include_router(rides_router)
app.include_router(days_router)
app.include_router(stops_router)
app.include_router(legs_router)
app.include_router(pois_router)
app.include_router(highlights_router)
app.include_router(export_router)
app.include_router(photos_router, prefix="/api/v1", tags=["photos"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
