const VARIANTS = {
  green: { label: "Perfekt", sub: "CI konform", color: "#1E7F4C", glyph: "✓" },
  yellow: { label: "Einige Issues", sub: "kleinere Abweichungen", color: "#B5720A", glyph: "!" },
  red: { label: "Abweichung", sub: "CI-Verstoß", color: "#B23A2E", glyph: "✕" },
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
