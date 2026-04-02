def validate_assignments(assignments: list[dict], technician_rows: dict) -> tuple[bool, str]:
    if not assignments:
        return False, "At least one technician assignment is required."
    has_general = False
    for assignment in assignments:
        tech = technician_rows.get(assignment.get("technician_id"))
        if not tech:
            return False, f"Technician {assignment.get('technician_id')} not found."
        if tech["availability_status"] != "Available":
            return False, f"{tech['name']} is not currently available."
        if tech["specialization"] == "General Service":
            has_general = True
    if not has_general:
        return False, "At least one General Service technician is mandatory."
    return True, ""
