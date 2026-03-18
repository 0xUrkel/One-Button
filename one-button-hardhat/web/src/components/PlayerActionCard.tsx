"use client";

import { useState } from "react";
import { CONTRACT_ADDRESS } from "@/lib/constants";
import { formatAvax, shortenAddress } from "@/lib/format";
import { oneButtonGameAbi } from "@/lib/abi/oneButtonGameAbi";
import { useAccount, useWriteContract } from "wagmi";

export default function PlayerActionCard({
  pressCost,
  currentRoundId,
  leader,
  displayTimeRemaining,
}: {
  pressCost?: bigint;
  currentRoundId?: bigint;
  leader?: string;
  displayTimeRemaining: bigint;
}) {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [justPressed, setJustPressed] = useState(false);

  const isLeader =
    !!address && !!leader && address.toLowerCase() === leader.toLowerCase();

  const isDanger = displayTimeRemaining <= 60n;
  const isCritical = displayTimeRemaining <= 10n;

  const ctaText = isCritical
    ? "🚨 STEAL IT NOW"
    : isDanger
    ? "🔥 STEAL THE POT"
    : "Press the Button";

  const helperText = isCritical
    ? "Final seconds. One press changes everything."
    : isDanger
    ? isLeader
      ? "Defend your lead."
      : "The pot is vulnerable now."
    : isLeader
    ? "You are currently winning."
    : "Take the lead before someone else does.";

  function handlePress() {
    if (!pressCost) return;

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: oneButtonGameAbi,
        functionName: "press",
        value: pressCost,
      },
      {
        onSuccess: () => {
          setJustPressed(true);
          window.setTimeout(() => setJustPressed(false), 2200);
        },
      },
    );
  }

  return (
    <div
      className="action-card"
      style={{
        border: isDanger
          ? "1px solid rgba(255,120,80,0.22)"
          : "1px solid rgba(255,120,80,0.14)",
      }}
    >
      <div className="action-label">Make Your Move</div>

      {justPressed ? (
        <div className="action-success">Press submitted.</div>
      ) : null}

      <div className="action-cost-label">Next Press Cost</div>

      <div className="action-cost-value">{formatAvax(pressCost)} AVAX</div>

      <div className="action-helper">{helperText}</div>

      <button
        disabled={!isConnected || !pressCost || isPending}
        onClick={handlePress}
        className={`action-primary-button ${isDanger ? "pulse-cta" : ""}`}
      >
        {isPending ? "Submitting..." : ctaText}
      </button>

      <button
        disabled={!isConnected || currentRoundId === undefined || isPending}
        onClick={() =>
          writeContract({
            address: CONTRACT_ADDRESS,
            abi: oneButtonGameAbi,
            functionName: "claimDividend",
            args: [currentRoundId ?? 0n],
          })
        }
        className="action-secondary-button"
      >
        Claim Dividend
      </button>

      <div className="action-wallet desktop-only-text">
        Wallet: {address ? shortenAddress(address) : "Not connected"}
      </div>
    </div>
  );
}
