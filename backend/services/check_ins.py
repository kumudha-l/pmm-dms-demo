from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException

from .job_cards import get_vehicle_with_customer
from .logger import get_logger


logger = get_logger("check_ins")


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def generate_check_in_no(conn) -> str:
    rows = conn.execute("SELECT check_in_no FROM service_checkins WHERE check_in_no LIKE 'CHK-2026-%'").fetchall()
    max_suffix = 0
    for row in rows:
      try:
        max_suffix = max(max_suffix, int(str(row["check_in_no"]).split("-")[-1]))
      except (ValueError, IndexError):
        continue
    return f"CHK-2026-{max_suffix + 1:04d}"


def get_check_in_detail(conn, check_in_id: str) -> dict:
    row = conn.execute("SELECT * FROM service_checkins WHERE id = ? OR check_in_no = ?", (check_in_id, check_in_id)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Check-in not found.")
    return dict(row)


def list_check_ins(conn, limit: int = 10) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM service_checkins ORDER BY created_at DESC LIMIT ?",
        (max(1, min(limit, 50)),),
    ).fetchall()
    return [dict(row) for row in rows]


def create_check_in(conn, payload: dict) -> dict:
    reg_no = str(payload.get("reg_no", "")).strip().upper()
    if not reg_no:
        raise HTTPException(status_code=400, detail="Registration number is required.")

    vehicle = get_vehicle_with_customer(conn, reg_no)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for registration number.")

    check_in_id = f"chk_{uuid4().hex[:10]}"
    created_at = now_iso()
    conn.execute(
        """
        INSERT INTO service_checkins (
          id, check_in_no, customer_name, phone, email, address, reg_no, make, model, variant,
          current_km, opening_km, appointment_status, appointment_date, appointment_time,
          purpose_of_visit, advisor_name, notes, pdf_path, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            check_in_id,
            generate_check_in_no(conn),
            vehicle["customer_name"],
            vehicle.get("customer_phone"),
            vehicle.get("customer_email"),
            vehicle.get("customer_address"),
            vehicle["reg_no"],
            vehicle["make"],
            vehicle["model"],
            vehicle["variant"],
            int(vehicle.get("current_km") or 0),
            int(payload.get("opening_km") or 0),
            payload.get("appointment_status", "Appointment Confirmed"),
            payload["appointment_date"],
            payload["appointment_time"],
            payload["purpose_of_visit"],
            payload["advisor_name"],
            payload.get("notes", ""),
            "",
            created_at,
        ),
    )
    logger.info("Check-in created successfully for %s as %s.", reg_no, check_in_id)
    return get_check_in_detail(conn, check_in_id)


def attach_check_in_pdf_path(conn, check_in_id: str, pdf_path: str) -> dict:
    conn.execute("UPDATE service_checkins SET pdf_path = ? WHERE id = ?", (pdf_path, check_in_id))
    return get_check_in_detail(conn, check_in_id)
