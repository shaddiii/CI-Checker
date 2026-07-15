from __future__ import annotations

import base64
import json
import re
from typing import Any, Dict, List, Optional

from anthropic import Anthropic

from . import config

_client: Optional[Anthropic] = None


def get_client() -> Anthropic:
    global _client
    if _client is None:
        if not config.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to your .env file "
                "(see .env.example)."
            )
        _client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    return _client


_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_to_json(text: str) -> str:
    text = _JSON_FENCE_RE.sub("", text.strip()).strip()
    # In case the model added any stray preamble/postamble, grab the
    # outermost {...} block.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return text


def call_json(
    system: str,
    user_content: List[Dict[str, Any]],
    max_tokens: int = 2000,
) -> Dict[str, Any]:
    """Calls Claude and parses the reply as JSON. Raises ValueError with the
    raw text included if parsing fails, so callers can surface a useful
    error instead of a silent empty result."""
    client = get_client()
    resp = client.messages.create(
        model=config.ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_content}],
    )
    text_blocks = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    raw = "\n".join(text_blocks)
    cleaned = _strip_to_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not parse model output as JSON: {e}\n---\n{raw}")


def image_content_block(image_bytes: bytes, media_type: str) -> Dict[str, Any]:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": base64.b64encode(image_bytes).decode("utf-8"),
        },
    }


def text_content_block(text: str) -> Dict[str, Any]:
    return {"type": "text", "text": text}
