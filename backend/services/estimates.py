from typing import Any


GST_RATE = 0.18
MIN_LABOUR_TOTAL = 7000.0


def availability_status(stock_qty: int, reorder_level: int, source_location: str) -> str:
    if stock_qty <= 0 or source_location == "To Be Procured":
        return "Not Available"
    if source_location in {"Alternate Godown", "External Vendor", "Regional Warehouse"} or stock_qty <= reorder_level:
        return "Low Stock"
    return "In Stock"


def calculate_estimate(selected_services: list[dict[str, Any]], selected_parts: list[dict[str, Any]], addon_total: float, discount_amount: float) -> dict[str, float]:
    raw_labor_total = sum(float(item.get("total_cost", item.get("unit_cost", 0) * item.get("quantity", 1))) for item in selected_services)
    parts_total = sum(float(item.get("total_price", item.get("unit_price", 0) * item.get("quantity", 1))) for item in selected_parts)
    labor_total = max(raw_labor_total, MIN_LABOUR_TOTAL) if (selected_services or selected_parts) else 0.0
    subtotal = labor_total + parts_total + float(addon_total)
    taxable_amount = max(subtotal - float(discount_amount), 0)
    gst_amount = round(taxable_amount * GST_RATE, 2)
    grand_total = round(taxable_amount + gst_amount, 2)
    eta_mins = sum(int(item.get("estimated_time_mins", 0)) * int(item.get("quantity", 1)) for item in selected_services) + 30
    return {
        "laborTotal": round(labor_total, 2),
        "partsTotal": round(parts_total, 2),
        "addonTotal": round(float(addon_total), 2),
        "discount": round(float(discount_amount), 2),
        "gstAmount": gst_amount,
        "grandTotal": grand_total,
        "etaMins": eta_mins,
    }
