import json
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException

from .assignments import validate_assignments
from .estimates import calculate_estimate
from .logger import get_logger
from .notifications import log_payment_notifications


logger = get_logger("job_cards")


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def _row(row):
    return dict(row) if row else None


def default_checklist_for_assignment(assignment_type: str, assigned_task: str) -> list[dict]:
    if assignment_type == "General":
        return [
            {"label": "Start job", "done": False},
            {"label": "Initial inspection", "done": False},
            {"label": "Update work status", "done": False},
            {"label": "Road test and closure check", "done": False},
        ]
    return [
        {"label": f"Diagnose {assigned_task}", "done": False},
        {"label": "Perform repair", "done": False},
        {"label": "Confirm completion", "done": False},
    ]


def derive_task_status(tasks: list[dict]) -> str:
    if not tasks or not any(task.get("done") for task in tasks):
        return "Pending"
    if all(task.get("done") for task in tasks):
        return "Completed"
    return "In Progress"


def generate_job_card_no(conn) -> str:
    rows = conn.execute("SELECT job_card_no FROM job_cards WHERE job_card_no LIKE 'JC-2026-%'").fetchall()
    max_suffix = 0
    for row in rows:
        try:
            max_suffix = max(max_suffix, int(str(row["job_card_no"]).split("-")[-1]))
        except (ValueError, IndexError):
            continue
    return f"JC-2026-{max_suffix + 1:04d}"


def resolve_job_card_id(conn, ref: str) -> str:
    row = conn.execute("SELECT id FROM job_cards WHERE id = ? OR job_card_no = ?", (ref, ref)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job card not found.")
    return row["id"]


def get_vehicle_with_customer(conn, reg_no: str):
    logger.info("Vehicle lookup started for reg no %s.", reg_no)
    row = conn.execute(
        """
        SELECT v.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
               c.address AS customer_address, c.customer_code, c.customer_type
        FROM vehicles v
        JOIN customers c ON c.id = v.customer_id
        WHERE UPPER(v.reg_no) = UPPER(?)
        """,
        (reg_no,),
    ).fetchone()
    logger.info("Vehicle lookup %s for reg no %s.", "hit" if row else "miss", reg_no)
    return _row(row)


def persist_services_and_parts(conn, job_card_id: str, selected_services: list[dict], selected_parts: list[dict]) -> None:
    conn.execute("DELETE FROM job_card_services WHERE job_card_id = ?", (job_card_id,))
    conn.execute("DELETE FROM job_card_parts WHERE job_card_id = ?", (job_card_id,))
    for item in selected_services:
        conn.execute(
            "INSERT INTO job_card_services (id, job_card_id, service_catalog_id, service_name, quantity, unit_cost, total_cost, source_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"jcs_{uuid4().hex[:10]}",
                job_card_id,
                item.get("service_catalog_id"),
                item["service_name"],
                int(item.get("quantity", 1)),
                float(item.get("unit_cost", 0)),
                float(item.get("total_cost", item.get("unit_cost", 0) * item.get("quantity", 1))),
                item.get("source_type", "Suggested Services"),
            ),
        )
    for item in selected_parts:
        conn.execute(
            "INSERT INTO job_card_parts (id, job_card_id, inventory_id, part_name, quantity, unit_price, total_price, availability_status, source_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"jcp_{uuid4().hex[:10]}",
                job_card_id,
                item.get("inventory_id"),
                item["part_name"],
                int(item.get("quantity", 1)),
                float(item.get("unit_price", 0)),
                float(item.get("total_price", item.get("unit_price", 0) * item.get("quantity", 1))),
                item.get("availability_status", "In Stock"),
                item.get("source_location", "Main Store"),
            ),
        )


