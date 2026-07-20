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
      setError(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl pb-24">
      <p className="eyebrow">Step 2</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">Review your CI profile</h1>
      <p className="text-ink/70 mb-6 leading-relaxed">
        Automatically extracted from the PDF. Please double-check and correct
        as needed — this profile is the reference for every check that follows.
      </p>

      {p.extraction_warnings?.length > 0 && (
        <div className="mb-6 border border-verdict-amber/40 bg-verdict-amberBg text-verdict-amber px-4 py-3 rounded-sm text-sm">
          <p className="font-mono text-xs uppercase tracking-wide mb-1">Extraction notes</p>
          <ul className="list-disc list-inside space-y-0.5">
            {p.extraction_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Section title="Brand">
          <div>
            <label className="field-label">Brand name</label>
            <input
              className="input w-full"
              value={p.brand_name || ""}
              onChange={(e) => set("brand_name", e.target.value)}
            />
          </div>
        </Section>

        <Section title="Colors">
          <ColorEditor colors={p.colors} onChange={(v) => set("colors", v)} />
        </Section>

        <Section title="Typography">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Primary typeface</label>
              <input
                className="input w-full"
                value={p.typography.primary_typeface || ""}
                onChange={(e) => set("typography.primary_typeface", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Secondary typeface</label>
              <input
                className="input w-full"
                value={p.typography.secondary_typeface || ""}
                onChange={(e) => set("typography.secondary_typeface", e.target.value)}
              />
            </div>
          </div>
          <EditableList
            label="Fallback typefaces"
            items={p.typography.fallback_typefaces}
            onChange={(v) => set("typography.fallback_typefaces", v)}
            placeholder="e.g. Arial"
          />
          <EditableList
            label="Allowed weights"
            items={p.typography.allowed_weights}
            onChange={(v) => set("typography.allowed_weights", v)}
            placeholder="e.g. Regular, Bold"
          />
          <EditableList
            label="Other rules"
            items={p.typography.rules}
            onChange={(v) => set("typography.rules", v)}
            placeholder="e.g. Headlines are always Bold"
          />
        </Section>

        <Section title="Logo">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Minimum clear space</label>
              <input
                className="input w-full"
                value={p.logo.min_clear_space || ""}
                onChange={(e) => set("logo.min_clear_space", e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Minimum size</label>
              <input
                className="input w-full"
                value={p.logo.min_size || ""}
                onChange={(e) => set("logo.min_size", e.target.value)}
              />
            </div>
          </div>
          <EditableList
            label="Allowed variants"
            items={p.logo.variants_allowed}
            onChange={(v) => set("logo.variants_allowed", v)}
          />
          <EditableList
            label="Don'ts"
            items={p.logo.donts}
            onChange={(v) => set("logo.donts", v)}
            placeholder="e.g. never stretch or distort"
          />
        </Section>

        <Section title="Tone of voice &amp; CTA">
          <EditableList
            label="Tone keywords"
            items={p.voice.tone_keywords}
            onChange={(v) => set("voice.tone_keywords", v)}
            placeholder="e.g. confident, approachable"
          />
          <EditableList
            label="Forbidden words"
            items={p.voice.forbidden_words}
            onChange={(v) => set("voice.forbidden_words", v)}
          />
          <div>
            <label className="field-label">CTA style</label>
            <input
              className="input w-full"
              value={p.voice.cta_style || ""}
              onChange={(e) => set("voice.cta_style", e.target.value)}
              placeholder="e.g. imperative, max 3 words"
            />
          </div>
          <EditableList
            label="Other rules"
            items={p.voice.rules}
            onChange={(v) => set("voice.rules", v)}
          />
        </Section>

        <Section title="Imagery">
          <div>
            <label className="field-label">Description</label>
            <textarea
              className="input w-full min-h-[80px]"
              value={p.imagery.style_description || ""}
              onChange={(e) => set("imagery.style_description", e.target.value)}
            />
          </div>
          <EditableList
            label="Rules"
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
          {saving ? "Saving…" : "Save profile & continue"}
        </button>
      </div>
    </div>
  );
}
