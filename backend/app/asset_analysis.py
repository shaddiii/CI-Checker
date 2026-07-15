from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List

import requests
from bs4 import BeautifulSoup

from . import llm_client, screenshot
from .color_utils import get_dominant_colors, nearest_palette_color
from .config import COLOR_MATCH_THRESHOLD, SCREENSHOT_TIMEOUT_MS, URL_SCREENSHOT_ENABLED
from .models import AnalysisResult, CIProfile, Issue

HEX_IN_TEXT_RE = re.compile(r"#[0-9a-fA-F]{6}\b")
FONT_FAMILY_RE = re.compile(r"font-family\s*:\s*([^;}\n]+)", re.IGNORECASE)

VISION_SYSTEM_PROMPT = """You are a meticulous corporate design / brand compliance
auditor. You will be shown one marketing asset (an image: e.g. a social media
post, banner, ad, or a webpage screenshot) together with the brand's Corporate
Identity profile as JSON. Check the image against the profile for:
 1. Logo usage (placement, clear space, distortion, incorrect variant) - only
    if a logo is visible or the rules clearly imply one should be
 2. Color usage vs the approved palette
 3. Typography look and feel (typeface family/style/weight impression,
    hierarchy) - do your best visual judgement, flag only clear mismatches
 4. Imagery / photography style vs the described style
 5. Button / CTA styling and wording, if any CTA/button is visible
 6. Layout & spacing conventions, only if the guide gives concrete rules

Only report issues you can actually support from what is visible in the image
and what is stated in the profile. Do not invent violations, and do not
comment on categories the profile gives no information about. If everything
checked looks compliant, return an empty issues list.

Output ONLY valid JSON (no markdown fences, no commentary):
{"issues": [{"category": "logo|color|typography|imagery|cta|layout",
"severity": "critical|minor", "message": string, "expected": string|null,
"found": string|null}], "summary": string}

severity guide: "critical" = a clear, unmistakable violation of an explicit
brand rule (e.g. wrong logo color, forbidden imagery style, palette entirely
ignored). "minor" = a small deviation, inconsistency, or something worth a
designer's second look but not a hard rule break.
"""

