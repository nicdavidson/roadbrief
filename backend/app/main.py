from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# CORS: restrict to known frontend origins
FRONTEND_URLS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:8000",  # Backend serving frontend (dev)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
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
