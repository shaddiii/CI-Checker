import { useState } from "react";
import VerdictStamp from "./VerdictStamp.jsx";

const CATEGORY_LABELS = {
  color: "Color",
  typography: "Typography",
  logo: "Logo",
  imagery: "Imagery",
  cta: "CTA / Button",
  layout: "Layout",
  voice: "Tone of voice",
};

function IssueRow({ issue }) {
  const critical = issue.severity === "critical";
  return (
    <div
      className={`border-l-2 pl-3 py-2 ${
        critical ? "border-verdict-red" : "border-verdict-amber"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink/50">
          {CATEGORY_LABELS[issue.category] || issue.category}
        </span>
        <span
          className={`font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${
            critical
              ? "bg-verdict-redBg text-verdict-red"
              : "bg-verdict-amberBg text-verdict-amber"
          }`}
        >
          {critical ? "critical" : "minor"}
        </span>
      </div>
      <p className="text-sm text-ink/85">{issue.message}</p>
      {(issue.expected || issue.found) && (
        <div className="mt-1 text-xs font-mono text-ink/50 flex flex-wrap gap-x-4">
          {issue.expected && <span>Expected: {issue.expected}</span>}
          {issue.found && <span>Found: {issue.found}</span>}
        </div>
      )}
    </div>
  );
}

export default function ResultCard({ result }) {
  const [open, setOpen] = useState(result.verdict !== "green");

  return (
    <div className="bg-white border border-rule rounded-sm p-5 flex gap-5">
      <div className="shrink-0">
        <VerdictStamp verdict={result.verdict} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase text-ink/40">{result.asset_type}</span>
            <h3 className="font-display text-lg text-ink truncate">{result.asset_name}</h3>
          </div>
          {result.issues?.length > 0 && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="focus-ring font-mono text-xs text-indigo hover:underline shrink-0"
            >
              {open ? "Hide details" : `Show ${result.issues.length} issue(s)`}
            </button>
          )}
        </div>
        <p className="text-sm text-ink/70 mt-1">{result.summary}</p>

        {open && result.issues?.length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {result.issues.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        )}

        {result.notes?.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {result.notes.map((note, i) => (
              <p key={i} className="text-xs font-mono text-ink/40">
                ⓘ {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
