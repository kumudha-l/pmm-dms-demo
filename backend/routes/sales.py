from fastapi import APIRouter

from db.database import db_cursor
from schemas import (
    SalesBookingRequest,
    SalesEstimateRequest,
    SalesFeedbackRequest,
    SalesLeadCreateRequest,
    SalesLeadUpdateRequest,
    SalesTestDriveRequest,
)
from services.sales import (
    create_sales_lead,
    get_sales_availability,
    get_sales_catalog,
    get_sales_lead_detail,
    list_sales_leads,
    save_sales_booking,
    save_sales_estimate,
    save_sales_feedback,
    save_sales_test_drive,
    update_sales_lead,
)


router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("/catalog")
def get_catalog_route():
    with db_cursor() as conn:
        return get_sales_catalog(conn)


@router.get("/leads")
def list_sales_leads_route():
    with db_cursor() as conn:
        return list_sales_leads(conn)


@router.post("/leads")
def create_sales_lead_route(payload: SalesLeadCreateRequest):
    with db_cursor() as conn:
        return create_sales_lead(conn, payload.model_dump())


@router.get("/leads/{lead_id}")
def get_sales_lead_route(lead_id: str):
    with db_cursor() as conn:
        return get_sales_lead_detail(conn, lead_id)


@router.put("/leads/{lead_id}")
def update_sales_lead_route(lead_id: str, payload: SalesLeadUpdateRequest):
    with db_cursor() as conn:
        return update_sales_lead(conn, lead_id, payload.model_dump(exclude_none=True))


@router.post("/leads/{lead_id}/test-drive")
def save_test_drive_route(lead_id: str, payload: SalesTestDriveRequest):
    with db_cursor() as conn:
        return save_sales_test_drive(conn, lead_id, payload.model_dump())


@router.post("/leads/{lead_id}/feedback")
def save_feedback_route(lead_id: str, payload: SalesFeedbackRequest):
    with db_cursor() as conn:
        return save_sales_feedback(conn, lead_id, payload.model_dump())


@router.get("/availability/{model}")
def get_availability_route(model: str):
    with db_cursor() as conn:
        return get_sales_availability(conn, model)


@router.post("/leads/{lead_id}/estimate")
def save_estimate_route(lead_id: str, payload: SalesEstimateRequest):
    with db_cursor() as conn:
        return save_sales_estimate(conn, lead_id, payload.model, payload.variant)


@router.post("/leads/{lead_id}/booking")
def save_booking_route(lead_id: str, payload: SalesBookingRequest):
    with db_cursor() as conn:
        return save_sales_booking(conn, lead_id, payload.model_dump())
