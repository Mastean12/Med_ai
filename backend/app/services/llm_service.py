import json
import re
import time
import logging
from typing import Optional, Dict, Any, List

import httpx
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger("noctual.llm")

MAX_RETRIES = 2
RETRY_BACKOFF = 1.2
TOKEN_SAFETY_MARGIN = 0.9


class LLMErrorCategory:
    AUTH = "auth_error"
    RATE_LIMIT = "rate_limit"
    MODEL_OVERLOAD = "model_overload"
    CONTENT_FILTER = "content_filter"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


def _categorize_error(status_code: int, response_body: Dict[str, Any]) -> str:
    """Map API error responses to categories for structured handling."""
    if status_code == 401:
        return LLMErrorCategory.AUTH
    if status_code == 429:
        return LLMErrorCategory.RATE_LIMIT
    if status_code == 503 or status_code == 529:
        return LLMErrorCategory.MODEL_OVERLOAD

    error_msg = str(response_body).lower()
    if "content filter" in error_msg or "safety" in error_msg:
        return LLMErrorCategory.CONTENT_FILTER

    return LLMErrorCategory.UNKNOWN


def _build_messages(
    system_prompt: str,
    user_prompt: str,
    conversation: Optional[List[Dict[str, str]]] = None,
) -> List[Dict[str, str]]:
    """Build the messages array including optional conversation history."""
    messages = [{"role": "system", "content": system_prompt}]
    if conversation:
        messages.extend(conversation)
    messages.append({"role": "user", "content": user_prompt})
    return messages


