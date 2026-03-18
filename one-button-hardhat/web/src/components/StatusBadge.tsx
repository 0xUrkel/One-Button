"use client";

export default function StatusBadge({
  phase,
  danger = false,
}: {
  phase?: string;
  danger?: boolean;
}) {
  const label = (phase || "loading").replaceAll("_", " ").toUpperCase();

  const glow =
    label.includes("SUDDEN") || danger
      ? "rgba(255,60,60,0.35)"
      : label.includes("LATE")
      ? "rgba(255,140,0,0.28)"
      : "rgba(255,255,255,0.12)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        background: "rgba(255,255,255,0.03)",
        boxShadow: `0 0 24px ${glow}`,
      }}
    >
      {label}
    </span>
  );
}
