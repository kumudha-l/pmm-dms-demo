import asyncio
import os
import re

from .logger import get_logger


PLATE_MAP = {
    "plate_kl47f7878.jpg": {"regNo": "KL47F7878", "confidence": 0.97},
    "plate_kl38f8616.jpg": {"regNo": "KL38F8616", "confidence": 0.96},
    "plate_wb06f5977.jpg": {"regNo": "WB06F5977", "confidence": 0.94},
    "plate_mh12de1433.jpg": {"regNo": "MH12DE1433", "confidence": 0.98},
    "plate_repeat_swift.jpg": {"regNo": "KL05QR9012", "confidence": 0.88},
    "plate_body_creta.jpg": {"regNo": "KL09WX2346", "confidence": 0.95},
}

ODO_MAP = {
    "odometer_15823km.jpg": {"km": 15823, "confidence": 0.96},
    "odometer_24112km.jpg": {"km": 24112, "confidence": 0.95},
    "odometer_30245km.jpg": {"km": 30245, "confidence": 0.94},
    "odometer_8234km.jpg": {"km": 8234, "confidence": 0.97},
    "odometer_repeat_40128.jpg": {"km": 40128, "confidence": 0.86},
    "odometer_body_16780.jpg": {"km": 16780, "confidence": 0.93},
}

ISSUE_RULES = [
    {"keywords": ["brake", "break", "stopping", "brake disc", "disc brake", "rotor", "pad wear", "brake pad"], "issue": {"category": "Brake", "title": "Brake noise - front", "priority": "High"}, "services": ["LAB-BRAKE-INSPECT", "LAB-BRAKE-PAD"], "service_codes": ["BR-INSP", "BR-PAD"], "specialists": ["Brake Specialist"], "severity": "Brake - High"},
    {"keywords": ["align", "alignment", "pull", "tyre wear", "vibration"], "issue": {"category": "Wheel Alignment", "title": "Wheel alignment required", "priority": "Medium"}, "services": ["LAB-ALIGNMENT", "LAB-BALANCING"], "service_codes": ["WA-CHK", "WB-CHK"], "specialists": ["Wheel Alignment Technician"], "severity": "Alignment - Medium"},
    {"keywords": ["ac", "cooling", "blower", "hvac"], "issue": {"category": "AC / HVAC", "title": "AC not cooling", "priority": "Medium"}, "services": ["LAB-AC-DIAG", "LAB-AC-SERVICE"], "service_codes": ["AC-CHK", "AC-SRV"], "specialists": ["AC Technician"], "severity": "AC - Medium"},
    {"keywords": ["discharged battery", "dead battery", "battery weak", "battery drain", "battery", "warning light", "electrical", "fuse"], "issue": {"category": "Battery / Starting / Charging", "title": "Battery / starting system diagnosis", "priority": "Medium"}, "services": ["LAB-ELEC-DIAG", "LAB-DIAG-SCAN"], "service_codes": ["EL-DIAG", "BAT-CHK"], "specialists": ["Electrical Technician", "Diagnostic Technician"], "severity": "Battery - Medium"},
    {"keywords": ["engine overheating", "overheating", "engine noise", "noisy engine", "knocking", "rough engine", "engine sound"], "issue": {"category": "Engine Diagnostics", "title": "Engine diagnosis required", "priority": "Medium"}, "services": ["LAB-DIAG-SCAN"], "service_codes": ["SCAN", "ENG-DIAG"], "specialists": ["Diagnostic Technician"], "severity": "Engine - Medium"},
    {"keywords": ["engine oil change", "oil change", "engine oil", "periodic service", "service", "oil", "free service", "1st service", "2nd service", "3rd service"], "issue": {"category": "Periodic / Oil Service", "title": "Engine oil / periodic service required", "priority": "Low"}, "services": ["LAB-PAID-PERIODIC"], "service_codes": ["FS-02", "OIL-SRV"], "specialists": ["General Service"], "severity": "Service - Routine"},
    {"keywords": ["scratch", "body", "polish", "bumper", "mudguard", "fender", "body panel"], "issue": {"category": "Body / Exterior", "title": "Body panel / mudguard repair", "priority": "Medium"}, "services": ["LAB-BODY-REPAIR", "LAB-POLISH"], "service_codes": ["BD-REP", "POL-EXT"], "specialists": ["Diagnostic Technician"], "severity": "Body - Medium"},
]

