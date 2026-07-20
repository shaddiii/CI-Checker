"""Minimal in-memory background job tracker.

Long-running work (PDF+Claude extraction, image/text/URL compliance checks)
runs in a background thread instead of inside the HTTP request itself, so a
slow Claude response can never trigger a proxy/browser timeout on the
request. The frontend polls GET /api/jobs/{job_id} until status is "done"
or "error".

In-memory is fine here: jobs are short-lived (seconds to ~1-2 minutes) and
only need to survive the polling window, not a server restart.
"""
from __future__ import annotations

import threading
import traceback
import uuid
from typing import Any, Callable, Dict, Optional

_jobs: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()


def create_job() -> str:
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {"status": "processing", "result": None, "error": None}
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _jobs.get(job_id)
        return dict(job) if job else None


def run_in_background(job_id: str, fn: Callable[[], Any]) -> None:
    def _runner():
        try:
            result = fn()
            with _lock:
                _jobs[job_id] = {"status": "done", "result": result, "error": None}
        except Exception as e:
            with _lock:
                _jobs[job_id] = {
                    "status": "error",
                    "result": None,
                    "error": str(e) or traceback.format_exc(limit=1),
                }

    threading.Thread(target=_runner, daemon=True).start()
