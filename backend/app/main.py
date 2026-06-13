from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, SessionLocal, Base
from app.api import auth, candidates, jobs, users, analytics

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Redrob TalentAI API",
    description="Enterprise candidate ranking and talent intelligence platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.on_event("startup")
def startup():
    from app.services.seed import run_seed
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "redrob-api", "version": "1.0.0"}
