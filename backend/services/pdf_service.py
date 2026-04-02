from pathlib import Path
from textwrap import wrap

from db.database import PDF_OUTPUT_DIR

from .logger import get_logger


logger = get_logger("pdf")


def _pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_lines(job_card: dict) -> list[str]:
    lines = [
        "Popular Mega Motors - Workshop Job Card",
        "",
        f"Job Card No: {job_card.get('job_card_no', '-')}",
        f"Status: {job_card.get('status', '-')}",
        f"Payment Status: {job_card.get('payment_status', '-')}",
        f"Created At: {job_card.get('created_at', '-')}",
        f"Updated At: {job_card.get('updated_at', '-')}",
        "",
        "Customer Details",
        f"Name: {job_card.get('customer_name', '-')}",
        f"Phone: {job_card.get('phone', '-')}",
        f"Email: {job_card.get('email', '-')}",
        f"Address: {job_card.get('address', '-')}",
        "",
        "Vehicle Details",
        f"Reg No: {job_card.get('reg_no', '-')}",
        f"Vehicle: {job_card.get('make', '')} {job_card.get('model', '')} {job_card.get('variant', '')}".strip(),
        f"Fuel / Transmission: {job_card.get('fuel_type', '-')} / {job_card.get('transmission', '-')}",
        f"Opening KM: {job_card.get('opening_km', '-')}",
        f"Current KM: {job_card.get('current_km', '-')}",
        f"Chassis No: {job_card.get('chassis_no', '-')}",
        f"Engine No: {job_card.get('engine_no', '-')}",
        "",
        "Complaint & Workshop Notes",
        f"Customer Reported Issues: {job_card.get('complaint_text', '-')}",
        f"Advisor Observations: {job_card.get('advisor_observations', '-')}",
        f"Suggested Repairs: {job_card.get('suggested_repairs', '-')}",
        "",
        "Selected Services",
    ]

    for service in job_card.get("services", []):
        lines.append(f"- {service.get('service_name', '-')}: Rs {service.get('total_cost', service.get('unit_cost', 0))}")

    lines.extend(["", "Selected Parts"])
    for part in job_card.get("parts", []):
        lines.append(f"- {part.get('part_name', '-')}: Qty {part.get('quantity', 1)} / Rs {part.get('total_price', part.get('unit_price', 0))}")

    lines.extend(["", "Assigned Technicians"])
    for technician in job_card.get("technicians", []):
        lines.append(f"- {technician.get('name', '-')}: {technician.get('assignment_type', '-')}, {technician.get('assigned_task', '-')}")

    lines.extend(
        [
            "",
            "Cost Summary",
            f"Estimated Cost: Rs {job_card.get('estimated_cost', 0)}",
            f"Final Cost: Rs {job_card.get('final_cost', 0)}",
            f"Discount: Rs {job_card.get('discount_amount', 0)}",
            f"Add-on Total: Rs {job_card.get('addon_total', 0)}",
            f"GST: Rs {job_card.get('gst_amount', 0)}",
            f"Bay No: {job_card.get('bay_no', '-')}",
            f"Estimated Delivery: {job_card.get('estimated_delivery_at', '-')}",
        ]
    )
    expanded: list[str] = []
    for line in lines:
        wrapped = wrap(str(line), width=95) or [""]
        expanded.extend(wrapped)
    return expanded


def _build_gate_pass_lines(job_card: dict) -> list[str]:
    lines = [
        "Popular Mega Motors - Vehicle Gate Pass",
        "",
        f"Gate Pass For: {job_card.get('job_card_no', '-')}",
        f"Customer Name: {job_card.get('customer_name', '-')}",
        f"Vehicle Reg No: {job_card.get('reg_no', '-')}",
        f"Vehicle: {job_card.get('make', '')} {job_card.get('model', '')} {job_card.get('variant', '')}".strip(),
        f"Delivery Status: {job_card.get('status', '-')}",
        f"Payment Status: {job_card.get('payment_status', '-')}",
        f"Bay No: {job_card.get('bay_no', '-')}",
        f"Released At: {job_card.get('updated_at', '-')}",
        "",
        "Authorized Delivery Notes",
        "Vehicle released after service completion and billing clearance.",
        "Customer has been informed to verify belongings and documents before exit.",
        "",
        "Workshop Contact",
        "Popular Mega Motors Service Workshop",
        f"Phone: {job_card.get('phone', '-')}",
    ]
    expanded: list[str] = []
    for line in lines:
        wrapped = wrap(str(line), width=95) or [""]
        expanded.extend(wrapped)
    return expanded


def _build_pdf_bytes(lines: list[str]) -> bytes:
    page_height = 792
    margin_top = 50
    line_height = 14
    lines_per_page = 48
    pages = [lines[i:i + lines_per_page] for i in range(0, len(lines), lines_per_page)] or [[]]

    objects: list[bytes] = []

    def add_object(content: str | bytes) -> int:
        data = content.encode("latin-1") if isinstance(content, str) else content
        objects.append(data)
        return len(objects)

    font_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    page_ids: list[int] = []
    content_ids: list[int] = []

    for page_lines in pages:
        text_commands = ["BT", "/F1 10 Tf", f"1 0 0 1 50 {page_height - margin_top} Tm", f"{line_height} TL"]
        for index, line in enumerate(page_lines):
            if index == 0:
                text_commands.append(f"({_pdf_escape(line)}) Tj")
            else:
                text_commands.append("T*")
                text_commands.append(f"({_pdf_escape(line)}) Tj")
        text_commands.append("ET")
        stream = "\n".join(text_commands).encode("latin-1")
        content_id = add_object(b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream")
        content_ids.append(content_id)
        page_ids.append(0)

    pages_id = add_object("<< /Type /Pages /Kids [] /Count 0 >>")
    for idx, content_id in enumerate(content_ids):
        page_id = add_object(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>"
        )
        page_ids[idx] = page_id

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1")
    catalog_id = add_object(f"<< /Type /Catalog /Pages {pages_id} 0 R >>")

    output = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(output))
        output.extend(f"{index} 0 obj\n".encode("ascii"))
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref_offset = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("ascii")
    )
    return bytes(output)


def generate_job_card_pdf(job_card: dict) -> str:
    PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{job_card.get('job_card_no', job_card.get('id', 'job-card'))}.pdf"
    path = PDF_OUTPUT_DIR / filename
    logger.info("PDF generation started for %s.", job_card.get("job_card_no", job_card.get("id")))
    pdf_bytes = _build_pdf_bytes(_build_lines(job_card))
    Path(path).write_bytes(pdf_bytes)
    logger.info("PDF generated successfully at %s.", path)
    return str(path)


def generate_gate_pass_pdf(job_card: dict) -> str:
    PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{job_card.get('job_card_no', job_card.get('id', 'job-card'))}-gate-pass.pdf"
    path = PDF_OUTPUT_DIR / filename
    logger.info("Gate pass generation started for %s.", job_card.get("job_card_no", job_card.get("id")))
    pdf_bytes = _build_pdf_bytes(_build_gate_pass_lines(job_card))
    Path(path).write_bytes(pdf_bytes)
    logger.info("Gate pass generated successfully at %s.", path)
    return str(path)
