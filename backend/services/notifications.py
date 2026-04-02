import uuid
from datetime import datetime, timedelta


def log_notification(conn, job_card_id: str, notification_type: str, recipient: str, status: str, details: str, scheduled_for: str | None = None) -> None:
    conn.execute(
        "INSERT INTO notifications (id, job_card_id, notification_type, recipient, status, triggered_at, scheduled_for, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (f"not_{uuid.uuid4().hex[:10]}", job_card_id, notification_type, recipient, status, datetime.utcnow().isoformat(), scheduled_for, details),
    )


def log_payment_notifications(conn, job_card_id: str, recipient_email: str, recipient_phone: str) -> None:
    log_notification(conn, job_card_id, "Invoice Sent", recipient_email or recipient_phone, "Logged", "Invoice simulated after payment")
    log_notification(conn, job_card_id, "Next Service Reminder", recipient_phone, "Scheduled", "Next service reminder created", (datetime.utcnow() + timedelta(days=180)).isoformat())
    log_notification(conn, job_card_id, "Feedback Reminder", recipient_phone, "Scheduled", "Feedback reminder after 2 days", (datetime.utcnow() + timedelta(days=2)).isoformat())
