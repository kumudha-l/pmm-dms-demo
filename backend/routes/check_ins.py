from fastapi import APIRouter
from fastapi.responses import FileResponse

from db.database import db_cursor
from schemas import CheckInCreateRequest
from services.check_ins import attach_check_in_pdf_path, create_check_in, get_check_in_detail, list_check_ins
from services.pdf_service import generate_check_in_pass_pdf


router = APIRouter(prefix="/api/check-ins", tags=["check-ins"])


@router.get("")
def list_check_ins_route(limit: int = 10):
    with db_cursor() as conn:
        return {"items": list_check_ins(conn, limit)}


@router.post("")
def create_check_in_route(payload: CheckInCreateRequest):
    with db_cursor() as conn:
        created = create_check_in(conn, payload.model_dump())
        pdf_path = generate_check_in_pass_pdf(created)
        saved = attach_check_in_pdf_path(conn, created["id"], pdf_path)
        return {
            "checkIn": saved,
            "entryPassUrl": f"/api/check-ins/{saved['id']}/entry-pass",
        }


@router.get("/{check_in_id}/entry-pass")
def download_entry_pass_route(check_in_id: str):
    with db_cursor() as conn:
        check_in = get_check_in_detail(conn, check_in_id)
        pdf_path = check_in.get("pdf_path") or generate_check_in_pass_pdf(check_in)
        if not check_in.get("pdf_path"):
            check_in = attach_check_in_pdf_path(conn, check_in["id"], pdf_path)
        filename = f"{check_in['check_in_no']}-entry-pass.pdf"
        return FileResponse(pdf_path, media_type="application/pdf", filename=filename)


@router.get("/{check_in_id}")
def get_check_in_route(check_in_id: str):
    with db_cursor() as conn:
        return get_check_in_detail(conn, check_in_id)
