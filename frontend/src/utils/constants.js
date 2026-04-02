export const SERVICE_TYPES = ["Periodic Service", "Paid Service", "Free Service", "Express Service", "Running Repair", "Accident Repair", "Body Shop", "Insurance Claim Repair", "General Check-up", "Pre-delivery Inspection", "Warranty Repair"];
export const COMPLAINT_SOURCES = ["Walk-in", "Phone Booking", "Online Booking", "RSA / Breakdown", "Repeat Visit"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking", "Wallet", "Corporate Credit", "Insurance", "Warranty"];
export const APPROVAL_STATUSES = ["Pending", "Approved by Customer", "Rejected by Customer", "Revised Estimate Sent", "Re-approval Required"];
export const JOB_STATUSES = ["Draft", "Estimate Prepared", "Awaiting Approval", "Approved", "Assigned", "In Progress", "Work Completed", "Billing In Progress", "Paid", "Closed", "Cancelled"];
export const ADD_ON_SERVICES = [
  { service_name: "Interior Cleaning", unit_cost: 850, source_type: "ADD SERVICES" },
  { service_name: "Exterior Foam Wash", unit_cost: 650, source_type: "ADD SERVICES" },
  { service_name: "Polishing", unit_cost: 1200, source_type: "ADD SERVICES" },
  { service_name: "Underbody Coating", unit_cost: 1450, source_type: "ADD SERVICES" },
  { service_name: "Wheel Balancing", unit_cost: 650, source_type: "ADD SERVICES" },
  { service_name: "Pickup and Drop", unit_cost: 550, source_type: "ADD SERVICES" },
];

export const SERVICE_CATALOG = {
  "LAB-FREE-1": { service_catalog_id: "svc_001", service_name: "1st Free Service", unit_cost: 0, estimated_time_mins: 80 },
  "LAB-FREE-2": { service_catalog_id: "svc_002", service_name: "2nd Free Service", unit_cost: 0, estimated_time_mins: 90 },
  "LAB-FREE-3": { service_catalog_id: "svc_003", service_name: "3rd Free Service", unit_cost: 0, estimated_time_mins: 100 },
  "LAB-PAID-PERIODIC": { service_catalog_id: "svc_004", service_name: "Periodic Service", unit_cost: 1850, estimated_time_mins: 120 },
  "LAB-BRAKE-INSPECT": { service_catalog_id: "svc_005", service_name: "Brake Inspection & Cleaning", unit_cost: 950, estimated_time_mins: 45 },
  "LAB-BRAKE-PAD": { service_catalog_id: "svc_006", service_name: "Brake Pad Replacement", unit_cost: 1250, estimated_time_mins: 60 },
  "LAB-ALIGNMENT": { service_catalog_id: "svc_007", service_name: "Wheel Alignment", unit_cost: 780, estimated_time_mins: 35 },
  "LAB-BALANCING": { service_catalog_id: "svc_008", service_name: "Wheel Balancing", unit_cost: 650, estimated_time_mins: 30 },
  "LAB-AC-DIAG": { service_catalog_id: "svc_009", service_name: "AC Diagnosis", unit_cost: 1100, estimated_time_mins: 50 },
  "LAB-AC-SERVICE": { service_catalog_id: "svc_010", service_name: "AC Service & Gas Refill", unit_cost: 1680, estimated_time_mins: 75 },
  "LAB-ELEC-DIAG": { service_catalog_id: "svc_011", service_name: "Electrical Diagnosis", unit_cost: 1350, estimated_time_mins: 70 },
  "LAB-BODY-REPAIR": { service_catalog_id: "svc_012", service_name: "Minor Body Repair", unit_cost: 2800, estimated_time_mins: 150 },
  "LAB-POLISH": { service_catalog_id: "svc_013", service_name: "Exterior Polishing", unit_cost: 1200, estimated_time_mins: 60 },
  "LAB-INT-CLEAN": { service_catalog_id: "svc_014", service_name: "Interior Cleaning", unit_cost: 850, estimated_time_mins: 40 },
  "LAB-DIAG-SCAN": { service_catalog_id: "svc_015", service_name: "Diagnostic Scan", unit_cost: 980, estimated_time_mins: 25 },
};
