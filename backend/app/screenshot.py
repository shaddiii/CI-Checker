"""Best-effort screenshot capture for URL assets.

If Playwright (or its browser binaries) is not installed, URL checks fall
back to the HTML/CSS-only analysis in asset_analysis.py - this module never
raises on import, only when a screenshot is actually attempted.
"""
from __future__ import annotations

import io

from PIL import Image

try:
    from playwright.sync_api import sync_playwright

    _IMPORT_OK = True
except Exception:  # pragma: no cover - exercised when playwright isn't installed
    _IMPORT_OK = False

VIEWPORT_WIDTH = 1280
VIEWPORT_HEIGHT = 900
MAX_SCREENSHOT_HEIGHT = 6000  # cap very long full-page screenshots


def is_available() -> bool:
    return _IMPORT_OK


def _cap_height(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    if img.height <= MAX_SCREENSHOT_HEIGHT:
        return image_bytes
    ratio = MAX_SCREENSHOT_HEIGHT / img.height
    new_size = (max(1, int(img.width * ratio)), MAX_SCREENSHOT_HEIGHT)
    resized = img.convert("RGB").resize(new_size)
    buf = io.BytesIO()
    resized.save(buf, format="PNG")
    return buf.getvalue()


def capture_screenshot(url: str, timeout_ms: int = 20000, full_page: bool = True) -> bytes:
    """Renders the page in headless Chromium and returns a PNG screenshot.

    Raises RuntimeError / playwright.Error if Playwright, its browser
    binaries, or the page load itself is unavailable - callers should catch
    broadly and degrade to a note rather than failing the whole asset check.
    """
    if not _IMPORT_OK:
        raise RuntimeError(
            "Playwright is not installed. Run 'pip install playwright' and "
            "'playwright install --with-deps chromium' to enable visual URL checks."
        )

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(
                viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT}
            )
            try:
                page.goto(url, timeout=timeout_ms, wait_until="networkidle")
            except Exception:
                # Navigation didn't fully settle (e.g. persistent websockets,
                # analytics beacons) - the page has very likely still
                # rendered enough to screenshot, so we proceed instead of
                # failing the whole check.
                pass
            raw = page.screenshot(full_page=full_page)
        finally:
            browser.close()

    return _cap_height(raw)
