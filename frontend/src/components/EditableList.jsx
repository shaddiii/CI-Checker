export default function EditableList({ label, items, onChange, placeholder }) {
  function update(i, value) {
    const next = [...items];
    next[i] = value;
    onChange(next);
  }
  function remove(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, ""]);
  }

  return (
    <div>
      {label && <label className="field-label">{label}</label>}
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input flex-1"
              value={item}
              placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="focus-ring text-ink/40 hover:text-verdict-red px-2 font-mono text-sm"
              aria-label="Remove entry"
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
          + Add entry
        </button>
      </div>
    </div>
  );
}
