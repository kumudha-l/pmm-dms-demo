import base64
import json
import mimetypes
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

from db.database import MAIL_SERVICE_SECRET, MAIL_SERVICE_TIMEOUT_SECS, MAIL_SERVICE_URL
from db.database import db_cursor

from .logger import get_logger
from .notifications import log_notification


logger = get_logger("email")


def email_configured() -> bool:
    return bool(MAIL_SERVICE_URL and MAIL_SERVICE_SECRET)


def _build_attachment_payload(attachment_path: str | None) -> dict | None:
    if not attachment_path:
        return None
    path = Path(attachment_path)
    if not path.exists():
        logger.warning("Attachment path %s does not exist. Email will be sent without attachment.", path)
        return None

    mime_type, _ = mimetypes.guess_type(str(path))
    content_type = mime_type or "application/pdf"
    return {
        "filename": path.name,
        "contentType": content_type,
        "dataBase64": base64.b64encode(path.read_bytes()).decode("ascii"),
    }


def _dispatch_to_mail_service(recipient: str, subject: str, body: str, attachment_path: str | None = None, notification_type: str = "Job Card Email") -> dict:
    attachment = _build_attachment_payload(attachment_path)
    payload = {
        "recipient": recipient,
        "subject": subject,
        "text": body,
        "notificationType": notification_type,
        "attachment": attachment,
    }
    logger.info(
        "Mail dispatch requested to %s for %s. Attachment included: %s.",
        recipient,
        notification_type,
        bool(attachment),
    )
    request = urllib_request.Request(
        MAIL_SERVICE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Mail-Service-Secret": MAIL_SERVICE_SECRET,
        },
        method="POST",
    )
    with urllib_request.urlopen(request, timeout=MAIL_SERVICE_TIMEOUT_SECS) as response:
        response_body = response.read().decode("utf-8", errors="replace")
        logger.info(
            "Mail service responded with HTTP %s for %s -> %s.",
            response.status,
            notification_type,
            recipient,
        )
        return json.loads(response_body) if response_body else {"ok": True}


def send_job_card_email_background(job_card_id: str, recipient: str, subject: str, body: str, attachment_path: str | None = None, notification_type: str = "Job Card Email") -> None:
    logger.info("Background email task started for %s -> %s.", notification_type, recipient)
    try:
        if not email_configured():
            logger.warning("Mail service configuration missing. Skipping %s for %s.", notification_type, recipient)
            with db_cursor() as conn:
                log_notification(conn, job_card_id, notification_type, recipient, "Skipped", "Mail service configuration missing")
            return
        response = _dispatch_to_mail_service(recipient, subject, body, attachment_path, notification_type)
        logger.info("Background email sent successfully for %s -> %s.", notification_type, recipient)
        with db_cursor() as conn:
            log_notification(conn, job_card_id, notification_type, recipient, "Sent", str(response.get("messageId", subject)))
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        logger.exception("Background email failed for %s -> %s: HTTP %s %s", notification_type, recipient, exc.code, detail)
        with db_cursor() as conn:
            log_notification(conn, job_card_id, notification_type, recipient, "Failed", f"HTTP {exc.code}: {detail[:200]}")
    except urllib_error.URLError as exc:
        logger.exception("Background email failed for %s -> %s: %s", notification_type, recipient, exc)
        with db_cursor() as conn:
            log_notification(conn, job_card_id, notification_type, recipient, "Failed", str(exc.reason))
    except Exception as exc:
        logger.exception("Background email failed for %s -> %s: %s", notification_type, recipient, exc)
        with db_cursor() as conn:
            log_notification(conn, job_card_id, notification_type, recipient, "Failed", str(exc))
