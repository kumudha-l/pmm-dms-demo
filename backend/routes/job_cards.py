from fastapi import APIRouter, BackgroundTasks

from db.database import FEEDBACK_FORM_URL, db_cursor
from schemas import EstimateRequest, JobCardCreateRequest, JobCardUpdateRequest, PaymentRequest, TechnicianAssignmentRequest
from services.email_service import send_job_card_email_background
from services.job_cards import assign_technicians, close_job_card, create_job_card, get_job_card_detail, record_payment, recompute_job_card_estimate, update_job_card
from services.logger import get_logger
from services.pdf_service import generate_gate_pass_pdf, generate_job_card_pdf


router = APIRouter(prefix="/api/job-cards", tags=["job-cards"])
logger = get_logger("routes.job_cards")
DEMO_RECIPIENT = "kumudhaaa10@gmail.com"
CLOSE_EMAIL_RECIPIENTS = [
    DEMO_RECIPIENT,
    "Rupesh.cn@motiveminds.com",
    "kripali.a@motiveminds.com",
]


@router.post("")
def create_job_card_route(payload: JobCardCreateRequest):
    with db_cursor() as conn:
        return create_job_card(conn, payload.model_dump())


@router.get("/{job_card_id}")
def get_job_card_route(job_card_id: str):
    with db_cursor() as conn:
        return get_job_card_detail(conn, job_card_id)


@router.put("/{job_card_id}")
def update_job_card_route(job_card_id: str, payload: JobCardUpdateRequest):
    with db_cursor() as conn:
        return update_job_card(conn, job_card_id, payload.model_dump(exclude_none=True))


@router.post("/{job_card_id}/estimate")
def estimate_job_card_route(job_card_id: str, payload: EstimateRequest):
    with db_cursor() as conn:
        estimate = recompute_job_card_estimate(conn, job_card_id, payload.selected_services, payload.selected_parts, payload.addon_total, payload.discount_amount)
        return {"jobCardId": job_card_id, **estimate}


@router.post("/{job_card_id}/assign-technicians")
def assign_route(job_card_id: str, payload: TechnicianAssignmentRequest):
    with db_cursor() as conn:
        return assign_technicians(conn, job_card_id, payload.assignments, payload.bay_no)


@router.post("/{job_card_id}/payment")
def payment_route(job_card_id: str, payload: PaymentRequest):
    with db_cursor() as conn:
        return record_payment(conn, job_card_id, payload.amount, payload.payment_method, payload.payment_ref, payload.notes or "")


@router.post("/{job_card_id}/close")
def close_job_card_route(job_card_id: str, background_tasks: BackgroundTasks):
    pdf_path = None
    gate_pass_path = None
    with db_cursor() as conn:
        closed = close_job_card(conn, job_card_id)
        try:
            pdf_path = generate_job_card_pdf(closed)
        except Exception as exc:
            logger.exception("PDF generation failed for %s: %s", closed["job_card_no"], exc)
        try:
            gate_pass_path = generate_gate_pass_pdf(closed)
        except Exception as exc:
            logger.exception("Gate pass generation failed for %s: %s", closed["job_card_no"], exc)
        subject = f"Closed Job Card {closed['job_card_no']} - Popular Mega Motors"
        body = (
            f"Dear {closed['customer_name']},\n\nAttached is the closed job card for {closed['customer_name']} "
            f"({closed['reg_no']}). Next service reminder remains 180 days from closure.\n\nRegards,\nPopular Mega Motors"
        )
        gate_pass_subject = f"Gate Pass {closed['job_card_no']} - Popular Mega Motors"
        gate_pass_body = (
            f"Dear {closed['customer_name']},\n\nAttached is your vehicle gate pass for {closed['job_card_no']} "
            f"({closed['reg_no']}). Please present this while taking delivery.\n\nRegards,\nPopular Mega Motors"
        )
        logger.info("Scheduling background close emails for %s to %s recipients.", closed["job_card_no"], len(CLOSE_EMAIL_RECIPIENTS))
        for recipient in CLOSE_EMAIL_RECIPIENTS:
            background_tasks.add_task(
                send_job_card_email_background,
                closed["id"],
                recipient,
                subject,
                body,
                pdf_path,
                "Closed Job Card Email",
            )
        logger.info("Scheduling background gate pass emails for %s to %s recipients.", closed["job_card_no"], len(CLOSE_EMAIL_RECIPIENTS))
        for recipient in CLOSE_EMAIL_RECIPIENTS:
            background_tasks.add_task(
                send_job_card_email_background,
                closed["id"],
                recipient,
                gate_pass_subject,
                gate_pass_body,
                gate_pass_path,
                "Gate Pass Email",
            )
        return {"jobCard": closed, "pdfPath": pdf_path, "gatePassPath": gate_pass_path, "emailScheduled": True}


@router.post("/{job_card_id}/send-feedback")
def send_feedback_route(job_card_id: str, background_tasks: BackgroundTasks):
    with db_cursor() as conn:
        job_card = get_job_card_detail(conn, job_card_id)
        feedback_link = FEEDBACK_FORM_URL or "https://forms.gle/demo-feedback-link"
        if FEEDBACK_FORM_URL:
            logger.info("Scheduling feedback email for %s using configured feedback form URL.", job_card["job_card_no"])
        else:
            logger.warning("FEEDBACK_FORM_URL is not configured. Falling back to placeholder feedback link for %s.", job_card["job_card_no"])
        logger.info("Scheduling feedback email for %s.", job_card["job_card_no"])
        background_tasks.add_task(
            send_job_card_email_background,
            job_card["id"],
            DEMO_RECIPIENT,
            f"Feedback Form - {job_card['job_card_no']}",
            (
                f"Dear {job_card['customer_name']},\n\n"
                "Thank you for visiting Popular Mega Motors.\n\n"
                "Please share your workshop feedback using the form below.\n"
                f"Feedback form: {feedback_link}\n\nRegards,\nPopular Mega Motors"
            ),
            None,
            "Feedback Form Email",
        )
        return {"scheduled": True, "jobCardNo": job_card["job_card_no"]}
