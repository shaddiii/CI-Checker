"""Color helpers: hex/RGB parsing, RGB->Lab conversion and a perceptual
(Delta-E76) distance function, plus dominant-color extraction from images.

No heavyweight color-science dependency is used on purpose (colormath is
unmaintained); the CIE76 approximation implemented here is accurate enough
to decide "does this asset use a CI palette color or not".
"""
from __future__ import annotations

import io
import re
from collections import Counter
from typing import List, Tuple

from PIL import Image

HEX_RE = re.compile(r"^#?[0-9a-fA-F]{6}$")


def normalize_hex(value: str) -> str:
    value = value.strip()
    if not value.startswith("#"):
        value = f"#{value}"
    return value.upper()


def is_valid_hex(value: str) -> bool:
    return bool(HEX_RE.match(value.strip()))


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    h = hex_color.strip().lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def rgb_to_hex(rgb: Tuple[float, float, float]) -> str:
    r, g, b = (max(0, min(255, round(c * 255 if c <= 1 else c))) for c in rgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def _srgb_to_linear(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb_to_lab(rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
    r, g, b = (_srgb_to_linear(v) for v in rgb)
    # sRGB -> XYZ (D65)
    x = r * 0.4124 + g * 0.3576 + b * 0.1805
    y = r * 0.2126 + g * 0.7152 + b * 0.0722
    z = r * 0.0193 + g * 0.1192 + b * 0.9505

    xn, yn, zn = 0.95047, 1.0, 1.08883
    x, y, z = x / xn, y / yn, z / zn

    def f(t: float) -> float:
        return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)

    fx, fy, fz = f(x), f(y), f(z)
    L = max(0.0, 116 * fy - 16)
    a = 500 * (fx - fy)
    b2 = 200 * (fy - fz)
    return L, a, b2


def delta_e76(hex1: str, hex2: str) -> float:
    lab1 = rgb_to_lab(hex_to_rgb(hex1))
    lab2 = rgb_to_lab(hex_to_rgb(hex2))
    return sum((c1 - c2) ** 2 for c1, c2 in zip(lab1, lab2)) ** 0.5


def nearest_palette_color(hex_color: str, palette_hex: List[str]):
    """Returns (nearest_hex, distance) or (None, None) if palette is empty."""
    if not palette_hex:
        return None, None
    best = min(palette_hex, key=lambda p: delta_e76(hex_color, p))
    return best, delta_e76(hex_color, best)


def get_dominant_colors(image_bytes: bytes, n: int = 6) -> List[str]:
    """Quantize the image to n colors and return them as hex, sorted by
    prevalence (most dominant first). Pure Pillow, no extra dependency."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((200, 200))
    quantized = img.quantize(colors=max(2, n), method=Image.MEDIANCUT)
    palette = quantized.getpalette()
    color_counts = Counter(quantized.getdata())
    hexes = []
    for idx, _count in color_counts.most_common(n):
        r, g, b = palette[idx * 3 : idx * 3 + 3]
        hexes.append(rgb_to_hex((r, g, b)))
    return hexes


def strip_pdf_font_subset_prefix(font_name: str) -> str:
    """PDF subsetted fonts look like 'ABCDEF+Helvetica-Bold'. Strip the tag."""
    if "+" in font_name and len(font_name.split("+")[0]) == 6:
        return font_name.split("+", 1)[1]
    return font_name
