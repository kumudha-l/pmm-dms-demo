import asyncio
import base64
import json
import os
import re
from urllib import error, request

from .logger import get_logger


logger = get_logger("gemini")


class GeminiServiceError(RuntimeError):
    pass


def _current_gemini_config() -> dict:
    return {
        "enabled": os.getenv("USE_GEMINI_AI", "true").lower() == "true",
        "api_key": os.getenv("OPENROUTER_API_KEY", "").strip(),
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip(),
        "model": os.getenv("LLM_MODEL", "google/gemini-2.5-flash").strip(),
        "timeout_secs": float(os.getenv("GEMINI_TIMEOUT_SECS", "12")),
    }


def gemini_enabled() -> bool:
    config = _current_gemini_config()
    return config["enabled"] and bool(config["api_key"])


def _extract_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


async def _post_chat_completion(payload: dict) -> dict:
    config = _current_gemini_config()
    if not (config["enabled"] and bool(config["api_key"])):
        raise GeminiServiceError("Gemini not configured.")

    def _send() -> dict:
        endpoint = f"{config['base_url'].rstrip('/')}/chat/completions"
        req = request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {config['api_key']}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "Popular Mega Motors Workshop DMS Demo",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=config["timeout_secs"]) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise GeminiServiceError(f"HTTP {exc.code}: {body}") from exc
        except Exception as exc:
            raise GeminiServiceError(str(exc)) from exc

        try:
            content = data["choices"][0]["message"]["content"]
            if isinstance(content, list):
                text_parts = [item.get("text", "") for item in content if isinstance(item, dict)]
                content = "".join(text_parts)
            return _extract_json(content)
        except Exception as exc:
            raise GeminiServiceError(f"Unable to parse Gemini response: {exc}") from exc

    return await asyncio.to_thread(_send)


def _image_part(image_bytes: bytes, mime_type: str) -> dict:
    data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    return {"type": "image_url", "image_url": {"url": data_url}}


async def extract_plate(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    logger.info("Gemini plate extraction request started.")
    config = _current_gemini_config()
    payload = {
        "model": config["model"],
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": 'Read this Indian vehicle number plate image and return JSON only: {"reg_number": "KL07AB1234", "confidence": 0.0} . Use null and 0.0 if unreadable.'},
                    _image_part(image_bytes, mime_type),
                ],
            }
        ],
    }
    return await _post_chat_completion(payload)


async def extract_odometer(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    logger.info("Gemini odometer extraction request started.")
    config = _current_gemini_config()
    payload = {
        "model": config["model"],
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": 'Read this vehicle odometer image and return JSON only: {"odometer_km": 15823, "confidence": 0.0} . Use null and 0.0 if unreadable.'},
                    _image_part(image_bytes, mime_type),
                ],
            }
        ],
    }
    return await _post_chat_completion(payload)


async def parse_complaint(text: str, advisor_observations: str = "", suggested_repairs: str = "") -> dict:
    logger.info("Gemini complaint analysis request started.")
    config = _current_gemini_config()
    prompt = f"""
You are structuring an automobile workshop complaint for an Indian dealership DMS.
Return strict JSON only with these keys:
jobType, issues, severity, priority, serviceCodes, recommendedServices, recommendedSpecialists, estTimeMins, displayIssues, displayTime.

Complaint text: {text}
Advisor observations: {advisor_observations}
Suggested repairs: {suggested_repairs}

Rules:
- jobType must be one of: Free Service, Body Shop, Running Repair
- issues must be an array of objects with category, title, priority
- severity must be an array like ["Brake - High", "AC - Medium"]
- priority must be one of: P1 - Urgent, P2 - Same Day, P3 - Standard
- serviceCodes must be short display codes like FS-02, BR-INSP, AC-CHK
- recommendedServices must use backend service codes like LAB-BRAKE-INSPECT
- recommendedSpecialists must be existing workshop roles
- estTimeMins must be integer minutes
- displayIssues must be human-readable issue titles
- displayTime must look like "~3.5 hrs" or "~90 mins"
"""
    payload = {
        "model": config["model"],
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "user", "content": prompt}],
    }
    return await _post_chat_completion(payload)
