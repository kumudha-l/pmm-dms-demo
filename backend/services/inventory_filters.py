from collections.abc import Iterable

from .logger import get_logger


logger = get_logger("inventory")

COMMON_SERVICE_CATEGORIES = ["Filters", "Lubricants", "Fluids"]
COMMON_SERVICE_PARTS = ["Engine Oil 5W30", "Oil Filter", "Air Filter", "Cabin Filter", "Coolant 1L"]

KEYWORD_RULES = [
    {
        "family": "brake",
        "keywords": ["brake", "brake noise", "brake pad", "pad wear", "rotor", "stopping"],
        "categories": ["Brake"],
        "parts": ["Front Brake Pad Set", "Rear Brake Shoe Set", "Brake Fluid DOT4"],
    },
    {
        "family": "alignment",
        "keywords": ["alignment", "wheel alignment", "balancing", "pull", "tyre wear", "vibration"],
        "categories": ["Tyre", "Steering", "Suspension"],
        "parts": ["Wheel Balancing Weight Kit", "Tie Rod End", "Front Shock Absorber", "Wheel Bearing Kit"],
    },
    {
        "family": "ac",
        "keywords": ["ac", "cooling", "blower", "hvac"],
        "categories": ["AC"],
        "parts": ["AC Refrigerant Gas", "AC Filter"],
    },
    {
        "family": "battery",
        "keywords": ["battery", "discharged battery", "dead battery", "battery weak", "battery drain", "starting issue", "charging issue"],
        "categories": ["Electrical"],
        "parts": ["45AH Battery", "Fuse Box Assembly"],
    },
    {
        "family": "engine_diagnostics",
        "keywords": ["engine noise", "noisy engine", "rough engine", "knocking", "engine overheating", "overheating", "engine sound"],
        "categories": ["Engine", "Fluids"],
        "parts": ["Spark Plug Set", "Coolant 1L"],
    },
    {
        "family": "oil_service",
        "keywords": ["engine oil change", "oil change", "engine oil", "periodic service", "service", "free service"],
        "categories": COMMON_SERVICE_CATEGORIES,
        "parts": ["Engine Oil 5W30", "Oil Filter", "Air Filter", "Cabin Filter", "Coolant 1L"],
    },
    {
        "family": "body",
        "keywords": ["body", "mudguard", "fender", "bumper", "scratch", "body panel"],
        "categories": ["Body / Exterior"],
        "parts": ["Headlamp Unit", "Bumper Clip Kit"],
    },
    {
        "family": "detailing",
        "keywords": ["polish", "cleaning", "washing", "underbody coating"],
        "categories": ["Detailing"],
        "parts": ["Polishing Compound", "Foam Wash Shampoo", "Underbody Coating Can"],
    },
]

SERVICE_CODE_RULES = {
    "BR-": {"family": "brake", "categories": ["Brake"], "parts": ["Front Brake Pad Set", "Rear Brake Shoe Set", "Brake Fluid DOT4"]},
    "WA-": {"family": "alignment", "categories": ["Tyre", "Steering", "Suspension"], "parts": ["Wheel Balancing Weight Kit", "Tie Rod End", "Front Shock Absorber", "Wheel Bearing Kit"]},
    "WB-": {"family": "alignment", "categories": ["Tyre"], "parts": ["Wheel Balancing Weight Kit"]},
    "AC-": {"family": "ac", "categories": ["AC"], "parts": ["AC Refrigerant Gas", "AC Filter"]},
    "EL-": {"family": "battery", "categories": ["Electrical"], "parts": ["45AH Battery", "Fuse Box Assembly"]},
    "SCAN": {"family": "engine_diagnostics", "categories": ["Engine", "Electrical"], "parts": ["Spark Plug Set", "Coolant 1L", "Fuse Box Assembly"]},
    "FS-": {"family": "oil_service", "categories": COMMON_SERVICE_CATEGORIES, "parts": COMMON_SERVICE_PARTS},
    "ENG-": {"family": "engine_diagnostics", "categories": ["Engine", "Fluids"], "parts": ["Spark Plug Set", "Coolant 1L"]},
    "BAT-": {"family": "battery", "categories": ["Electrical"], "parts": ["45AH Battery", "Fuse Box Assembly"]},
    "BD-": {"family": "body", "categories": ["Body / Exterior"], "parts": ["Headlamp Unit", "Bumper Clip Kit"]},
    "POL-": {"family": "detailing", "categories": ["Detailing"], "parts": ["Polishing Compound", "Foam Wash Shampoo", "Underbody Coating Can"]},
    "GEN-": {"family": "oil_service", "categories": COMMON_SERVICE_CATEGORIES, "parts": COMMON_SERVICE_PARTS},
}

