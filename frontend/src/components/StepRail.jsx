const STEPS = [
  { n: 1, label: "Style Guide", hint: "PDF hochladen" },
  { n: 2, label: "CI-Profil", hint: "prüfen & anpassen" },
  { n: 3, label: "Assets", hint: "Bilder, Text, URLs" },
  { n: 4, label: "Befund", hint: "Ampel & Details" },
];

export default function StepRail({ current, onJump, canJump }) {
  return (
    <nav className="flex md:flex-col gap-1 md:gap-0 overflow-x-auto md:overflow-visible">
      {STEPS.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        const jumpable = canJump(s.n);
        return (
          <button
            key={s.n}
            disabled={!jumpable}
            onClick={() => jumpable && onJump(s.n)}
            className={`focus-ring text-left flex items-start gap-3 px-3 py-3 border-b md:border-b-0 md:border-l-2 whitespace-nowrap md:whitespace-normal transition-colors
              ${active ? "border-indigo bg-white" : "border-transparent"}
              ${jumpable ? "cursor-pointer hover:bg-white/60" : "cursor-not-allowed opacity-40"}
            `}
          >
            <span
              className={`font-mono text-xs mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center
                ${active ? "bg-indigo text-paper border-indigo" : done ? "bg-verdict-green text-paper border-verdict-green" : "border-ink/30 text-ink/50"}
              `}
            >
              {done ? "✓" : s.n}
            </span>
            <span className="flex flex-col">
              <span className={`font-display text-sm ${active ? "text-ink" : "text-ink/70"}`}>{s.label}</span>
              <span className="text-[11px] text-ink/45 font-mono">{s.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
