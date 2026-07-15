# CI Check — Corporate Identity / Corporate Design Auditor

Lädt einen Corporate-Identity-Styleguide (PDF) hoch, extrahiert daraus Farben,
Schriften, Logo-, Tonalitäts- und Bildsprache-Regeln, und prüft anschließend
hochgeladene Assets (Bilder, Texte, Webseiten-URLs) auf Einhaltung dieser
Regeln. Ergebnis pro Asset: **grün** (perfekt), **gelb** (einige Issues) oder
**rot** (deutliche Abweichung), jeweils mit konkreter Begründung pro Kategorie
(Farbe, Typografie, Logo, Bildsprache, CTA/Button, Layout, Tonalität).

## Wie es funktioniert

1. **Styleguide hochladen**: Aus dem PDF werden Farben (aus Vektorgrafiken)
   und Schriftnamen (aus eingebetteten Fonts) *deterministisch* extrahiert —
   keine Halluzination bei Hex-Codes. Claude liest den restlichen Fließtext
   und ordnet Farben Rollen zu (primär/sekundär/akzent/...), erkennt
   Logo-Regeln, Tonalität und Bildsprache.
2. **Profil prüfen**: Das extrahierte Profil ist vollständig editierbar,
   bevor es als Referenz gespeichert wird — Automatik ersetzt keine
   menschliche Kontrolle.
3. **Assets prüfen**: Bilder werden per Farbabstand (Delta-E, Lab-Farbraum)
   gegen die Palette geprüft, plus eine visuelle Prüfung durch Claude
   (Logo-Nutzung, Bildsprache, Button-Stil, Typografie-Eindruck). Texte
   werden auf Tonalität, verbotene Begriffe und CTA-Stil geprüft. Bei URLs
   werden CSS-Farben und `font-family`-Werte direkt aus dem HTML ausgelesen
   **und zusätzlich** die Seite per Headless-Chromium (Playwright)
   gerendert und screenshotet — der Screenshot durchläuft denselben
   visuellen Check wie ein hochgeladenes Bild. Ist Playwright nicht
   installiert, wird das automatisch übersprungen (Hinweis im Ergebnis, kein
   Fehler).
4. **Befund**: Ampel-Verdikt pro Asset und in Summe, mit aufklappbaren
   Detail-Issues (Soll/Ist, Kategorie, Schweregrad).

## Ohne lokale Installation hosten (nur Browser)

Wenn du weder Docker noch Python/Node lokal installieren willst, kannst du
komplett über den Browser auf **Render** deployen — das Projekt enthält
bereits eine `render.yaml`-Blueprint-Datei dafür.

**1. Code zu GitHub bringen (kein Git-Kommandozeilen-Tool nötig)**
- Auf github.com ein neues, leeres Repository anlegen
- Auf der Repo-Seite auf "Add file" → "Upload files" klicken
- Den entpackten `ci-check-app`-Ordner (alle Dateien inkl. Unterordner) per
  Drag & Drop hineinziehen und committen

**2. Auf Render deployen**
- Mit GitHub-Account auf render.com registrieren (keine Kreditkarte nötig)
- "New +" → "Blueprint" → das eben erstellte Repository auswählen
- Render erkennt `render.yaml` automatisch und fragt nach `ANTHROPIC_API_KEY`
  — hier deinen Anthropic-Key einfügen
- "Apply" klicken — Render baut das Docker-Image (inkl. Chromium für die
  URL-Screenshots) und deployed automatisch

Nach ein paar Minuten läuft die App unter einer URL wie
`https://ci-check.onrender.com`.

**Kostenlos testen statt zahlen**: Die mitgelieferte `render.yaml` nutzt den
bezahlten "Starter"-Plan (~7 $/Monat) mit persistentem Speicher, damit
CI-Profil und Verlauf dauerhaft erhalten bleiben. Für einen echten
Gratis-Test: In `render.yaml` `plan: starter` zu `plan: free` ändern und den
`disk:`-Block entfernen (Render-Free-Tier unterstützt keine persistenten
Disks). Zu beachten dabei:
- 512 MB RAM können mit Chromium knapp werden — im Zweifel
  `URL_SCREENSHOT_ENABLED` auf `"false"` setzen
- Der Service schläft nach 15 Minuten Inaktivität ein (nächster Aufruf
  dauert dann ~30–60 Sekunden)
- Ohne Disk werden CI-Profil und Verlauf bei jedem Neustart/Redeploy
  zurückgesetzt — für dauerhafte Nutzung lohnt sich der Starter-Plan

