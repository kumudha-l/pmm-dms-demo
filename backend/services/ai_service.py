import os
import re

from . import mock_ai
from .gemini_service import GeminiServiceError, gemini_enabled
from .gemini_service import extract_odometer as gemini_extract_odometer
from .gemini_service import extract_plate as gemini_extract_plate
from .gemini_service import parse_complaint as gemini_parse_complaint
from .logger import get_logger


logger = get_logger("ai")


def _normalize_reg_no(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    return normalized


def _valid_reg_no(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Z0-9]{8,12}", value))


def _normalize_km(value) -> int | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    digits = re.sub(r"[^0-9]", "", str(value))
    return int(digits) if digits else None


def _normalize_confidence(value) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(confidence, 1.0))


def _build_analysis_text(text: str, advisor_observations: str = "", suggested_repairs: str = "") -> str:
    combined = " | ".join(part.strip() for part in [text, advisor_observations, suggested_repairs] if part and part.strip())
    return combined.strip()


def _issue_tokens(result: dict) -> list[str]:
    tokens = []
    for issue in result.get("issues", []):
        if isinstance(issue, dict):
            tokens.extend([str(issue.get("category", "")).lower(), str(issue.get("title", "")).lower()])
        else:
            tokens.append(str(issue).lower())
    tokens.extend(str(item).lower() for item in result.get("displayIssues", []))
    tokens.extend(str(item).lower() for item in result.get("severity", []))
    tokens.extend(str(item).lower() for item in result.get("serviceCodes", []))
    return [token for token in tokens if token]


def _matches_input_semantics(result: dict, analysis_text: str) -> bool:
    normalized_text = mock_ai._normalize_text(analysis_text)
    matched_keywords = mock_ai.matched_rule_keywords(analysis_text)
    if not matched_keywords:
        return True
    tokens = _issue_tokens(result)
    keyword_to_family = {
        "brake": "brake", "break": "brake", "stopping": "brake", "brake disc": "brake", "disc brake": "brake", "rotor": "brake", "pad wear": "brake", "brake pad": "brake",
        "align": "alignment", "alignment": "alignment", "pull": "alignment", "tyre wear": "alignment", "vibration": "alignment",
        "ac": "ac", "cooling": "ac", "blower": "ac", "hvac": "ac",
        "discharged battery": "battery", "dead battery": "battery", "battery weak": "battery", "battery drain": "battery", "battery": "battery", "warning light": "battery", "electrical": "battery", "fuse": "battery",
        "engine overheating": "engine", "overheating": "engine", "engine noise": "engine", "noisy engine": "engine", "knocking": "engine", "rough engine": "engine", "engine sound": "engine",
        "engine oil change": "service", "oil change": "service", "engine oil": "service", "service": "service", "periodic": "service", "oil": "service", "free service": "service", "1st service": "service", "2nd service": "service", "3rd service": "service",
        "scratch": "body", "body": "body", "polish": "body", "bumper": "body", "mudguard": "body", "fender": "body", "body panel": "body",
    }
    required_families = {keyword_to_family.get(keyword, keyword) for keyword in matched_keywords if keyword_to_family.get(keyword, keyword)}
    token_blob = " ".join(tokens)
    family_synonyms = {
        "brake": ["brake", "br-pad", "br-insp"],
        "alignment": ["align", "alignment", "balancing", "wa-chk", "wb-chk"],
        "ac": ["ac", "cooling", "ac-chk", "ac-srv"],
        "battery": ["battery", "electrical", "warning", "el-diag", "bat-chk", "scan"],
        "engine": ["engine", "knocking", "noise", "overheating", "eng-diag", "scan"],
        "service": ["service", "periodic", "oil", "oil-srv", "fs-02"],
        "body": ["body", "mudguard", "fender", "polish", "bd-rep", "pol-ext"],
    }
    matched_families = {family for family, synonyms in family_synonyms.items() if any(syn in token_blob for syn in synonyms)}
    logger.info("Complaint semantic check. Input families=%s, result families=%s.", sorted(required_families), sorted(matched_families))
    return bool(required_families & matched_families)


