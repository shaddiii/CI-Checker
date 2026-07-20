import { useRef, useState } from "react";
import { analyzeImage, analyzeText, analyzeUrl } from "../api.js";

const TABS = [
  { id: "image", label: "Image" },
  { id: "text", label: "Text" },
  { id: "url", label: "URL" },
];

let nextId = 1;

export default function AssetChecker({ onResults }) {
  const [tab, setTab] = useState("image");
  const [queue, setQueue] = useState([]);
  const [textDraft, setTextDraft] = useState("");
  const [textNameDraft, setTextNameDraft] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef(null);

  function addToQueue(item) {
    setQueue((q) => [...q, { id: nextId++, status: "pending", ...item }]);
  }

  function removeFromQueue(id) {
    setQueue((q) => q.filter((item) => item.id !== id));
  }

  function handleFiles(files) {
    Array.from(files || []).forEach((file) => {
      addToQueue({ type: "image", name: file.name, file });
    });
  }

  function handleAddText() {
    if (!textDraft.trim()) return;
    addToQueue({
      type: "text",
      name: textNameDraft.trim() || "Text snippet",
      text: textDraft,
    });
    setTextDraft("");
    setTextNameDraft("");
  }

  function handleAddUrl() {
    if (!urlDraft.trim()) return;
    addToQueue({ type: "url", name: urlDraft.trim(), url: urlDraft.trim() });
    setUrlDraft("");
  }

  async function runChecks() {
    setRunning(true);
    const results = [];
    for (const item of queue) {
      setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "running" } : i)));
      try {
        let result;
        if (item.type === "image") result = await analyzeImage(item.file);
        else if (item.type === "text") result = await analyzeText(item.text, item.name);
        else result = await analyzeUrl(item.url);
        results.push(result);
        setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: "done" } : i)));
      } catch (e) {
        setQueue((q) =>
          q.map((i) => (i.id === item.id ? { ...i, status: "error", error: e.message } : i))
        );
      }
    }
    setRunning(false);
    if (results.length) onResults(results);
  }

  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Step 3</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-2">Check assets</h1>
      <p className="text-ink/70 mb-6 leading-relaxed">
        Add social media graphics, copy, or web page URLs and run them against
        the saved CI profile.
      </p>

      <div className="flex gap-1 mb-4 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`focus-ring font-mono text-sm px-4 py-2 -mb-px border-b-2 transition-colors
              ${tab === t.id ? "border-indigo text-ink" : "border-transparent text-ink/45 hover:text-ink/70"}
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "image" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="focus-ring cursor-pointer border-2 border-dashed border-ink/25 bg-white/50 rounded-sm px-6 py-10 text-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className="font-display text-ink mb-1">Choose image(s)</p>
          <p className="text-ink/50 text-sm">PNG, JPG, WebP — e.g. social media ads</p>
        </div>
      )}

      {tab === "text" && (
        <div className="flex flex-col gap-2">
          <input
            className="input w-full"
            placeholder="Label (optional, e.g. Instagram caption)"
            value={textNameDraft}
            onChange={(e) => setTextNameDraft(e.target.value)}
          />
          <textarea
            className="input w-full min-h-[140px]"
            placeholder="Paste text…"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
          />
          <button onClick={handleAddText} className="btn-secondary self-start">
            Add to queue
          </button>
        </div>
      )}

      {tab === "url" && (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="https://example.com/page"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
          />
          <button onClick={handleAddUrl} className="btn-secondary">
            Add
          </button>
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-8">
          <p className="field-label">Queue ({queue.length})</p>
          <ul className="flex flex-col gap-1.5">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between bg-white border border-rule px-3 py-2 rounded-sm text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] uppercase text-ink/40 shrink-0">
                    {item.type}
                  </span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  {item.status === "running" && (
                    <span className="w-3.5 h-3.5 border-2 border-ink/20 border-t-indigo rounded-full animate-spin" />
                  )}
                  {item.status === "done" && <span className="text-verdict-green text-xs">checked</span>}
                  {item.status === "error" && (
                    <span className="text-verdict-red text-xs" title={item.error}>
                      error
                    </span>
                  )}
                  {item.status === "pending" && (
                    <button
                      onClick={() => removeFromQueue(item.id)}
                      className="focus-ring text-ink/40 hover:text-verdict-red font-mono"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <button
            onClick={runChecks}
            disabled={running || queue.every((i) => i.status !== "pending")}
            className="btn-primary mt-5"
          >
            {running ? "Checking…" : "Run check"}
          </button>
        </div>
      )}
    </div>
  );
}
