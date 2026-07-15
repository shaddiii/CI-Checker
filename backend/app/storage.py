from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import List, Optional

from . import config
from .models import AnalysisResult, CIProfile


def save_profile(profile: CIProfile) -> None:
    config.PROFILE_FILE.write_text(profile.model_dump_json(indent=2), encoding="utf-8")


def load_profile() -> Optional[CIProfile]:
    if not config.PROFILE_FILE.exists():
        return None
    data = json.loads(config.PROFILE_FILE.read_text(encoding="utf-8"))
    return CIProfile.model_validate(data)


def _safe_slug(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", text).strip("_")
    return slug[:max_len] or "asset"


def save_result(result: AnalysisResult) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    filename = f"{ts}_{_safe_slug(result.asset_name)}.json"
    path = config.HISTORY_DIR / filename
    path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
    return filename


def list_results(limit: int = 50) -> List[AnalysisResult]:
    files = sorted(config.HISTORY_DIR.glob("*.json"), reverse=True)[:limit]
    results = []
    for f in files:
        try:
            results.append(AnalysisResult.model_validate(json.loads(f.read_text(encoding="utf-8"))))
        except Exception:
            continue
    return results
