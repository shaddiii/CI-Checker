from __future__ import annotations

from typing import Any, Dict

from . import llm_client
from .models import CIProfile

SYSTEM_PROMPT = """You are a senior corporate design / corporate identity analyst.
You receive raw material extracted from a company's Corporate Identity or
Brand Style Guide PDF, which may be written in any language:
 - the full extracted text
 - a list of hex colors actually found in the PDF's graphics, with how many
   times each appeared (higher count often, but not always, means more
   central to the palette - e.g. a single accent color used once in a large
   hero image is still a real brand color)
 - a list of font names actually embedded in the PDF

Your job: produce a structured JSON summary of this brand's identity rules,
to be used later to audit other marketing assets for compliance.

LANGUAGE: Write every descriptive/explanatory text you generate (all "rules"
lists, "tone_keywords", "cta_style", "style_description", "source_notes",
"extraction_warnings") in English, regardless of what language the source
document is written in. EXCEPTION: "forbidden_words" and the keys/values of
"preferred_terms" must stay in the source document's own language, verbatim
- those are matched literally against real marketing copy later, so
translating them would make them useless. "brand_name" stays as given
(proper noun, don't translate it).

Hard rules:
 - Only use hex colors that appear in the provided color list. Never invent
   a hex value. You MAY leave colors out that are clearly just backgrounds/
   text (like a plain white or black used for the guide's own page layout)
   if the text does not call them out as brand colors.
 - Only use font names from the provided font list, unless the body text
   explicitly names a different typeface (e.g. the guide might specify
   "Helvetica Neue" as the required brand font even though the PDF itself
   was typeset in a different font) - in that case prefer what the text says.
 - If information for a field is genuinely not present in the source,
   leave it null / empty list. Do not invent brand rules.
 - Assign each chosen color a short human name (e.g. "Brand Blue", "Alert
   Red") and a role: one of primary, secondary, accent, neutral, background, text.
 - Keep every list item short and concrete (one rule per line), suitable for
   later being checked against real assets like social posts, ads, or web pages.

Output ONLY valid JSON (no markdown fences, no commentary) matching exactly
this schema:
{
  "brand_name": string|null,
  "colors": [{"name": string, "hex": string, "role": string}],
  "typography": {
    "primary_typeface": string|null,
    "secondary_typeface": string|null,
    "fallback_typefaces": [string],
    "allowed_weights": [string],
    "rules": [string]
  },
  "logo": {
    "min_clear_space": string|null,
    "min_size": string|null,
    "donts": [string],
    "variants_allowed": [string]
  },
  "voice": {
    "tone_keywords": [string],
    "forbidden_words": [string],
    "preferred_terms": {"wrong_term": "right_term"},
    "cta_style": string|null,
    "rules": [string]
  },
  "imagery": {
    "style_description": string|null,
    "rules": [string]
  },
  "source_notes": string|null,
  "extraction_warnings": [string]
}

Use "extraction_warnings" to flag anything you were unsure about (e.g. "no
clear typography section found in the document" or "multiple conflicting
primary colors mentioned").
"""


def build_profile_from_extraction(extraction: Dict[str, Any]) -> CIProfile:
    color_list_str = "\n".join(
        f"- {c['hex']} (appeared {c['count']}x)" for c in extraction["colors_with_counts"]
    )
    font_list_str = "\n".join(f"- {f}" for f in extraction["fonts"]) or "(none detected)"

    # Keep the raw text reasonably bounded for the prompt.
    raw_text = extraction["text"]
    if len(raw_text) > 60000:
        raw_text = raw_text[:60000] + "\n...[truncated]"

    user_text = f"""RAW TEXT FROM STYLE GUIDE PDF:
---
{raw_text}
---

COLORS FOUND IN PDF GRAPHICS (hex, occurrence count):
{color_list_str}

FONT NAMES EMBEDDED IN PDF:
{font_list_str}

Now produce the JSON CI profile as instructed."""

    data = llm_client.call_json(
        system=SYSTEM_PROMPT,
        user_content=[llm_client.text_content_block(user_text)],
        max_tokens=8000,
    )
    return CIProfile.model_validate(data)