def normalize_services_and_parts(conn, selected_services: list[dict], selected_parts: list[dict]) -> tuple[list[dict], list[dict]]:
    normalized_services = []
    for item in selected_services:
        service_catalog_id = item.get("service_catalog_id")
        if service_catalog_id:
            row = conn.execute("SELECT service_name, labor_cost, estimated_time_mins FROM service_catalog WHERE id = ?", (service_catalog_id,)).fetchone()
            if row:
                normalized_services.append({
                    **item,
                    "service_name": row["service_name"],
                    "unit_cost": row["labor_cost"],
                    "total_cost": row["labor_cost"] * int(item.get("quantity", 1)),
                    "estimated_time_mins": row["estimated_time_mins"],
                })
                continue
        normalized_services.append(item)

    normalized_parts = []
    for item in selected_parts:
        inventory_id = item.get("inventory_id")
        if inventory_id:
            row = conn.execute("SELECT part_name, unit_price, source_location, stock_qty, reorder_level FROM inventory WHERE id = ?", (inventory_id,)).fetchone()
            if row:
                availability = item.get("availability_status", "In Stock")
                normalized_parts.append({
                    **item,
                    "part_name": row["part_name"],
                    "unit_price": row["unit_price"],
                    "total_price": row["unit_price"] * int(item.get("quantity", 1)),
                    "source_location": row["source_location"],
                    "availability_status": availability,
                })
                continue
        normalized_parts.append(item)
    return normalized_services, normalized_parts


def get_job_card_detail(conn, job_card_ref: str) -> dict:
    logger.info("Job card detail lookup started for %s.", job_card_ref)
    job_card_id = resolve_job_card_id(conn, job_card_ref)
    header = conn.execute(
        """
        SELECT jc.*, v.reg_no, v.make, v.model, v.variant, v.fuel_type, v.transmission, v.current_km,
               v.chassis_no, v.engine_no, c.name AS customer_name, c.phone, c.email, c.address, c.customer_type
        FROM job_cards jc
        JOIN vehicles v ON v.id = jc.vehicle_id
        JOIN customers c ON c.id = jc.customer_id
        WHERE jc.id = ?
        """,
        (job_card_id,),
    ).fetchone()
    if not header:
        raise HTTPException(status_code=404, detail="Job card not found.")
    detail = dict(header)
    detail["ai_parsed_issues"] = json.loads(detail["ai_parsed_issues"] or "[]")
    detail["services"] = [dict(row) for row in conn.execute("SELECT * FROM job_card_services WHERE job_card_id = ?", (job_card_id,)).fetchall()]
    detail["parts"] = [dict(row) for row in conn.execute("SELECT * FROM job_card_parts WHERE job_card_id = ?", (job_card_id,)).fetchall()]
    detail["technicians"] = [
        dict(row)
        for row in conn.execute(
            "SELECT jct.*, t.name, t.specialization, t.bay_no FROM job_card_technicians jct JOIN technicians t ON t.id = jct.technician_id WHERE jct.job_card_id = ?",
            (job_card_id,),
        ).fetchall()
    ]
    detail["payments"] = [dict(row) for row in conn.execute("SELECT * FROM payments WHERE job_card_id = ? ORDER BY paid_at DESC", (job_card_id,)).fetchall()]
    detail["notifications"] = [dict(row) for row in conn.execute("SELECT * FROM notifications WHERE job_card_id = ? ORDER BY triggered_at DESC", (job_card_id,)).fetchall()]
    detail["serviceHistory"] = [
        dict(row)
        for row in conn.execute(
            "SELECT service_date, service_type, complaint_summary, work_done, amount_paid, service_number, advisor_name FROM service_history WHERE vehicle_id = ? ORDER BY service_date DESC",
            (detail["vehicle_id"],),
        ).fetchall()
    ]
    logger.info("Job card detail loaded for %s.", detail["job_card_no"])
    return detail


