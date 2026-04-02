from fastapi import APIRouter

from db.database import db_cursor


router = APIRouter(prefix="/api/technicians", tags=["technicians"])


@router.get("")
def get_technicians():
    with db_cursor() as conn:
        return {"items": [dict(row) for row in conn.execute("SELECT * FROM technicians WHERE active = 1 ORDER BY availability_status, specialization, name").fetchall()]}
