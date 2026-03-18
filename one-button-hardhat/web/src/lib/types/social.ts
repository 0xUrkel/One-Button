"use client";

import { CONTRACT_ADDRESS } from "@/lib/constants";
import { oneButtonGameAbi } from "@/lib/abi/oneButtonGameAbi";
import { useWriteContract } from "wagmi";

export default function RoundMaintenanceCard() {
  const { writeContract, isPending } = useWriteContract();

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 18,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Round Maintenance
      </div>

      <div
        style={{
          fontSize: 14,
          opacity: 0.8,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        Settlement finalizes the round and unlocks dividend claims.
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <button
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: CONTRACT_ADDRESS,
              abi: oneButtonGameAbi,
              functionName: "settleRound",
            })
          }
          style={primaryButton}
        >
          {isPending ? "Submitting..." : "Round ended — settle now"}
        </button>

        <button
          disabled={isPending}
          onClick={() =>
            writeContract({
              address: CONTRACT_ADDRESS,
              abi: oneButtonGameAbi,
              functionName: "rollRoundIfExpiredWithoutPresses",
            })
          }
          style={secondaryButton}
        >
          Roll Empty Round
        </button>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  width: "100%",
  background: "white",
  color: "black",
  border: "none",
  padding: "12px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "12px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};
