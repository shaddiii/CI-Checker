from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import asset_analysis, ci_profile_builder, config, pdf_extraction, storage
from .models import AnalysisResult, CIProfile

app = FastAPI(title="CI Compliance Checker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = config.MAX_UPLOAD_MB * 1024 * 1024


async def _read_capped(upload: UploadFile) -> bytes:
    data = await upload.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File exceeds the {config.MAX_UPLOAD_MB} MB limit.")
    return data


@app.get("/api/health")
def health():
    return {"status": "ok", "has_api_key": bool(config.ANTHROPIC_API_KEY)}


@app.post("/api/styleguide", response_model=CIProfile)
async def upload_styleguide(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")
    data = await _read_capped(file)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        extraction = pdf_extraction.extract_pdf_content(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not extraction["text"] and not extraction["colors_with_counts"]:
        raise HTTPException(
            422,
            "No text or graphics could be extracted from this PDF. If it is a "
            "scanned/image-only document, this tool cannot read it yet.",
        )

    try:
        profile = ci_profile_builder.build_profile_from_extraction(extraction)
    except Exception as e:
        raise HTTPException(502, f"Could not build CI profile: {e}")

    storage.save_profile(profile)
    return profile


@app.get("/api/profile", response_model=CIProfile)
def get_profile():
    profile = storage.load_profile()
    if profile is None:
        raise HTTPException(404, "No CI profile has been created yet. Upload a style guide PDF first.")
    return profile


@app.put("/api/profile", response_model=CIProfile)
def update_profile(profile: CIProfile):
    storage.save_profile(profile)
    return profile


def _require_profile() -> CIProfile:
    profile = storage.load_profile()
    if profile is None:
        raise HTTPException(404, "No CI profile has been created yet. Upload a style guide PDF first.")
    return profile


@app.post("/api/analyze/image", response_model=AnalysisResult)
async def analyze_image(file: UploadFile = File(...)):
    profile = _require_profile()
    data = await _read_capped(file)
    media_type = file.content_type or "image/png"
    if not media_type.startswith("image/"):
        raise HTTPException(400, "Please upload an image file.")
    result = asset_analysis.analyze_image_bytes(data, media_type, profile, file.filename or "image")
    storage.save_result(result)
    return result


class TextPayload(BaseModel):
    text: str
    asset_name: str = "text asset"


@app.post("/api/analyze/text", response_model=AnalysisResult)
def analyze_text(payload: TextPayload):
    profile = _require_profile()
    if not payload.text.strip():
        raise HTTPException(400, "Text must not be empty.")
    result = asset_analysis.analyze_text(payload.text, profile, payload.asset_name)
    storage.save_result(result)
    return result


class UrlPayload(BaseModel):
    url: str


@app.post("/api/analyze/url", response_model=AnalysisResult)
def analyze_url(payload: UrlPayload):
    profile = _require_profile()
    if not payload.url.startswith(("http://", "https://")):
        raise HTTPException(400, "Please provide a full URL including http(s)://")
    result = asset_analysis.analyze_url(payload.url, profile)
    storage.save_result(result)
    return result


@app.get("/api/history", response_model=list[AnalysisResult])
def history(limit: int = 50):
    return storage.list_results(limit=limit)


# --- Serve the built frontend (production single-container mode) ---------
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