TEXT_SYSTEM_PROMPT = """You are a meticulous corporate design / brand compliance
auditor focused on verbal identity. You will be given the brand's tone-of-voice
and CTA rules as JSON, and a piece of marketing copy. Check the copy for:
 - tone of voice vs the described tone/keywords
 - use of any forbidden words, or wrong terms where a preferred term exists
 - CTA / button phrasing vs the described CTA style, if the text contains a
   call to action
 - any other clearly stated verbal-identity rule in the profile

Only flag issues that are actually supported by the profile - if the profile
has no voice/CTA rules, say so in the summary rather than inventing rules.

Output ONLY valid JSON (no markdown fences, no commentary):
{"issues": [{"category": "voice|cta", "severity": "critical|minor",
"message": string, "expected": string|null, "found": string|null}],
"summary": string}
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _verdict_from_issues(issues: List[Issue]) -> str:
    if any(i.severity == "critical" for i in issues):
        return "red"
    if issues:
        return "yellow"
    return "green"


def _color_issue_from_image(dominant_hexes: List[str], profile: CIProfile) -> List[Issue]:
    palette = [c.hex for c in profile.colors]
    if not palette:
        return []
    matches = 0
    worst_examples = []
    for hexc in dominant_hexes:
        nearest, dist = nearest_palette_color(hexc, palette)
        if dist is not None and dist <= COLOR_MATCH_THRESHOLD:
            matches += 1
        else:
            worst_examples.append((hexc, nearest, dist))

    if matches == 0:
        examples = ", ".join(h for h, _, _ in worst_examples[:3])
        return [
            Issue(
                category="color",
                severity="critical",
                message=(
                    "None of the dominant colors in this asset match the "
                    "approved CI color palette."
                ),
                expected=", ".join(palette),
                found=examples,
            )
        ]
    if matches < len(dominant_hexes):
        examples = ", ".join(h for h, _, _ in worst_examples[:3])
        return [
            Issue(
                category="color",
                severity="minor",
                message=(
                    "Some dominant colors in this asset are noticeably off "
                    "from the closest approved CI palette color."
                ),
                expected=", ".join(palette),
                found=examples,
            )
        ]
    return []


def _vision_check(image_bytes: bytes, media_type: str, profile: CIProfile) -> tuple[List[Issue], str]:
    """Runs Claude's visual brand-compliance check on one image. Shared by
    direct image asset uploads and rendered URL screenshots. Never raises -
    a failure becomes a single minor issue so the rest of the check can
    still complete."""
    issues: List[Issue] = []
    summary = ""
    try:
        result = llm_client.call_json(
            system=VISION_SYSTEM_PROMPT,
            user_content=[
                llm_client.text_content_block(
                    f"CI PROFILE JSON:\n{profile.model_dump_json(indent=2)}"
                ),
                llm_client.image_content_block(image_bytes, media_type),
            ],
            max_tokens=2000,
        )
        for issue in result.get("issues", []):
            issues.append(Issue(**issue))
        summary = result.get("summary", "")
    except Exception as e:
        issues.append(
            Issue(
                category="layout",
                severity="minor",
                message=f"Visual brand-compliance check could not be completed: {e}",
            )
        )
    return issues, summary


def analyze_image_bytes(
    image_bytes: bytes, media_type: str, profile: CIProfile, asset_name: str
) -> AnalysisResult:
    issues: List[Issue] = []

    try:
        dominant = get_dominant_colors(image_bytes, n=6)
        issues += _color_issue_from_image(dominant, profile)
    except Exception as e:
        issues.append(
            Issue(
                category="color",
                severity="minor",
                message=f"Automatic color extraction failed: {e}",
            )
        )

    vision_issues, vision_summary = _vision_check(image_bytes, media_type, profile)
    issues += vision_issues

    verdict = _verdict_from_issues(issues)
    summary = vision_summary or {
        "green": "No CI deviations detected.",
        "yellow": "Minor CI inconsistencies detected.",
        "red": "Significant CI deviations detected.",
    }[verdict]

    return AnalysisResult(
        asset_name=asset_name,
        asset_type="image",
        verdict=verdict,
        issues=issues,
        summary=summary,
        timestamp=_now(),
    )


def analyze_text(text: str, profile: CIProfile, asset_name: str) -> AnalysisResult:
    issues: List[Issue] = []
    summary = ""
    try:
        voice_payload = {
            "voice": profile.voice.model_dump(),
            "typography_rules": profile.typography.rules,
        }
        result = llm_client.call_json(
            system=TEXT_SYSTEM_PROMPT,
            user_content=[
                llm_client.text_content_block(
                    f"CI VOICE/CTA RULES JSON:\n{voice_payload}\n\n"
                    f"TEXT TO CHECK:\n---\n{text}\n---"
                )
            ],
            max_tokens=1500,
        )
        for issue in result.get("issues", []):
            issues.append(Issue(**issue))
        summary = result.get("summary", "")
    except Exception as e:
        issues.append(
            Issue(
                category="voice",
                severity="minor",
                message=f"Tone-of-voice check could not be completed: {e}",
            )
        )

    verdict = _verdict_from_issues(issues)
    summary = summary or {
        "green": "Copy matches the brand's verbal identity.",
        "yellow": "Minor tone/CTA inconsistencies detected.",
        "red": "Significant verbal-identity deviations detected.",
    }[verdict]

    return AnalysisResult(
        asset_name=asset_name,
        asset_type="text",
        verdict=verdict,
        issues=issues,
        summary=summary,
        timestamp=_now(),
    )


def _extract_css_colors_and_fonts(html: str) -> Dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")
    style_text = " ".join(tag.get_text() for tag in soup.find_all("style"))
    inline_styles = " ".join(tag.get("style", "") for tag in soup.find_all(style=True))
    blob = style_text + " " + inline_styles

    colors = sorted(set(HEX_IN_TEXT_RE.findall(blob)))
    fonts = set()
    for m in FONT_FAMILY_RE.findall(blob):
        first = m.split(",")[0].strip().strip("'\"")
        if first:
            fonts.add(first)

    cta_texts = []
    for sel in ["button", "a.btn", "[role=button]", "input[type=submit]"]:
        for tag in soup.select(sel):
            t = tag.get_text(strip=True) or tag.get("value", "")
            if t:
                cta_texts.append(t)

    visible_text = soup.get_text(separator=" ", strip=True)
    return {
        "colors": colors,
        "fonts": sorted(fonts),
        "cta_texts": cta_texts[:15],
        "visible_text": visible_text[:8000],
    }


def analyze_url(url: str, profile: CIProfile) -> AnalysisResult:
    issues: List[Issue] = []
    asset_name = url

    try:
        resp = requests.get(
            url,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (CI-Compliance-Checker/1.0)"},
        )
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        return AnalysisResult(
            asset_name=asset_name,
            asset_type="url",
            verdict="red",
            issues=[
                Issue(
                    category="layout",
                    severity="critical",
                    message=f"Could not fetch URL: {e}",
                )
            ],
            summary="The page could not be retrieved.",
            timestamp=_now(),
        )

    extracted = _extract_css_colors_and_fonts(html)

    palette = [c.hex for c in profile.colors]
    if palette and extracted["colors"]:
        mismatches = []
        for hexc in extracted["colors"][:20]:
            _, dist = nearest_palette_color(hexc, palette)
            if dist is not None and dist > COLOR_MATCH_THRESHOLD:
                mismatches.append(hexc)
        if mismatches and len(mismatches) == len(extracted["colors"][:20]):
            issues.append(
                Issue(
                    category="color",
                    severity="critical",
                    message="None of the CSS colors found on the page match the approved palette.",
                    expected=", ".join(palette),
                    found=", ".join(mismatches[:5]),
                )
            )
        elif mismatches:
            issues.append(
                Issue(
                    category="color",
                    severity="minor",
                    message="Some CSS colors on the page deviate from the approved palette.",
                    expected=", ".join(palette),
                    found=", ".join(mismatches[:5]),
                )
            )

    allowed_fonts = {
        f
        for f in [profile.typography.primary_typeface, profile.typography.secondary_typeface]
        + profile.typography.fallback_typefaces
        if f
    }
    if allowed_fonts and extracted["fonts"]:
        unknown_fonts = [f for f in extracted["fonts"] if f not in allowed_fonts]
        if unknown_fonts:
            issues.append(
                Issue(
                    category="typography",
                    severity="minor",
                    message="The page uses font-family values that are not in the approved typefaces.",
                    expected=", ".join(sorted(allowed_fonts)),
                    found=", ".join(unknown_fonts[:5]),
                )
            )

    # Verbal identity / CTA check via LLM on extracted visible text.
    text_summary = ""
    try:
        voice_payload = {
            "voice": profile.voice.model_dump(),
            "typography_rules": profile.typography.rules,
        }
        text_for_llm = (
            f"VISIBLE PAGE TEXT:\n{extracted['visible_text']}\n\n"
            f"BUTTON / CTA TEXTS FOUND: {extracted['cta_texts']}"
        )
        result = llm_client.call_json(
            system=TEXT_SYSTEM_PROMPT,
            user_content=[
                llm_client.text_content_block(
                    f"CI VOICE/CTA RULES JSON:\n{voice_payload}\n\n{text_for_llm}"
                )
            ],
            max_tokens=3000,
        )
        for issue in result.get("issues", []):
            issues.append(Issue(**issue))
        text_summary = result.get("summary", "")
    except Exception as e:
        issues.append(
            Issue(
                category="voice",
                severity="minor",
                message=f"Tone-of-voice/CTA check on the page text could not be completed: {e}",
            )
        )

    # Visual check: render the page and reuse the same image-based check
    # used for uploaded assets (logo usage, color impression, typography
    # look, imagery, CTA/button styling, layout).
    notes: List[str] = []
    visual_summary = ""
    if not URL_SCREENSHOT_ENABLED:
        notes.append(
            "Visuelle Screenshot-Prüfung ist deaktiviert (URL_SCREENSHOT_ENABLED=false) "
            "- es wurde nur HTML/CSS analysiert."
        )
    elif not screenshot.is_available():
        notes.append(
            "Playwright ist nicht installiert - visuelle Screenshot-Prüfung übersprungen, "
            "es wurde nur HTML/CSS analysiert. Siehe README für die Installation."
        )
    else:
        try:
            shot = screenshot.capture_screenshot(url, timeout_ms=SCREENSHOT_TIMEOUT_MS)
            dominant = get_dominant_colors(shot, n=6)
            issues += _color_issue_from_image(dominant, profile)
            vision_issues, visual_summary = _vision_check(shot, "image/png", profile)
            issues += vision_issues
        except Exception as e:
            first_line = str(e).strip().splitlines()[0] if str(e).strip() else type(e).__name__
            notes.append(f"Screenshot der Seite fehlgeschlagen, visuelle Prüfung übersprungen: {first_line}")

    verdict = _verdict_from_issues(issues)
    summary = " ".join(s for s in [text_summary, visual_summary] if s) or {
        "green": "No CI deviations detected on this page.",
        "yellow": "Minor CI inconsistencies detected on this page.",
        "red": "Significant CI deviations detected on this page.",
    }[verdict]

    return AnalysisResult(
        asset_name=asset_name,
        asset_type="url",
        verdict=verdict,
        issues=issues,
        summary=summary,
        timestamp=_now(),
        notes=notes,
    )
