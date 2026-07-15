import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
HISTORY_DIR = DATA_DIR / "history"
PROFILE_FILE = DATA_DIR / "ci_profile.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_DIR.mkdir(parents=True, exist_ok=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
PORT = int(os.getenv("PORT", "8000"))
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))

# Perceptual color-distance threshold (CIE76 Delta-E in Lab space).
# Below this, a color counts as "matching" a CI palette entry.
COLOR_MATCH_THRESHOLD = 12.0

# Whether URL checks should also render the page (headless Chromium via
# Playwright) and run the same visual check used for images. If Playwright
# or its browser binaries aren't installed, this degrades automatically to
# a note on the result rather than failing the check.
URL_SCREENSHOT_ENABLED = os.getenv("URL_SCREENSHOT_ENABLED", "true").lower() != "false"
SCREENSHOT_TIMEOUT_MS = int(os.getenv("SCREENSHOT_TIMEOUT_MS", "20000"))
