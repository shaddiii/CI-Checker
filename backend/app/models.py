from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ColorEntry(BaseModel):
    name: str
    hex: str
    role: str = "secondary"  # primary | secondary | accent | neutral | background | text


class TypographyRules(BaseModel):
    primary_typeface: Optional[str] = None
    secondary_typeface: Optional[str] = None
    fallback_typefaces: List[str] = Field(default_factory=list)
    allowed_weights: List[str] = Field(default_factory=list)
    rules: List[str] = Field(default_factory=list)


class LogoRules(BaseModel):
    min_clear_space: Optional[str] = None
    min_size: Optional[str] = None
    donts: List[str] = Field(default_factory=list)
    variants_allowed: List[str] = Field(default_factory=list)


class VoiceRules(BaseModel):
    tone_keywords: List[str] = Field(default_factory=list)
    forbidden_words: List[str] = Field(default_factory=list)
    preferred_terms: Dict[str, str] = Field(default_factory=dict)
    cta_style: Optional[str] = None
    rules: List[str] = Field(default_factory=list)


class ImageryRules(BaseModel):
    style_description: Optional[str] = None
    rules: List[str] = Field(default_factory=list)


class CIProfile(BaseModel):
    brand_name: Optional[str] = None
    colors: List[ColorEntry] = Field(default_factory=list)
    typography: TypographyRules = Field(default_factory=TypographyRules)
    logo: LogoRules = Field(default_factory=LogoRules)
    voice: VoiceRules = Field(default_factory=VoiceRules)
    imagery: ImageryRules = Field(default_factory=ImageryRules)
    source_notes: Optional[str] = None
    extraction_warnings: List[str] = Field(default_factory=list)


class Issue(BaseModel):
    category: str  # color | typography | logo | imagery | layout | cta | voice
    severity: str  # critical | minor
    message: str
    expected: Optional[str] = None
    found: Optional[str] = None


class AnalysisResult(BaseModel):
    asset_name: str
    asset_type: str  # image | text | url
    verdict: str  # green | yellow | red
    issues: List[Issue] = Field(default_factory=list)
    summary: str = ""
    timestamp: str = ""
    # Process/tooling info (e.g. "visual screenshot check skipped") - never
    # affects the verdict, unlike issues which represent real CI violations.
    notes: List[str] = Field(default_factory=list)
