import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "db" / "workshop_dms.sqlite"
DB_PATH = Path(os.getenv("DB_PATH", str(DEFAULT_DB_PATH)))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
PDF_OUTPUT_DIR = Path(os.getenv("PDF_OUTPUT_DIR", str(BASE_DIR / "generated_pdfs")))
USE_GEMINI_AI = os.getenv("USE_GEMINI_AI", "true").lower() == "true"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "google/gemini-2.5-flash").strip()
GEMINI_TIMEOUT_SECS = float(os.getenv("GEMINI_TIMEOUT_SECS", "12"))
MAIL_SERVICE_URL = os.getenv("MAIL_SERVICE_URL", "").strip()
MAIL_SERVICE_SECRET = os.getenv("MAIL_SERVICE_SECRET", "").strip()
MAIL_SERVICE_TIMEOUT_SECS = float(os.getenv("MAIL_SERVICE_TIMEOUT_SECS", "20"))
FEEDBACK_FORM_URL = os.getenv("FEEDBACK_FORM_URL", "").strip()
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


def ensure_runtime_dirs() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_runtime_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = MEMORY;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


@contextmanager
def db_cursor():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
