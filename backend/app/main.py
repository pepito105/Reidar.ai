import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.init_db import init_db
from app.api.routes import firm_profile, startups, pipeline, market_map, signals, chat, scrape
from app.services.scheduler import start_scheduler, run_startup_check, scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Radar backend starting...")
    await init_db()
    logger.info("Database ready")
    start_scheduler()
    asyncio.create_task(run_startup_check())
    yield
    scheduler.shutdown(wait=False)
    logger.info("Radar backend shutting down")


app = FastAPI(
    title="Radar API",
    description="AI investment associate for VC firms",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://zestful-creativity-production.up.railway.app", "https://reidar.ai", "https://www.reidar.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(firm_profile.router, prefix="/api")
app.include_router(startups.router, prefix="/api")
app.include_router(pipeline.router, prefix="/api")
app.include_router(market_map.router, prefix="/api")
app.include_router(signals.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
from app.api.routes.memo import router as memo_router
app.include_router(memo_router, prefix="/api")
from app.api.routes.associate import router as associate_router
app.include_router(associate_router, prefix="/api")
from app.api.routes.notifications import router as notifications_router
app.include_router(notifications_router, prefix="/api")
from app.api.routes.activity import router as activity_router
app.include_router(activity_router, prefix="/api")
from app.api.routes.sourcing import router as sourcing_router
app.include_router(sourcing_router, prefix="/api")
from app.api.routes.waitlist import router as waitlist_router
app.include_router(waitlist_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/")
async def root():
    return {"name": "Radar API", "status": "running", "docs": "/docs"}
