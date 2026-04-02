import logging
import os
from pathlib import Path


def load_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


load_env()


def parse_allowed_origins() -> list[str]:
    configured_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
    if configured_origins:
        return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]

    default_origins = ["http://localhost:5173"]
    deployed_frontend = os.getenv("FRONTEND_APP_URL", "").strip()
    if deployed_frontend:
        default_origins.append(deployed_frontend)
    return default_origins

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.init import initialize_database
from db.seed import seed_data
from routes.dashboard import router as dashboard_router
from routes.inventory import router as inventory_router
from routes.job_cards import router as job_cards_router
from routes.mock import router as mock_router
from routes.sales import router as sales_router
from routes.technicians import router as technicians_router
from routes.vehicles import router as vehicles_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
initialize_database()

app = FastAPI(
    title="Popular Mega Motors Workshop DMS Demo",
    version="1.0.0",
    description="Full-stack dealership workshop demo with mocked extraction and operational workflow rules.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(os.getenv("UPLOAD_DIR", "./uploads"))
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.on_event("startup")
def startup_seed() -> None:
    logging.getLogger("workshop_dms.startup").info(
        "Gemini enabled: %s | OpenRouter key present: %s | Mail service configured: %s | Mail service secret present: %s",
        os.getenv("USE_GEMINI_AI", "true").lower() == "true",
        bool(os.getenv("OPENROUTER_API_KEY", "").strip()),
        bool(os.getenv("MAIL_SERVICE_URL", "").strip()),
        bool(os.getenv("MAIL_SERVICE_SECRET", "").strip()),
    )
    if os.getenv("AUTO_SEED", "true").lower() == "true":
        seed_data()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(mock_router)
app.include_router(vehicles_router)
app.include_router(job_cards_router)
app.include_router(technicians_router)
app.include_router(inventory_router)
app.include_router(dashboard_router)
app.include_router(sales_router)
