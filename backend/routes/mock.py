import os
import uuid

from fastapi import APIRouter, File, UploadFile

from schemas import ComplaintParseRequest
from services.ai_service import extract_odometer, extract_plate, parse_complaint
from services.logger import get_logger


router = APIRouter(prefix="/api/mock", tags=["mock"])
logger = get_logger("routes.mock")


async def _save_upload(file: UploadFile, upload_dir: str) -> tuple[str, bytes]:
    filename = file.filename or f"upload_{uuid.uuid4().hex}.bin"
    path = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(path, "wb") as handle:
        handle.write(content)
    logger.info("Uploaded file saved to %s.", path)
    return path, content


@router.post("/extract-plate")
async def extract_plate_route(file: UploadFile = File(...)):
    from db.database import UPLOAD_DIR
    path, content = await _save_upload(file, str(UPLOAD_DIR))
    return await extract_plate(path, content, file.content_type or "image/jpeg")


@router.post("/extract-odometer")
async def extract_odometer_route(file: UploadFile = File(...)):
    from db.database import UPLOAD_DIR
    path, content = await _save_upload(file, str(UPLOAD_DIR))
    return await extract_odometer(path, content, file.content_type or "image/jpeg")


@router.post("/parse-complaint")
async def parse_complaint_route(payload: ComplaintParseRequest):
    return await parse_complaint(payload.text, payload.advisorObservations, payload.suggestedRepairs)