def recompute_job_card_estimate(conn, job_card_id: str, selected_services: list[dict], selected_parts: list[dict], addon_total: float, discount_amount: float) -> dict:
    logger.info("Estimate recompute started for %s with %s services and %s parts.", job_card_id, len(selected_services), len(selected_parts))
    selected_services, selected_parts = normalize_services_and_parts(conn, selected_services, selected_parts)
    estimate = calculate_estimate(selected_services, selected_parts, addon_total, discount_amount)
    persist_services_and_parts(conn, job_card_id, selected_services, selected_parts)
    conn.execute(
        "UPDATE job_cards SET estimated_cost = ?, final_cost = ?, discount_amount = ?, addon_total = ?, gst_amount = ?, status = ?, estimated_delivery_at = ?, updated_at = ? WHERE id = ?",
        (
            estimate["grandTotal"],
            estimate["grandTotal"],
            discount_amount,
            addon_total,
            estimate["gstAmount"],
            "Estimate Prepared" if estimate["grandTotal"] > 0 else "Draft",
            (datetime.utcnow() + timedelta(minutes=estimate["etaMins"])).isoformat(),
            now_iso(),
            job_card_id,
        ),
    )
    logger.info("Estimate recompute completed for %s. Grand total: %s.", job_card_id, estimate["grandTotal"])
    return estimate


def create_job_card(conn, payload: dict) -> dict:
    logger.info("Job card create started for reg no %s.", payload["reg_no"])
    if not str(payload.get("reg_no", "")).strip():
        logger.warning("Job card create blocked because reg no is blank.")
        raise HTTPException(status_code=400, detail="Registration number is required before creating a job card.")
    vehicle = get_vehicle_with_customer(conn, payload["reg_no"])
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for registration number.")
    jc_id = f"jc_{uuid4().hex[:10]}"
    selected_services, selected_parts = normalize_services_and_parts(conn, payload.get("selected_services", []), payload.get("selected_parts", []))
    estimate = calculate_estimate(selected_services, selected_parts, payload.get("addon_total", 0), payload.get("discount_amount", 0))
    timestamp = now_iso()
    conn.execute(
        """
        INSERT INTO job_cards (id, job_card_no, vehicle_id, customer_id, advisor_name, opening_km, complaint_text, ai_parsed_issues, advisor_observations,
        suggested_repairs, estimated_cost, final_cost, discount_amount, addon_total, gst_amount, approval_status, payment_status, status,
        service_type, complaint_source, repeat_complaint, typed_acknowledgement, signature_data_url, bay_no, estimated_delivery_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            jc_id,
            generate_job_card_no(conn),
            vehicle["id"],
            vehicle["customer_id"],
            payload["advisor_name"],
            payload["opening_km"],
            payload.get("complaint_text", ""),
            json.dumps(payload.get("ai_parsed_issues", [])),
            payload.get("advisor_observations", ""),
            payload.get("suggested_repairs", ""),
            estimate["grandTotal"],
            estimate["grandTotal"],
            payload.get("discount_amount", 0),
            payload.get("addon_total", 0),
            estimate["gstAmount"],
            payload.get("approval_status", "Pending"),
            "Unpaid",
            "Estimate Prepared" if estimate["grandTotal"] > 0 else payload.get("status", "Draft"),
            payload.get("service_type"),
            payload.get("complaint_source"),
            1 if payload.get("repeat_complaint") else 0,
            payload.get("typed_acknowledgement", ""),
            payload.get("signature_data_url", ""),
            payload.get("bay_no", ""),
            (datetime.utcnow() + timedelta(minutes=estimate["etaMins"])).isoformat(),
            timestamp,
            timestamp,
        ),
    )
    persist_services_and_parts(conn, jc_id, selected_services, selected_parts)
    logger.info("Job card created successfully: %s.", jc_id)
    return get_job_card_detail(conn, jc_id)


def update_job_card(conn, job_card_id: str, payload: dict) -> dict:
    logger.info("Job card update started for %s.", job_card_id)
    existing = get_job_card_detail(conn, job_card_id)
    services = payload.get("selected_services", existing["services"])
    parts = payload.get("selected_parts", existing["parts"])
    addon_total = payload.get("addon_total", existing["addon_total"])
    discount_amount = payload.get("discount_amount", existing["discount_amount"])
    recompute_job_card_estimate(conn, job_card_id, services, parts, addon_total, discount_amount)

    new_status = payload.get("status", existing["status"])
    approval_status = payload.get("approval_status", existing["approval_status"])
    payment_status = payload.get("payment_status", existing["payment_status"])
    if new_status == "Assigned":
        assigned_count = conn.execute("SELECT COUNT(*) FROM job_card_technicians WHERE job_card_id = ?", (job_card_id,)).fetchone()[0]
        if assigned_count <= 0:
            raise HTTPException(status_code=400, detail="Cannot move to Assigned without technician assignment.")
    if new_status == "Paid":
        payments = conn.execute("SELECT COUNT(*) FROM payments WHERE job_card_id = ? AND payment_status = 'Paid'", (job_card_id,)).fetchone()[0]
        if payments <= 0:
            raise HTTPException(status_code=400, detail="Cannot move to Paid without a payment record.")
    if new_status == "Closed" and payment_status != "Paid":
        raise HTTPException(status_code=400, detail="Job card cannot close until payment is marked Paid.")
    conn.execute(
        """
        UPDATE job_cards
        SET advisor_name = ?, opening_km = ?, complaint_text = ?, ai_parsed_issues = ?, advisor_observations = ?, suggested_repairs = ?,
            approval_status = ?, payment_status = ?, status = ?, typed_acknowledgement = ?, signature_data_url = ?, bay_no = ?, estimated_delivery_at = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            payload.get("advisor_name", existing["advisor_name"]),
            payload.get("opening_km", existing["opening_km"]),
            payload.get("complaint_text", existing["complaint_text"]),
            json.dumps(payload.get("ai_parsed_issues", existing["ai_parsed_issues"])),
            payload.get("advisor_observations", existing["advisor_observations"]),
            payload.get("suggested_repairs", existing["suggested_repairs"]),
            approval_status,
            payment_status,
            new_status,
            payload.get("typed_acknowledgement", existing["typed_acknowledgement"]),
            payload.get("signature_data_url", existing["signature_data_url"]),
            payload.get("bay_no", existing["bay_no"]),
            payload.get("estimated_delivery_at", existing["estimated_delivery_at"]),
            now_iso(),
            job_card_id,
        ),
    )
    logger.info("Job card update completed for %s with status %s.", job_card_id, new_status)
    return get_job_card_detail(conn, job_card_id)


