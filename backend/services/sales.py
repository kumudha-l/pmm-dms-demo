from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException

from services.logger import get_logger


logger = get_logger("sales")


def _make_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


def _now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def _next_ref(conn, table: str, column: str, prefix: str) -> str:
    current_year = datetime.now().year
    count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0] + 1
    return f"{prefix}-{current_year}-{count:04d}"


def _fetch_optional_row(conn, query: str, params: tuple = ()) -> dict | None:
    row = conn.execute(query, params).fetchone()
    return dict(row) if row else None


def _get_lead_row(conn, lead_id: str) -> dict:
    row = conn.execute("SELECT * FROM sales_leads WHERE id = ?", (lead_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Sales lead not found")
    return dict(row)


def _build_catalog_summary(conn) -> list[dict]:
    grouped = defaultdict(list)
    rows = conn.execute(
        """
        SELECT make, model, variant, ex_showroom_price, road_tax_rate, insurance_rate, addons_cost, handling_cost
        FROM sales_vehicle_catalog
        WHERE active = 1
        ORDER BY model, ex_showroom_price
        """
    ).fetchall()
    for row in rows:
        row_dict = dict(row)
        grouped[row_dict["model"]].append(
            {
                "make": row_dict["make"],
                "variant": row_dict["variant"],
                "ex_showroom_price": row_dict["ex_showroom_price"],
                "road_tax_rate": row_dict["road_tax_rate"],
                "insurance_rate": row_dict["insurance_rate"],
                "addons_cost": row_dict["addons_cost"],
                "handling_cost": row_dict["handling_cost"],
            }
        )
    return [{"make": variants[0]["make"] if variants else "", "model": model, "variants": variants} for model, variants in grouped.items()]


def get_sales_catalog(conn) -> dict:
    locations = sorted(
        {
            row["location"]
            for row in conn.execute("SELECT DISTINCT location FROM sales_vehicle_inventory WHERE active = 1").fetchall()
        }
    )
    return {"models": _build_catalog_summary(conn), "locations": locations}


def _get_availability_rows(conn, model: str) -> list[dict]:
    return [
        dict(row)
        for row in conn.execute(
            """
            SELECT color, variant, units_available, location, eta_label
            FROM sales_vehicle_inventory
            WHERE active = 1 AND model = ?
            ORDER BY units_available DESC, color
            """,
            (model,),
        ).fetchall()
    ]


def _get_lead_detail(conn, lead_id: str) -> dict:
    lead = _get_lead_row(conn, lead_id)
    lead["test_drive"] = _fetch_optional_row(conn, "SELECT * FROM sales_test_drives WHERE lead_id = ?", (lead_id,))
    lead["feedback"] = _fetch_optional_row(conn, "SELECT * FROM sales_feedback WHERE lead_id = ?", (lead_id,))
    lead["estimate"] = _fetch_optional_row(conn, "SELECT * FROM sales_estimates WHERE lead_id = ?", (lead_id,))
    lead["booking"] = _fetch_optional_row(conn, "SELECT * FROM sales_bookings WHERE lead_id = ?", (lead_id,))
    lead["availability"] = _get_availability_rows(conn, lead["interested_model"])
    return lead


def list_sales_leads(conn) -> dict:
    rows = [
        dict(row)
        for row in conn.execute(
            """
            SELECT id, lead_no, customer_name, phone, email, interested_model, interested_variant,
                   showroom_location, enquiry_source, lead_status, current_stage, next_intent,
                   follow_up_date, created_at, updated_at
            FROM sales_leads
            ORDER BY updated_at DESC
            """
        ).fetchall()
    ]
    return {"items": rows, "catalog": get_sales_catalog(conn)}


def get_sales_lead_detail(conn, lead_id: str) -> dict:
    return _get_lead_detail(conn, lead_id)


def create_sales_lead(conn, payload: dict) -> dict:
    now = _now_iso()
    lead_id = _make_id("lead")
    conn.execute(
        """
        INSERT INTO sales_leads (
          id, lead_no, customer_name, phone, email, interested_model, interested_variant,
          showroom_location, enquiry_source, lead_status, current_stage, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            lead_id,
            _next_ref(conn, "sales_leads", "lead_no", "LEAD"),
            payload["customer_name"],
            payload["phone"],
            payload.get("email", ""),
            payload["interested_model"],
            payload.get("interested_variant", ""),
            payload.get("showroom_location", "Kochi Showroom"),
            payload.get("enquiry_source", "Walk-in"),
            payload.get("lead_status", "Enquired"),
            "Enquiry",
            payload.get("notes", ""),
            now,
            now,
        ),
    )
    logger.info("Sales lead created for %s and %s.", payload["customer_name"], payload["interested_model"])
    return _get_lead_detail(conn, lead_id)


def update_sales_lead(conn, lead_id: str, payload: dict) -> dict:
    lead = _get_lead_row(conn, lead_id)
    allowed = {
        "customer_name",
        "phone",
        "email",
        "interested_model",
        "interested_variant",
        "showroom_location",
        "enquiry_source",
        "lead_status",
        "current_stage",
        "next_intent",
        "notes",
        "follow_up_date",
    }
    updates = {key: value for key, value in payload.items() if key in allowed}
    if not updates:
        return _get_lead_detail(conn, lead_id)
    updates["updated_at"] = _now_iso()
    set_clause = ", ".join(f"{key} = ?" for key in updates)
    params = tuple(updates.values()) + (lead_id,)
    conn.execute(f"UPDATE sales_leads SET {set_clause} WHERE id = ?", params)
    logger.info("Sales lead updated for %s.", lead["lead_no"])
    return _get_lead_detail(conn, lead_id)


def save_sales_test_drive(conn, lead_id: str, payload: dict) -> dict:
    lead = _get_lead_row(conn, lead_id)
    now = _now_iso()
    existing = conn.execute("SELECT id FROM sales_test_drives WHERE lead_id = ?", (lead_id,)).fetchone()
    completed_at = now if payload.get("status") == "Done" else None
    if existing:
        conn.execute(
            """
            UPDATE sales_test_drives
            SET model = ?, scheduled_date = ?, scheduled_time = ?, status = ?, notes = ?, completed_at = ?, updated_at = ?
            WHERE lead_id = ?
            """,
            (
                payload["model"],
                payload["scheduled_date"],
                payload["scheduled_time"],
                payload.get("status", "Scheduled"),
                payload.get("notes", ""),
                completed_at,
                now,
                lead_id,
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO sales_test_drives (
              id, lead_id, model, scheduled_date, scheduled_time, status, notes, completed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _make_id("td"),
                lead_id,
                payload["model"],
                payload["scheduled_date"],
                payload["scheduled_time"],
                payload.get("status", "Scheduled"),
                payload.get("notes", ""),
                completed_at,
                now,
                now,
            ),
        )
    lead_status = "Test Drive Done" if payload.get("status") == "Done" else "Test Drive Scheduled"
    current_stage = "Feedback" if payload.get("status") == "Done" else "Test Drive"
    conn.execute(
        "UPDATE sales_leads SET interested_model = ?, lead_status = ?, current_stage = ?, updated_at = ? WHERE id = ?",
        (payload["model"], lead_status, current_stage, now, lead_id),
    )
    logger.info("Test drive saved for %s.", lead["lead_no"])
    return _get_lead_detail(conn, lead_id)


def save_sales_feedback(conn, lead_id: str, payload: dict) -> dict:
    lead = _get_lead_row(conn, lead_id)
    now = _now_iso()
    existing = conn.execute("SELECT id FROM sales_feedback WHERE lead_id = ?", (lead_id,)).fetchone()
    if existing:
        conn.execute(
            """
            UPDATE sales_feedback
            SET rating_experience = ?, rating_comfort = ?, rating_advisor = ?, next_intent = ?,
                follow_up_date = ?, notes = ?, updated_at = ?
            WHERE lead_id = ?
            """,
            (
                payload["rating_experience"],
                payload["rating_comfort"],
                payload["rating_advisor"],
                payload["next_intent"],
                payload.get("follow_up_date"),
                payload.get("notes", ""),
                now,
                lead_id,
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO sales_feedback (
              id, lead_id, rating_experience, rating_comfort, rating_advisor, next_intent,
              follow_up_date, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _make_id("feedback"),
                lead_id,
                payload["rating_experience"],
                payload["rating_comfort"],
                payload["rating_advisor"],
                payload["next_intent"],
                payload.get("follow_up_date"),
                payload.get("notes", ""),
                now,
                now,
            ),
        )
    next_intent = payload["next_intent"]
    if next_intent == "Wants to Book":
        lead_status = "Wants to Book"
        current_stage = "Car Availability & Estimate"
    elif next_intent == "Not Proceeding":
        lead_status = "Not Proceeding"
        current_stage = "Closed"
    else:
        lead_status = next_intent
        current_stage = "Feedback"
    conn.execute(
        """
        UPDATE sales_leads
        SET next_intent = ?, lead_status = ?, current_stage = ?, follow_up_date = ?, updated_at = ?
        WHERE id = ?
        """,
        (next_intent, lead_status, current_stage, payload.get("follow_up_date"), now, lead_id),
    )
    logger.info("Sales feedback saved for %s.", lead["lead_no"])
    return _get_lead_detail(conn, lead_id)


def get_sales_availability(conn, model: str) -> dict:
    rows = _get_availability_rows(conn, model)
    variants = [
        dict(row)
        for row in conn.execute(
            """
            SELECT variant, ex_showroom_price, road_tax_rate, insurance_rate, addons_cost, handling_cost
            FROM sales_vehicle_catalog
            WHERE active = 1 AND model = ?
            ORDER BY ex_showroom_price
            """,
            (model,),
        ).fetchall()
    ]
    return {"model": model, "stock": rows, "variants": variants}


def save_sales_estimate(conn, lead_id: str, model: str, variant: str) -> dict:
    lead = _get_lead_row(conn, lead_id)
    catalog_row = conn.execute(
        """
        SELECT model, variant, ex_showroom_price, road_tax_rate, insurance_rate, addons_cost, handling_cost
        FROM sales_vehicle_catalog
        WHERE active = 1 AND model = ? AND variant = ?
        """,
        (model, variant),
    ).fetchone()
    if not catalog_row:
        raise HTTPException(status_code=404, detail="Vehicle pricing not found for the selected variant")
    data = dict(catalog_row)
    ex_showroom_price = float(data["ex_showroom_price"])
    road_tax = round(ex_showroom_price * float(data["road_tax_rate"]))
    insurance = round(ex_showroom_price * float(data["insurance_rate"]))
    addons = float(data["addons_cost"])
    handling = float(data["handling_cost"])
    on_road_total = ex_showroom_price + road_tax + insurance + addons + handling
    now = _now_iso()
    existing = conn.execute("SELECT id FROM sales_estimates WHERE lead_id = ?", (lead_id,)).fetchone()
    values = (
        model,
        variant,
        ex_showroom_price,
        road_tax,
        insurance,
        addons,
        handling,
        on_road_total,
        now,
        now,
        lead_id,
    )
    if existing:
        conn.execute(
            """
            UPDATE sales_estimates
            SET model = ?, variant = ?, ex_showroom_price = ?, road_tax = ?, insurance = ?, addons = ?,
                handling = ?, on_road_total = ?, reviewed_at = ?, updated_at = ?
            WHERE lead_id = ?
            """,
            values,
        )
    else:
        conn.execute(
            """
            INSERT INTO sales_estimates (
              id, lead_id, model, variant, ex_showroom_price, road_tax, insurance,
              addons, handling, on_road_total, reviewed_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _make_id("estimate"),
                lead_id,
                model,
                variant,
                ex_showroom_price,
                road_tax,
                insurance,
                addons,
                handling,
                on_road_total,
                now,
                now,
                now,
            ),
        )
    conn.execute(
        """
        UPDATE sales_leads
        SET interested_model = ?, interested_variant = ?, lead_status = ?, current_stage = ?, updated_at = ?
        WHERE id = ?
        """,
        (model, variant, "Estimate Shared", "Soft Booking", now, lead_id),
    )
    logger.info("Sales estimate reviewed for %s.", lead["lead_no"])
    detail = _get_lead_detail(conn, lead_id)
    detail["availability"] = _get_availability_rows(conn, model)
    return detail


def save_sales_booking(conn, lead_id: str, payload: dict) -> dict:
    lead = _get_lead_row(conn, lead_id)
    now = _now_iso()
    existing = conn.execute("SELECT id, booking_no FROM sales_bookings WHERE lead_id = ?", (lead_id,)).fetchone()
    booking_no = existing["booking_no"] if existing else _next_ref(conn, "sales_bookings", "booking_no", "BK")
    status = "Soft Booked" if payload.get("payment_received") else "Draft"
    if existing:
        conn.execute(
            """
            UPDATE sales_bookings
            SET model = ?, variant = ?, color_preference = ?, finance_type = ?, booking_date = ?, advance_amount = ?,
                payment_mode = ?, payment_ref = ?, payment_received = ?, expected_delivery_date = ?, delivery_location = ?,
                special_requests = ?, status = ?, updated_at = ?
            WHERE lead_id = ?
            """,
            (
                payload["model"],
                payload["variant"],
                payload.get("color_preference", ""),
                payload.get("finance_type", ""),
                payload["booking_date"],
                payload.get("advance_amount", 30000),
                payload.get("payment_mode", ""),
                payload.get("payment_ref", ""),
                1 if payload.get("payment_received") else 0,
                payload.get("expected_delivery_date"),
                payload.get("delivery_location", ""),
                payload.get("special_requests", ""),
                status,
                now,
                lead_id,
            ),
        )
    else:
        conn.execute(
            """
            INSERT INTO sales_bookings (
              id, lead_id, booking_no, model, variant, color_preference, finance_type, booking_date,
              advance_amount, payment_mode, payment_ref, payment_received, expected_delivery_date,
              delivery_location, special_requests, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _make_id("booking"),
                lead_id,
                booking_no,
                payload["model"],
                payload["variant"],
                payload.get("color_preference", ""),
                payload.get("finance_type", ""),
                payload["booking_date"],
                payload.get("advance_amount", 30000),
                payload.get("payment_mode", ""),
                payload.get("payment_ref", ""),
                1 if payload.get("payment_received") else 0,
                payload.get("expected_delivery_date"),
                payload.get("delivery_location", ""),
                payload.get("special_requests", ""),
                status,
                now,
                now,
            ),
        )
    conn.execute(
        "UPDATE sales_leads SET lead_status = ?, current_stage = ?, updated_at = ? WHERE id = ?",
        (status, "Soft Booking", now, lead_id),
    )
    logger.info("Sales booking saved for %s.", lead["lead_no"])
    return _get_lead_detail(conn, lead_id)
