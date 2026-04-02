from fastapi import APIRouter, HTTPException

from db.database import db_cursor
from services.job_cards import get_vehicle_with_customer


router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])


@router.get("/{reg_no}")
def get_vehicle(reg_no: str):
    with db_cursor() as conn:
        vehicle = get_vehicle_with_customer(conn, reg_no)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found.")
        vehicle["serviceVisitCount"] = conn.execute("SELECT COUNT(*) FROM service_history WHERE vehicle_id = ?", (vehicle["id"],)).fetchone()[0]
        vehicle["repeatComplaintIndicator"] = conn.execute("SELECT COUNT(*) FROM service_history WHERE vehicle_id = ? AND LOWER(complaint_summary) LIKE '%repeat%'", (vehicle["id"],)).fetchone()[0] > 0
        vehicle["previousComplaints"] = [dict(row) for row in conn.execute("SELECT complaint_summary, service_date FROM service_history WHERE vehicle_id = ? ORDER BY service_date DESC LIMIT 5", (vehicle["id"],)).fetchall()]
        return vehicle


@router.get("/{reg_no}/history")
def get_vehicle_history(reg_no: str):
    with db_cursor() as conn:
        vehicle = get_vehicle_with_customer(conn, reg_no)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found.")
        return {
            "vehicle": vehicle,
            "serviceHistory": [dict(row) for row in conn.execute("SELECT service_date, service_type, complaint_summary, work_done, amount_paid, service_number, advisor_name FROM service_history WHERE vehicle_id = ? ORDER BY service_date DESC", (vehicle["id"],)).fetchall()],
            "paymentHistory": [dict(row) for row in conn.execute("SELECT p.payment_ref, p.amount, p.payment_method, p.paid_at, p.notes, jc.job_card_no FROM payments p JOIN job_cards jc ON jc.id = p.job_card_id WHERE jc.vehicle_id = ? ORDER BY p.paid_at DESC", (vehicle["id"],)).fetchall()],
        }
