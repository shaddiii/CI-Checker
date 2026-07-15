import ResultCard from "./ResultCard.jsx";

function overallVerdict(results) {
  if (results.some((r) => r.verdict === "red")) return "red";
  if (results.some((r) => r.verdict === "yellow")) return "yellow";
  return "green";
}

export default function ResultsView({ results, onNewCheck }) {
  const overall = overallVerdict(results);
  const counts = { green: 0, yellow: 0, red: 0 };
  results.forEach((r) => counts[r.verdict]++);

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Schritt 4</p>
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-6">Befund</h1>

      <div className="bg-white border border-rule rounded-sm p-6 mb-8 flex items-center gap-6">
        <div
          className={`stamp w-24 h-24 text-[10px]`}
          style={{
            color: { green: "#1E7F4C", yellow: "#B5720A", red: "#B23A2E" }[overall],
          }}
        >
          <span className="text-xl" aria-hidden="true">
            {{ green: "✓", yellow: "!", red: "✕" }[overall]}
          </span>
        </div>
        <div>
          <p className="font-display text-xl text-ink mb-1">
            {results.length} Asset(s) geprüft
          </p>
          <p className="font-mono text-sm text-ink/60">
            {counts.green} perfekt · {counts.yellow} mit Issues · {counts.red} mit Abweichungen
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {results.map((r, i) => (
          <ResultCard key={i} result={r} />
        ))}
      </div>

      <button onClick={onNewCheck} className="btn-secondary mt-8">
        Weitere Assets prüfen
      </button>
    </div>
  );
}
