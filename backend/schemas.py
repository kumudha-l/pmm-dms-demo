from typing import Any, Optional

from pydantic import BaseModel, Field


class ComplaintParseRequest(BaseModel):
    text: str
    advisorObservations: str = ""
    suggestedRepairs: str = ""


class JobCardCreateRequest(BaseModel):
    reg_no: str
    advisor_name: str
    opening_km: int
    complaint_text: str = ""
    service_type: Optional[str] = None
    complaint_source: Optional[str] = None
    repeat_complaint: bool = False
    ai_parsed_issues: list[dict[str, Any]] = Field(default_factory=list)
    advisor_observations: str = ""
    suggested_repairs: str = ""
    selected_services: list[dict[str, Any]] = Field(default_factory=list)
    selected_parts: list[dict[str, Any]] = Field(default_factory=list)
    discount_amount: float = 0
    addon_total: float = 0
    approval_status: str = "Pending"
    typed_acknowledgement: str = ""
    signature_data_url: str = ""
    status: str = "Draft"
    bay_no: str = ""


class JobCardUpdateRequest(BaseModel):
    advisor_name: Optional[str] = None
    opening_km: Optional[int] = None
    complaint_text: Optional[str] = None
    ai_parsed_issues: Optional[list[dict[str, Any]]] = None
    advisor_observations: Optional[str] = None
    suggested_repairs: Optional[str] = None
    selected_services: Optional[list[dict[str, Any]]] = None
    selected_parts: Optional[list[dict[str, Any]]] = None
    discount_amount: Optional[float] = None
    addon_total: Optional[float] = None
    approval_status: Optional[str] = None
    payment_status: Optional[str] = None
    status: Optional[str] = None
    typed_acknowledgement: Optional[str] = None
    signature_data_url: Optional[str] = None
    bay_no: Optional[str] = None
    estimated_delivery_at: Optional[str] = None


class EstimateRequest(BaseModel):
    selected_services: list[dict[str, Any]] = Field(default_factory=list)
    selected_parts: list[dict[str, Any]] = Field(default_factory=list)
    addon_total: float = 0
    discount_amount: float = 0


class TechnicianAssignmentRequest(BaseModel):
    assignments: list[dict[str, Any]]
    bay_no: Optional[str] = None


class PaymentRequest(BaseModel):
    amount: float
    payment_method: str
    payment_ref: str
    notes: Optional[str] = ""


class SalesLeadCreateRequest(BaseModel):
    customer_name: str
    phone: str
    email: Optional[str] = ""
    interested_model: str
    interested_variant: Optional[str] = ""
    showroom_location: Optional[str] = "Kochi Showroom"
    enquiry_source: Optional[str] = "Walk-in"
    lead_status: Optional[str] = "Enquired"
    notes: Optional[str] = ""


class SalesLeadUpdateRequest(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    interested_model: Optional[str] = None
    interested_variant: Optional[str] = None
    showroom_location: Optional[str] = None
    enquiry_source: Optional[str] = None
    lead_status: Optional[str] = None
    current_stage: Optional[str] = None
    next_intent: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[str] = None


class SalesTestDriveRequest(BaseModel):
    model: str
    scheduled_date: str
    scheduled_time: str
    status: str = "Scheduled"
    notes: Optional[str] = ""


class SalesFeedbackRequest(BaseModel):
    rating_experience: int
    rating_comfort: int
    rating_advisor: int
    next_intent: str
    follow_up_date: Optional[str] = None
    notes: Optional[str] = ""


class SalesEstimateRequest(BaseModel):
    model: str
    variant: str


class SalesBookingRequest(BaseModel):
    model: str
    variant: str
    color_preference: Optional[str] = ""
    finance_type: Optional[str] = ""
    booking_date: str
    advance_amount: float = 30000
    payment_mode: Optional[str] = ""
    payment_ref: Optional[str] = ""
    payment_received: bool = False
    expected_delivery_date: Optional[str] = None
    delivery_location: Optional[str] = ""
    special_requests: Optional[str] = ""
