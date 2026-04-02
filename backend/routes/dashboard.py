from fastapi import APIRouter

from db.database import db_cursor
from services.dashboard import get_dashboard_summary


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary():
    with db_cursor() as conn:
        return get_dashboard_summary(conn)