SELECTED_SERVICE_RULES = {
    "periodic service": {"categories": COMMON_SERVICE_CATEGORIES, "parts": COMMON_SERVICE_PARTS},
    "electrical diagnosis": {"categories": ["Electrical"], "parts": ["45AH Battery", "Fuse Box Assembly"]},
    "diagnostic scan": {"categories": ["Engine", "Electrical"], "parts": ["Spark Plug Set", "Coolant 1L", "Fuse Box Assembly"]},
    "brake inspection": {"categories": ["Brake"], "parts": ["Front Brake Pad Set", "Rear Brake Shoe Set", "Brake Fluid DOT4"]},
    "brake pad replacement": {"categories": ["Brake"], "parts": ["Front Brake Pad Set", "Rear Brake Shoe Set"]},
    "wheel alignment": {"categories": ["Tyre", "Steering", "Suspension"], "parts": ["Wheel Balancing Weight Kit", "Tie Rod End", "Front Shock Absorber", "Wheel Bearing Kit"]},
    "wheel balancing": {"categories": ["Tyre"], "parts": ["Wheel Balancing Weight Kit"]},
    "ac diagnosis": {"categories": ["AC"], "parts": ["AC Refrigerant Gas", "AC Filter"]},
    "ac service": {"categories": ["AC"], "parts": ["AC Refrigerant Gas", "AC Filter"]},
    "minor body repair": {"categories": ["Body / Exterior"], "parts": ["Headlamp Unit", "Bumper Clip Kit"]},
    "exterior polishing": {"categories": ["Detailing"], "parts": ["Polishing Compound", "Foam Wash Shampoo"]},
    "interior cleaning": {"categories": ["Detailing"], "parts": ["Foam Wash Shampoo"]},
}


def _tokens(values: Iterable[str]) -> list[str]:
    return [str(value).strip().lower() for value in values if str(value).strip()]


def _append_unique(target: list[str], values: Iterable[str]) -> None:
    for value in values:
        if value not in target:
            target.append(value)


def infer_inventory_filters(issues: Iterable[str] | None = None, service_codes: Iterable[str] | None = None, selected_services: Iterable[str] | None = None) -> dict:
    categories: list[str] = []
    parts: list[str] = []
    families: list[str] = []
    all_issue_tokens = _tokens(issues or [])
    all_service_tokens = _tokens(selected_services or [])
    all_codes = [str(code).strip().upper() for code in (service_codes or []) if str(code).strip()]

    for token in [*all_issue_tokens, *all_service_tokens]:
        for rule in KEYWORD_RULES:
            if any(keyword in token for keyword in rule["keywords"]):
                _append_unique(categories, rule["categories"])
                _append_unique(parts, rule["parts"])
                _append_unique(families, [rule["family"]])

    for token in all_service_tokens:
        for label, mapped in SELECTED_SERVICE_RULES.items():
            if label in token:
                _append_unique(categories, mapped["categories"])
                _append_unique(parts, mapped["parts"])

    for code in all_codes:
        for prefix, mapped in SERVICE_CODE_RULES.items():
            if code.startswith(prefix):
                _append_unique(categories, mapped["categories"])
                _append_unique(parts, mapped["parts"])
                _append_unique(families, [mapped["family"]])

    if parts or categories:
        logger.info(
            "Inventory filters resolved. Families=%s Categories=%s Parts=%s.",
            ", ".join(families) or "None",
            ", ".join(categories) or "None",
            ", ".join(parts) or "None",
        )
        return {"categories": categories, "part_names": parts, "families": families, "fallback": False}

    logger.info("No issue/service inventory mapping found. Falling back to minimal common items.")
    return {
        "categories": COMMON_SERVICE_CATEGORIES.copy(),
        "part_names": COMMON_SERVICE_PARTS.copy(),
        "families": ["common_service"],
        "fallback": True,
    }
