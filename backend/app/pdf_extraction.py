"""Deterministic extraction from the uploaded Corporate Identity PDF.

We pull three things straight from the PDF (no LLM involved here, so these
facts are exact, not guessed):
  - full text (fed to Claude afterwards to derive structured rules)
  - embedded font names (from real text runs, subset-tag stripped)
  - fill colors of vector drawings (typically how palette swatches are
    built in style guides), ranked by how often they appear

The LLM only assigns *roles* (primary/secondary/accent/...) and reads the
prose rules; it never has to invent a hex value or a font name.
"""
from __future__ import annotations

from collections import Counter
from typing import Dict, List

import fitz  # PyMuPDF

from .color_utils import rgb_to_hex, strip_pdf_font_subset_prefix

# Colors this close to pure white/black are almost always page backgrounds
# or body text, not brand swatches, so we deprioritize (not exclude) them.
NEAR_WHITE_BLACK = {"#FFFFFF", "#000000"}


def extract_pdf_content(path: str) -> Dict:
    doc = fitz.open(path)
    text_parts: List[str] = []
    font_names: set = set()
    color_counter: Counter = Counter()

    for page in doc:
        text_parts.append(page.get_text())

        for f in page.get_fonts(full=True):
            raw_name = f[3] if len(f) > 3 else None
            if raw_name:
                font_names.add(strip_pdf_font_subset_prefix(raw_name))

        try:
            drawings = page.get_drawings()
        except Exception:
            drawings = []
        for d in drawings:
            fill = d.get("fill")
            if fill:
                try:
                    color_counter[rgb_to_hex(tuple(fill))] += 1
                except Exception:
                    continue
            stroke = d.get("color")
            if stroke:
                try:
                    color_counter[rgb_to_hex(tuple(stroke))] += 1
                except Exception:
                    continue

    doc.close()

    # Rank: real brand colors first, white/black pushed to the end but kept
    ranked = sorted(
        color_counter.items(),
        key=lambda kv: (kv[0] in NEAR_WHITE_BLACK, -kv[1]),
    )
    colors_with_counts = [{"hex": h, "count": c} for h, c in ranked[:40]]

    return {
        "text": "\n".join(text_parts).strip(),
        "fonts": sorted(font_names),
        "colors_with_counts": colors_with_counts,
    }