def assign_technicians(conn, job_card_id: str, assignments: list[dict], bay_no: str | None) -> dict:
    logger.info("Technician assignment started for %s with %s assignments.", job_card_id, len(assignments))
    tech_rows = {row["id"]: row for row in conn.execute("SELECT * FROM technicians WHERE active = 1").fetchall()}
    valid, message = validate_assignments(assignments, tech_rows)
    if not valid:
        raise HTTPException(status_code=400, detail=message)
    conn.execute("DELETE FROM job_card_technicians WHERE job_card_id = ?", (job_card_id,))
    for assignment in assignments:
        assignment_type = assignment.get("assignment_type", "General")
        assigned_task = assignment.get("assigned_task", "Workshop task")
        checklist = assignment.get("checklist") or default_checklist_for_assignment(assignment_type, assigned_task)
        conn.execute(
            "INSERT INTO job_card_technicians (id, job_card_id, technician_id, assignment_type, assigned_task, task_status, checklist_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                f"jct_{uuid4().hex[:10]}",
                job_card_id,
                assignment["technician_id"],
                assignment_type,
                assigned_task,
                assignment.get("task_status", "Pending"),
                json.dumps(checklist),
            ),
        )
    conn.execute("UPDATE job_cards SET status = 'Assigned', bay_no = COALESCE(?, bay_no), updated_at = ? WHERE id = ?", (bay_no, now_iso(), job_card_id))
    logger.info("Technician assignment completed for %s.", job_card_id)
    return get_job_card_detail(conn, job_card_id)