RULE_KEYWORDS = sorted({keyword for rule in ISSUE_RULES for keyword in rule["keywords"]}, key=len, reverse=True)
logger = get_logger("mock_ai")


def _normalize_text(text: str) -> str:
    normalized = re.sub(r"\bbreak\b", "brake", text.lower())
    normalized = re.sub(r"[^a-z0-9\s/-]", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _keyword_present(text: str, keyword: str) -> bool:
    if " " in keyword:
        return keyword in text
    return bool(re.search(rf"\b{re.escape(keyword)}\b", text))


def matched_rule_keywords(text: str) -> list[str]:
    lower_text = _normalize_text(text)
    return [keyword for keyword in RULE_KEYWORDS if _keyword_present(lower_text, keyword)]


async def _delay() -> None:
    await asyncio.sleep(1.35)


async def extract_plate(filename: str) -> dict:
    await _delay()
    return PLATE_MAP.get(os.path.basename(filename).lower(), {"regNo": "UNKNOWN", "confidence": 0.52})


async def extract_odometer(filename: str) -> dict:
    await _delay()
    return ODO_MAP.get(os.path.basename(filename).lower(), {"km": 0, "confidence": 0.49})


async def parse_complaint(text: str) -> dict:
    await _delay()
    lower_text = _normalize_text(text)
    matched_issues = []
    services = []
    service_codes = []
    specialists = []
    severity = []
    matched_groups = []
    for rule in ISSUE_RULES:
        if any(_keyword_present(lower_text, keyword) for keyword in rule["keywords"]):
            matched_issues.append(rule["issue"])
            services.extend(rule["services"])
            service_codes.extend(rule.get("service_codes", []))
            specialists.extend(rule["specialists"])
            severity.append(rule.get("severity"))
            matched_groups.extend([keyword for keyword in rule["keywords"] if _keyword_present(lower_text, keyword)])
    if not matched_issues:
        matched_issues.append({"category": "General Check-up", "title": "General inspection suggested", "priority": "Low"})
        services.append("LAB-DIAG-SCAN")
        service_codes.append("GEN-CHK")
        specialists.append("General Service")
        severity.append("General - Routine")
    priorities = [issue["priority"] for issue in matched_issues]
    priority = "P1 - Urgent" if "High" in priorities and "warning light" in lower_text else "P2 - Same Day" if "High" in priorities or "Medium" in priorities else "P3 - Standard"
    unique_services = list(dict.fromkeys(services))
    est_time_mins = sum({
        "LAB-BRAKE-INSPECT": 45,
        "LAB-BRAKE-PAD": 60,
        "LAB-ALIGNMENT": 35,
        "LAB-BALANCING": 30,
        "LAB-AC-DIAG": 50,
        "LAB-AC-SERVICE": 75,
        "LAB-ELEC-DIAG": 70,
        "LAB-DIAG-SCAN": 25,
        "LAB-PAID-PERIODIC": 120,
        "LAB-BODY-REPAIR": 150,
        "LAB-POLISH": 60,
    }.get(service, 30) for service in unique_services) or 60
    job_type = "Free Service" if "free service" in lower_text or any(service_code.startswith("FS-") for service_code in service_codes) else "Body Shop" if any(issue["category"] == "Body / Exterior" for issue in matched_issues) else "Running Repair"
    logger_payload = {
        "matched_keywords": list(dict.fromkeys(matched_groups)),
        "matched_categories": [issue["category"] for issue in matched_issues],
        "service_codes": list(dict.fromkeys(service_codes)),
        "display_issues": [issue["title"] for issue in matched_issues],
    }
    logger.info(
        "Rule-based complaint output. Categories=%s Service codes=%s Display issues=%s.",
        logger_payload["matched_categories"],
        logger_payload["service_codes"],
        logger_payload["display_issues"],
    )
    return {
        "jobType": job_type,
        "issues": matched_issues,
        "priority": priority,
        "estTimeMins": est_time_mins,
        "recommendedServices": unique_services,
        "recommendedSpecialists": list(dict.fromkeys(specialists)),
        "severity": [item for item in dict.fromkeys(severity) if item],
        "serviceCodes": list(dict.fromkeys(service_codes)),
        "displayIssues": [issue["title"] for issue in matched_issues],
        "displayTime": f"~{round(est_time_mins / 60, 1)} hrs" if est_time_mins >= 120 else f"~{est_time_mins} mins",
        "matchedKeywords": list(dict.fromkeys(matched_groups)),
        "matchedFamilies": logger_payload["matched_categories"],
    }