async def generate_llm_response(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.2,
    max_tokens: Optional[int] = None,
    model: Optional[str] = None,
    conversation: Optional[List[Dict[str, str]]] = None,
    response_format: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Production-grade LLM call to DeepSeek API.

    Features:
    - Configurable model/temperature/tokens
    - Automatic retry with exponential backoff
    - Structured error categorization
    - JSON mode support (response_format)
    - Conversation history support
    - Request/response logging
    - Rate-limit aware backoff

    Raises HTTPException with categorized detail on failure.
    """
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DeepSeek API key")

    model_name = model or settings.DEEPSEEK_MODEL
    base_url = settings.DEEPSEEK_BASE_URL.rstrip("/")
    url = f"{base_url}/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    messages = _build_messages(system_prompt, user_prompt, conversation)

    payload: Dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
    }

    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if response_format is not None:
        payload["response_format"] = response_format

    last_error: Optional[HTTPException] = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                res = await client.post(url, headers=headers, json=payload)

            data = res.json()

            if res.status_code == 200:
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})
                logger.info(
                    "LLM call success | model=%s attempt=%d/%d "
                    "prompt_tokens=%s completion_tokens=%s total_tokens=%s",
                    model_name,
                    attempt + 1,
                    MAX_RETRIES + 1,
                    usage.get("prompt_tokens", "?"),
                    usage.get("completion_tokens", "?"),
                    usage.get("total_tokens", "?"),
                )
                return content

            category = _categorize_error(res.status_code, data)

            if category == LLMErrorCategory.RATE_LIMIT:
                wait = (RETRY_BACKOFF ** attempt) * 10
                logger.warning(
                    "Rate limited, attempt %d/%d, waiting %.1fs",
                    attempt + 1,
                    MAX_RETRIES + 1,
                    wait,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)
                    continue

            if category == LLMErrorCategory.MODEL_OVERLOAD:
                wait = (RETRY_BACKOFF ** attempt) * 3
                logger.warning(
                    "Model overloaded, attempt %d/%d, waiting %.1fs",
                    attempt + 1,
                    MAX_RETRIES + 1,
                    wait,
                )
                if attempt < MAX_RETRIES:
                    time.sleep(wait)
                    continue

            logger.error(
                "LLM API error | status=%d category=%s body=%s",
                res.status_code,
                category,
                str(data)[:500],
            )

            last_error = HTTPException(
                status_code=502 if res.status_code >= 500 else 500,
                detail={"error": data, "category": category},
            )

            if category in (LLMErrorCategory.AUTH, LLMErrorCategory.CONTENT_FILTER):
                break

        except httpx.TimeoutException:
            logger.error("LLM timeout on attempt %d/%d", attempt + 1, MAX_RETRIES + 1)
            last_error = HTTPException(
                status_code=504,
                detail={
                    "error": "LLM request timed out after 90s",
                    "category": LLMErrorCategory.TIMEOUT,
                },
            )
            if attempt < MAX_RETRIES:
                continue

        except httpx.HTTPStatusError as e:
            logger.error("HTTP error: %s", str(e)[:500])
            last_error = HTTPException(
                status_code=502,
                detail={
                    "error": str(e),
                    "category": LLMErrorCategory.UNKNOWN,
                },
            )

        except Exception as e:
            logger.error("Unexpected LLM error: %s", str(e)[:500])
            last_error = HTTPException(
                status_code=500,
                detail={
                    "error": f"DeepSeek request failed: {e}",
                    "category": LLMErrorCategory.UNKNOWN,
                },
            )

        if attempt >= MAX_RETRIES:
            break

    if last_error:
        raise last_error

    raise HTTPException(
        status_code=500,
        detail={"error": "Unknown LLM failure", "category": LLMErrorCategory.UNKNOWN},
    )


def _extract_json(text: str) -> str:
    """
    Robust JSON extraction from LLM output.
    Handles markdown code blocks, leading/trailing text, and common quirks.
    """
    cleaned = text.strip()

    # Strip markdown code block fences: ```json ... ```
    md_patterns = [
        (r'```json\s*\n', r'```'),
        (r'```\s*\n', r'```'),
        (r'```json\s*', r'```'),
        (r'```\s*', r'```'),
    ]
    for start_pat, end_pat in md_patterns:
        m = re.search(start_pat, cleaned)
        if m:
            end_m = re.search(end_pat, cleaned[m.end():])
            if end_m:
                cleaned = cleaned[m.end():m.end() + end_m.start()].strip()
                break

    # Find the outermost JSON structure
    start_curly = cleaned.find("{")
    start_square = cleaned.find("[")
    start_backtick = cleaned.find("```")

    # Skip leading backticks
    if start_backtick != -1 and (start_curly == -1 or start_backtick < start_curly) and (start_square == -1 or start_backtick < start_square):
        end_backtick = cleaned.find("```", start_backtick + 3)
        if end_backtick != -1:
            cleaned = cleaned[start_backtick + 3:end_backtick].strip()
            start_curly = cleaned.find("{")
            start_square = cleaned.find("[")

    if start_square != -1 and (start_curly == -1 or start_square < start_curly):
        start_idx = start_square
        end_char = "]"
    elif start_curly != -1:
        start_idx = start_curly
        end_char = "}"
    else:
        return ""

    end_idx = cleaned.rfind(end_char)
    if start_idx == -1 or end_idx == -1:
        return ""

    return cleaned[start_idx : end_idx + 1]


async def generate_llm_json(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.1,
    model: Optional[str] = None,
    fallback_parse: bool = True,
) -> Any:
    """
    Generate a structured JSON response from the LLM.

    DeepSeek does not support response_format json_object.
    Instead, the system prompt must instruct JSON output, and this
    function robustly extracts + parses the JSON from the reply.

    Args:
        system_prompt: System instructions (must specify JSON format)
        user_prompt: User message
        temperature: Low temperature for deterministic JSON (default 0.1)
        model: Model override
        fallback_parse: If True, retries without JSON directive on first failure

    Returns:
        Parsed JSON (dict or list)

    Raises:
        HTTPException if response is not valid JSON after all attempts
    """
    json_directive = "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanations, no code fences. Start your response with { or [."

    last_error = None

    for attempt in range(3):
        try:
            raw = await generate_llm_response(
                system_prompt=system_prompt + json_directive,
                user_prompt=user_prompt,
                temperature=temperature,
                model=model,
            )
        except HTTPException as e:
            last_error = e
            if not fallback_parse and attempt >= 1:
                raise
            json_directive = "\n\nYou MUST output ONLY raw JSON. Just the JSON object. Nothing else."
            continue

        extracted = _extract_json(raw)
        if not extracted:
            last_error = HTTPException(
                status_code=500,
                detail="LLM response did not contain valid JSON brackets",
            )
            json_directive = "\n\nCRITICAL: Output ONLY a JSON array starting with [ or JSON object starting with {. No other text."
            continue

        try:
            return json.loads(extracted)
        except json.JSONDecodeError as e:
            last_error = HTTPException(
                status_code=500,
                detail=f"JSON parse error at position {e.pos}: {str(e)[:200]}",
            )
            logger.warning(
                "JSON parse attempt %d failed: %s | raw=%s",
                attempt + 1, str(e)[:200], raw[:300]
            )
            continue

    if last_error:
        raise last_error

    raise HTTPException(
        status_code=500,
        detail="Failed to extract valid JSON from LLM response after 3 attempts",
    )


async def generate_llm_response_streaming(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.2,
    model: Optional[str] = None,
    conversation: Optional[List[Dict[str, str]]] = None,
):
    """
    Streaming variant for real-time answer delivery.
    Yields text chunks as they arrive from DeepSeek.

    Usage:
        async for chunk in generate_llm_response_streaming(...):
            yield chunk
    """
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="Missing DeepSeek API key")

    model_name = model or settings.DEEPSEEK_MODEL
    base_url = settings.DEEPSEEK_BASE_URL.rstrip("/")
    url = f"{base_url}/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }

    messages = _build_messages(system_prompt, user_prompt, conversation)

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST", url, headers=headers, json=payload
            ) as response:
                if response.status_code != 200:
                    data = await response.aread()
                    raise HTTPException(
                        status_code=502,
                        detail=f"DeepSeek stream error ({response.status_code}): {data[:500]}",
                    )

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break

                    try:
                        chunk_data = json.loads(data_str)
                        delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Streaming LLM error: %s", str(e)[:500])
        raise HTTPException(
            status_code=500,
            detail=f"DeepSeek streaming failed: {e}",
        )