## Lokales Setup (Entwicklung)

Voraussetzungen: Python 3.11+, Node.js 20+, ein Anthropic API Key
(https://console.anthropic.com/).

```bash
cd backend
cp .env.example .env        # ANTHROPIC_API_KEY eintragen
pip install -r requirements.txt
playwright install chromium # einmalig, für die visuelle URL-Prüfung
uvicorn app.main:app --reload --port 8000
```

Ohne diesen Schritt läuft die App trotzdem — URL-Checks nutzen dann nur die
HTML/CSS-Analyse und vermerken im Ergebnis, dass die visuelle Prüfung
übersprungen wurde.

```bash
# in einem zweiten Terminal
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxyt /api zu :8000
```

## Selbst hosten mit Docker (eigener Server/VPS)

Am einfachsten mit Docker — ein Container, ein Port:

```bash
cp backend/.env.example backend/.env   # ANTHROPIC_API_KEY eintragen
docker compose up --build -d
# App läuft auf http://<server>:8000
```

Ohne Docker: `npm run build` im `frontend`-Ordner erzeugt `frontend/dist`,
das FastAPI automatisch mitausliefert. Danach genügt `uvicorn app.main:app
--host 0.0.0.0 --port 8000` im `backend`-Ordner.

Daten (CI-Profil, Verlauf) liegen als JSON-Dateien in `backend/data/` — bei
Docker über ein Volume persistiert, sonst einfach der lokale Ordner.

## Konfiguration

Alles in `backend/.env` (siehe `.env.example`):

- `ANTHROPIC_API_KEY` — erforderlich
- `ANTHROPIC_MODEL` — Standard `claude-sonnet-5`; für gründlichere (aber
  langsamere/teurere) Prüfungen z. B. auf `claude-opus-4-8` umstellen
- `MAX_UPLOAD_MB` — Upload-Limit für PDF/Bilder

## Bekannte Grenzen

- **Gescannte/Bild-PDFs**: Der Styleguide muss echten Text/Vektorgrafiken
  enthalten. Reine Bild-Scans werden aktuell nicht per OCR gelesen.
- **Schrift-Erkennung auf Bildern/URLs**: Echte Schriftart-Erkennung aus
  Bildpixeln ist ohne Font-Fingerprinting/ML grundsätzlich unscharf — die
  Bildprüfung nutzt Claudes visuellen Eindruck (gut für offensichtliche
  Abweichungen), keine pixelgenaue Font-Erkennung. Bei URLs wird dagegen der
  tatsächliche CSS-`font-family`-Wert exakt ausgelesen.
- **Screenshot-Performance**: Für jede URL-Prüfung wird aktuell ein frisches
  Chromium gestartet (einfach & robust, aber nicht für sehr hohes
  Volumen optimiert). Für höheren Durchsatz ließe sich ein persistenter
  Browser-Pool mit der async-Playwright-API ergänzen.
- **Cookie-Banner**: Der Screenshot zeigt die Seite so, wie sie direkt nach
  dem Laden aussieht — Cookie-Banner o. Ä. werden nicht automatisch
  weggeklickt und können den visuellen Check beeinflussen.
- **Farbschwelle**: Der Delta-E-Schwellenwert (`COLOR_MATCH_THRESHOLD` in
  `backend/app/config.py`, Standard `12.0`) bestimmt, wie streng
  Farbabweichungen bewertet werden — bei Bedarf anpassen.
- **Screenshot-Konfiguration**: `URL_SCREENSHOT_ENABLED=false` in `.env`
  deaktiviert die visuelle URL-Prüfung komplett (nur HTML/CSS), 
  `SCREENSHOT_TIMEOUT_MS` steuert das Ladezeit-Limit (Standard 20000 ms).

## Projektstruktur

```
backend/
  app/
    main.py               FastAPI-Routen
    ci_profile_builder.py Claude-Prompt zur Profil-Strukturierung
    pdf_extraction.py     deterministische Farb-/Font-Extraktion aus PDF
    asset_analysis.py     Bild-/Text-/URL-Prüfung, Verdikt-Logik
    color_utils.py        Lab-Farbraum, Delta-E, dominante Farben
    storage.py             JSON-Dateispeicher (Profil + Verlauf)
frontend/
  src/
    App.jsx               4-Schritte-Ablauf
    components/            UploadStyleGuide, ProfileReview, AssetChecker,
                            ResultsView, VerdictStamp, ...
```