async def extract_plate(filename: str, image_bytes: bytes, mime_type: str) -> dict:
    basename = os.path.basename(filename)
    logger.info("Plate extraction started for %s.", basename)
    if gemini_enabled():
        try:
            result = await gemini_extract_plate(image_bytes, mime_type)
            reg_no = _normalize_reg_no(result.get("reg_number") or result.get("regNo"))
            confidence = _normalize_confidence(result.get("confidence"))
            if _valid_reg_no(reg_no):
                logger.info("Gemini plate extraction succeeded for %s with %s.", basename, reg_no)
                return {"regNo": reg_no, "confidence": confidence}
            logger.warning("Gemini plate extraction returned invalid output for %s. Falling back.", basename)
        except GeminiServiceError as exc:
            logger.warning("Gemini plate extraction failed for %s: %s. Falling back to manual mapping.", basename, exc)
    else:
        logger.info("Gemini plate extraction skipped for %s because configuration is missing. Using manual mapping.", basename)
    fallback = await mock_ai.extract_plate(filename)
    logger.info("Manual plate mapping used for %s -> %s.", basename, fallback.get("regNo"))
    return fallback


async def extract_odometer(filename: str, image_bytes: bytes, mime_type: str) -> dict:
    basename = os.path.basename(filename)
    logger.info("Odometer extraction started for %s.", basename)
    if gemini_enabled():
        try:
            result = await gemini_extract_odometer(image_bytes, mime_type)
            km = _normalize_km(result.get("odometer_km") or result.get("km"))
            confidence = _normalize_confidence(result.get("confidence"))
            if km is not None and km >= 0:
                logger.info("Gemini odometer extraction succeeded for %s with %s km.", basename, km)
                return {"km": km, "confidence": confidence}
            logger.warning("Gemini odometer extraction returned invalid output for %s. Falling back.", basename)
        except GeminiServiceError as exc:
            logger.warning("Gemini odometer extraction failed for %s: %s. Falling back to manual mapping.", basename, exc)
    else:
        logger.info("Gemini odometer extraction skipped for %s because configuration is missing. Using manual mapping.", basename)
    fallback = await mock_ai.extract_odometer(filename)
    logger.info("Manual odometer mapping used for %s -> %s km.", basename, fallback.get("km"))
    return fallback


async def parse_complaint(text: str, advisor_observations: str = "", suggested_repairs: str = "") -> dict:
    analysis_text = _build_analysis_text(text, advisor_observations, suggested_repairs)
    logger.info("Complaint analysis started with normalized input: %s", analysis_text)
    if gemini_enabled():
        try:
            result = await gemini_parse_complaint(text, advisor_observations, suggested_repairs)
            if result.get("jobType") and isinstance(result.get("issues"), list) and _matches_input_semantics(result, analysis_text):
                logger.info("Gemini complaint analysis succeeded with %s issues.", len(result.get("issues", [])))
                return {
                    "jobType": result.get("jobType", "Running Repair"),
                    "issues": result.get("issues", []),
                    "priority": result.get("priority", "P3 - Standard"),
                    "estTimeMins": int(result.get("estTimeMins", 60) or 60),
                    "recommendedServices": list(dict.fromkeys(result.get("recommendedServices", []))),
                    "recommendedSpecialists": list(dict.fromkeys(result.get("recommendedSpecialists", []))),
                    "severity": list(dict.fromkeys(result.get("severity", []))),
                    "serviceCodes": list(dict.fromkeys(result.get("serviceCodes", []))),
                    "displayIssues": result.get("displayIssues") or [item.get("title", "Issue") for item in result.get("issues", []) if isinstance(item, dict)],
                    "displayTime": result.get("displayTime") or f"~{round(int(result.get('estTimeMins', 60) or 60) / 60, 1)} hrs",
                }
            logger.warning("Gemini complaint analysis rejected as semantically mismatched; using fallback.")
        except GeminiServiceError as exc:
            logger.warning("Gemini complaint analysis failed: %s. Falling back to rule-based parser.", exc)
    else:
        logger.info("Gemini complaint analysis skipped because configuration is missing. Using rule-based parser.")
    fallback = await mock_ai.parse_complaint(analysis_text)
    logger.info(
        "Rule-based complaint analysis used with %s issues. Matched keywords: %s | Service codes: %s | Display issues: %s",
        len(fallback.get("issues", [])),
        fallback.get("matchedKeywords", []),
        fallback.get("serviceCodes", []),
        fallback.get("displayIssues", []),
    )
    return fallback