def update_technician_checklist(conn, job_card_ref: str, assignment_id: str, tasks: list[dict]) -> dict:
    logger.info("Technician checklist update started for %s / %s.", job_card_ref, assignment_id)
    job_card_id = resolve_job_card_id(conn, job_card_ref)
    assignment = conn.execute(
        "SELECT id FROM job_card_technicians WHERE id = ? AND job_card_id = ?",
        (assignment_id, job_card_id),
    ).fetchone()
    if not assignment:
        raise HTTPException(status_code=404, detail="Technician assignment not found.")

    normalized_tasks = [
        {
            "label": str(task.get("label", "")).strip(),
            "done": bool(task.get("done")),
        }
        for task in tasks
        if str(task.get("label", "")).strip()
    ]
    task_status = derive_task_status(normalized_tasks)
    conn.execute(
        "UPDATE job_card_technicians SET checklist_json = ?, task_status = ? WHERE id = ?",
        (json.dumps(normalized_tasks), task_status, assignment_id),
    )

    assignment_rows = conn.execute(
        "SELECT checklist_json FROM job_card_technicians WHERE job_card_id = ?",
        (job_card_id,),
    ).fetchall()
    all_tasks = []
    for row in assignment_rows:
        try:
            all_tasks.extend(json.loads(row["checklist_json"] or "[]"))
        except json.JSONDecodeError:
            continue
    overall_status = "Work Completed" if all_tasks and all(task.get("done") for task in all_tasks) else "In Progress"
    conn.execute(
        "UPDATE job_cards SET status = ?, updated_at = ? WHERE id = ?",
        (overall_status, now_iso(), job_card_id),
    )
    logger.info("Technician checklist update completed for %s / %s.", job_card_ref, assignment_id)
    return get_job_card_detail(conn, job_card_id)


def record_payment(conn, job_card_id: str, amount: float, payment_method: str, payment_ref: str, notes: str) -> dict:
    logger.info("Payment recording started for %s with amount %s.", job_card_id, amount)
    existing = get_job_card_detail(conn, job_card_id)
    conn.execute(
        "INSERT INTO payments (id, job_card_id, payment_ref, amount, payment_method, payment_status, paid_at, notes) VALUES (?, ?, ?, ?, ?, 'Paid', ?, ?)",
        (f"pay_{uuid4().hex[:10]}", job_card_id, payment_ref, amount, payment_method, now_iso(), notes),
    )
    conn.execute("UPDATE job_cards SET payment_status = 'Paid', status = CASE WHEN status = 'Billing In Progress' THEN 'Paid' ELSE status END, updated_at = ? WHERE id = ?", (now_iso(), job_card_id))
    log_payment_notifications(conn, job_card_id, existing["email"], existing["phone"])
    logger.info("Payment recorded successfully for %s.", job_card_id)
    return get_job_card_detail(conn, job_card_id)


def close_job_card(conn, job_card_ref: str) -> dict:
    logger.info("Close flow started for %s.", job_card_ref)
    job_card = get_job_card_detail(conn, job_card_ref)
    if job_card["payment_status"] != "Paid":
        logger.warning("Close flow blocked for %s because payment status is %s.", job_card["job_card_no"], job_card["payment_status"])
        raise HTTPException(status_code=400, detail="Job card cannot close until payment is marked Paid.")
    conn.execute("UPDATE job_cards SET status = 'Closed', updated_at = ? WHERE id = ?", (now_iso(), job_card["id"]))
    logger.info("Close flow passed payment validation for %s and status updated to Closed.", job_card["job_card_no"])
    return get_job_card_detail(conn, job_card["id"])
