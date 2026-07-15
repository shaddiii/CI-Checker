import { useState } from "react";
import { saveProfile } from "../api.js";
import ColorEditor from "./ColorEditor.jsx";
import EditableList from "./EditableList.jsx";

function Section({ title, children }) {
  return (
    <section className="bg-white/60 border border-rule rounded-sm p-5">
      <h2 className="font-display text-lg text-ink mb-4">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default function ProfileReview({ profile, onContinue }) {
  const [p, setP] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(path, value) {
    setP((prev) => {
      const next = structuredClone(prev);
      let obj = next;
      const parts = path.split(".");
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function handleContinue() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveProfile(p);
      onContinue(saved);
    } catch (e) {
      setError(e.message || "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl pb-24">
      <p className="eyebrow">Schritt 2</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">CI-Profil prüfen</h1>
      <p className="text-ink/70 mb-6 leading-relaxed">
        Automatisch aus dem PDF extrahiert. Bitte kurz gegenprüfen und
        korrigieren — das Profil ist die Referenz für alle folgenden Checks.
      </p>

      {p.extraction_warnings?.length > 0 && (
        <div className="mb-6 border border-verdict-amber/40 bg-verdict-amberBg text-verdict-amber px-4 py-3 rounded-sm text-sm">
          <p className="font-mono text-xs uppercase tracking-wide mb-1">Hinweise zur Extraktion</p>
          <ul className="list-disc list-inside space-y-0.5">
            {p.extraction_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Section title="Marke">
          <div>
            <label className="field-label">Markenname</label>
            <input
              className="input w-full"
              value={p.brand_name || ""}
              onChange={(e) => set("brand_name", e.target.value)}
            />
          </div>
        </Section>

        <Section title="Farben">
          <ColorEditor colors={p.colors} onChange={(v) => set("colors", v)} />
        </Section>

        <Section title="Typografie">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Primäre Schrift</label>
              <input
                className="input w-full"
                value={p.typography.primary_typeface || ""}
                onChange={(e) => set("typography.primary_typeface", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Sekundäre Schrift</label>
              <input
                className="input w-full"
                value={p.typography.secondary_typeface || ""}
                onChange={(e) => set("typography.secondary_typeface", e.target.value)}
              />
            </div>
          </div>
          <EditableList
            label="Ersatzschriften"
            items={p.typography.fallback_typefaces}
            onChange={(v) => set("typography.fallback_typefaces", v)}
            placeholder="z. B. Arial"
          />
          <EditableList
            label="Erlaubte Schriftschnitte"
            items={p.typography.allowed_weights}
            onChange={(v) => set("typography.allowed_weights", v)}
            placeholder="z. B. Regular, Bold"
          />
          <EditableList
            label="Weitere Regeln"
            items={p.typography.rules}
            onChange={(v) => set("typography.rules", v)}
            placeholder="z. B. Headlines nur in Bold"
          />
        </Section>

        <Section title="Logo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Mindestschutzraum</label>
              <input
                className="input w-full"
                value={p.logo.min_clear_space || ""}
                onChange={(e) => set("logo.min_clear_space", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Mindestgröße</label>
              <input
                className="input w-full"
                value={p.logo.min_size || ""}
                onChange={(e) => set("logo.min_size", e.target.value)}
              />
            </div>
          </div>
          <EditableList
            label="Erlaubte Varianten"
            items={p.logo.variants_allowed}
            onChange={(v) => set("logo.variants_allowed", v)}
          />
          <EditableList
            label="Don'ts"
            items={p.logo.donts}
            onChange={(v) => set("logo.donts", v)}
            placeholder="z. B. nicht verzerren"
          />
        </Section>

        <Section title="Tonalität &amp; CTA">
          <EditableList
            label="Tonalitäts-Schlagworte"
            items={p.voice.tone_keywords}
            onChange={(v) => set("voice.tone_keywords", v)}
            placeholder="z. B. selbstbewusst, nahbar"
          />
          <EditableList
            label="Verbotene Begriffe"
            items={p.voice.forbidden_words}
            onChange={(v) => set("voice.forbidden_words", v)}
          />
          <div>
            <label className="field-label">CTA-Stil</label>
            <input
              className="input w-full"
              value={p.voice.cta_style || ""}
              onChange={(e) => set("voice.cta_style", e.target.value)}
              placeholder="z. B. Imperativ, max. 3 Wörter"
            />
          </div>
          <EditableList
            label="Weitere Regeln"
            items={p.voice.rules}
            onChange={(v) => set("voice.rules", v)}
          />
        </Section>

        <Section title="Bildsprache">
          <div>
            <label className="field-label">Beschreibung</label>
            <textarea
              className="input w-full min-h-[80px]"
              value={p.imagery.style_description || ""}
              onChange={(e) => set("imagery.style_description", e.target.value)}
            />
          </div>
          <EditableList
            label="Regeln"
            items={p.imagery.rules}
            onChange={(v) => set("imagery.rules", v)}
          />
        </Section>
      </div>

      {error && (
        <div className="mt-4 border border-verdict-red/40 bg-verdict-redBg text-verdict-red px-4 py-3 rounded-sm text-sm">
          {error}
        </div>
      )}

      <div className="sticky bottom-0 mt-8 -mx-6 px-6 py-4 bg-paper/95 backdrop-blur border-t border-rule flex justify-end">
        <button onClick={handleContinue} disabled={saving} className="btn-primary">
          {saving ? "Speichern…" : "Profil speichern & weiter"}
        </button>
      </div>
    </div>
  );
}
