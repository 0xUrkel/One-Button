"use client";

import React from "react";

export default function GameStatsCard({
  label,
  value,
  accent = false,
  danger = false,
  critical = false,
  compact = false,
  tiny = false,
  noWrap = false,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  critical?: boolean;
  compact?: boolean;
  tiny?: boolean;
  noWrap?: boolean;
}) {
  const borderColor = critical
    ? "rgba(255,70,70,0.28)"
    : danger
    ? "rgba(255,130,70,0.22)"
    : accent
    ? "rgba(255,120,80,0.18)"
    : "rgba(255,255,255,0.08)";

  const background = critical
    ? "linear-gradient(180deg, rgba(255,70,70,0.10), rgba(255,255,255,0.02))"
    : danger
    ? "linear-gradient(180deg, rgba(255,100,60,0.10), rgba(255,255,255,0.025))"
    : accent
    ? "linear-gradient(180deg, rgba(255,100,60,0.08), rgba(255,255,255,0.025))"
    : "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))";

  return (
    <div
      className={[
        "stat-card",
        compact ? "stat-card-compact" : "",
        tiny ? "stat-card-tiny" : "",
      ].join(" ")}
      style={{
        border: `1px solid ${borderColor}`,
        background,
      }}
    >
      <div className="stat-label">{label}</div>

      <div
        className={[
          "stat-value",
          danger ? "danger-pulse" : "",
          noWrap ? "no-wrap" : "",
          tiny ? "stat-value-tiny" : "",
        ].join(" ")}
        style={{
          textShadow: critical
            ? "0 0 16px rgba(255,70,70,0.22)"
            : danger
            ? "0 0 10px rgba(255,120,70,0.14)"
            : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}
