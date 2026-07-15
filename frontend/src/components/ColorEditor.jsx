const ROLES = ["primary", "secondary", "accent", "neutral", "background", "text"];

export default function ColorEditor({ colors, onChange }) {
  function update(i, patch) {
    const next = colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange(next);
  }
  function remove(i) {
    onChange(colors.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...colors, { name: "Neue Farbe", hex: "#000000", role: "secondary" }]);
  }

  return (
    <div>
      <label className="field-label">Farbpalette</label>
      <div className="flex flex-col gap-2">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2 bg-white border border-rule px-3 py-2 rounded-sm">
            <span
              className="w-7 h-7 rounded-full border border-ink/15 shrink-0"
              style={{ backgroundColor: c.hex }}
            />
            <input
              className="input flex-1"
              value={c.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Name (z. B. Markenblau)"
            />
            <input
              className="input w-28 font-mono uppercase"
              value={c.hex}
              onChange={(e) => update(i, { hex: e.target.value })}
              placeholder="#000000"
            />
            <select
              className="input w-32 font-mono text-xs"
              value={c.role}
              onChange={(e) => update(i, { role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="focus-ring text-ink/40 hover:text-verdict-red px-1 font-mono text-sm"
              aria-label="Farbe entfernen"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="focus-ring self-start text-xs font-mono text-indigo hover:underline mt-1"
        >
          + Farbe hinzufügen
        </button>
      </div>
    </div>
  );
}
