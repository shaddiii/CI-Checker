const VARIANTS = {
  green: { label: "Perfect", sub: "CI compliant", color: "#1E7F4C", glyph: "✓" },
  yellow: { label: "Some Issues", sub: "minor deviations", color: "#B5720A", glyph: "!" },
  red: { label: "Deviation", sub: "CI violation", color: "#B23A2E", glyph: "✕" },
};

export default function VerdictStamp({ verdict, size = "md" }) {
  const v = VARIANTS[verdict] || VARIANTS.yellow;
  const dims = size === "sm" ? "w-16 h-16 text-[9px]" : "w-[132px] h-[132px] text-xs";

  return (
    <div className={`stamp ${dims}`} style={{ color: v.color }}>
      <span className={size === "sm" ? "text-xl" : "text-3xl"} aria-hidden="true">
        {v.glyph}
      </span>
      <span className="font-semibold mt-0.5">{v.label}</span>
      {size !== "sm" && <span className="opacity-70 normal-case tracking-normal">{v.sub}</span>}
    </div>
  );
}
