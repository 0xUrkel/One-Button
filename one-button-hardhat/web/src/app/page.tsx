"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { CONTRACT_ADDRESS, EMPTY_ADDRESS } from "@/lib/constants";
import { oneButtonGameAbi } from "@/lib/abi/oneButtonGameAbi";
import { formatAvax, formatSeconds, shortenAddress } from "@/lib/format";

import GameHeader from "@/components/GameHeader";
import InstructionsModal from "@/components/InstructionsModal";
import StatusBadge from "@/components/StatusBadge";
import RoundMaintenanceCard from "@/components/RoundMaintenanceCard";
import LeaderboardModal, {
  type LeaderboardEntry,
} from "@/components/LeaderboardModal";

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState<bigint>(0n);
  const [justPressed, setJustPressed] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [snipedToast, setSnipedToast] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const previousLeaderRef = useRef<string | undefined>(undefined);
  const suppressNextSnipeRef = useRef(false);

  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "owner",
  });

  const { data: currentRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "currentRoundId",
  });

  const { data: currentSeasonId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "currentSeasonId",
  });

  const { data: timeRemaining } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "getTimeRemaining",
    query: { refetchInterval: 5000 },
  });

  const { data: currentPhase } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "getCurrentPhase",
    query: { refetchInterval: 3000 },
  });

  const { data: roundData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "rounds",
    args: currentRoundId !== undefined ? [currentRoundId] : undefined,
    query: { enabled: currentRoundId !== undefined, refetchInterval: 3000 },
  });

  const { data: pressCost } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "getCurrentPressCost",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  });

  useEffect(() => {
    if (timeRemaining !== undefined) {
      setDisplayTimeRemaining(timeRemaining);
    }
  }, [timeRemaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTimeRemaining((prev) => (prev > 0n ? prev - 1n : 0n));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeLeftLabel = useMemo(
    () => formatSeconds(displayTimeRemaining),
    [displayTimeRemaining],
  );

  const isDanger = displayTimeRemaining <= 60n;
  const isCritical = displayTimeRemaining <= 10n;

  const isOwner =
    !!address &&
    !!ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  const lastCompletedRoundId =
    currentRoundId !== undefined && currentRoundId > 1n
      ? currentRoundId - 1n
      : undefined;

  const leaderAddress =
    roundData?.[10] && roundData[10] !== EMPTY_ADDRESS
      ? String(roundData[10])
      : undefined;

  const leaderEntry = useMemo(() => {
    if (!leaderAddress) return undefined;
    return leaderboard.find(
      (entry) => entry.wallet.toLowerCase() === leaderAddress.toLowerCase(),
    );
  }, [leaderAddress, leaderboard]);

  const isLeader =
    !!address &&
    !!leaderAddress &&
    address.toLowerCase() === leaderAddress.toLowerCase();

  const helperText = isLeader
    ? isCritical
      ? "🔥 You’re leading. Survive the final seconds."
      : isDanger
      ? "🔥 You’re leading. Defend your spot."
      : "🔥 You’re leading right now."
    : isCritical
    ? "Take the lead before the final seconds end."
    : isDanger
    ? "Take the lead before someone else snipes it."
    : "Take the lead before someone else does.";

  const ctaText = isLeader
    ? isCritical
      ? "🔥 HOLD THE LEAD"
      : "You’re Leading"
    : isCritical
    ? "🚨 STEAL IT NOW"
    : isDanger
    ? "🔥 STEAL THE POT"
    : "Press the Button";

  const lastPressAgo = useMemo(() => {
    const value = leaderEntry?.lastPressTime;
    if (!value) return "Unknown";

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return value;

    const diffSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));

    if (diffSeconds < 5) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }, [leaderEntry?.lastPressTime, nowMs]);

  async function loadLeaderboard() {
    try {
      setLeaderboardLoading(true);
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) {
        setLeaderboard([]);
        return;
      }
      const data = (await res.json()) as LeaderboardEntry[];
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  useEffect(() => {
    if (!address || !leaderAddress) {
      previousLeaderRef.current = leaderAddress;
      return;
    }

    const previousLeader = previousLeaderRef.current;
    const normalizedMe = address.toLowerCase();
    const normalizedLeader = leaderAddress.toLowerCase();

    if (
      previousLeader &&
      previousLeader.toLowerCase() === normalizedMe &&
      normalizedLeader !== normalizedMe
    ) {
      if (suppressNextSnipeRef.current) {
        suppressNextSnipeRef.current = false;
      } else {
        setSnipedToast("💀 You got sniped.");
        window.setTimeout(() => {
          setSnipedToast(null);
        }, 3500);
      }
    }

    previousLeaderRef.current = leaderAddress;
  }, [leaderAddress, address]);

  async function handlePress() {
    if (!pressCost || !address) return;

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: oneButtonGameAbi,
        functionName: "press",
        value: pressCost,
      },
      {
        onSuccess: async (txHash) => {
          suppressNextSnipeRef.current = true;
          setJustPressed(true);
          window.setTimeout(() => setJustPressed(false), 2200);

          try {
            await fetch("/api/leaderboard/record", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                wallet: address,
                avaxContributed: formatAvax(pressCost),
                txHash,
                roundId: currentRoundId?.toString() ?? null,
                isWinning: true,
              }),
            });
          } catch {}

          void loadLeaderboard();
        },
      },
    );
  }

  function handleClaimDividend() {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "claimDividend",
      args: [lastCompletedRoundId ?? 0n],
    });
  }

  return (
    <>
      <InstructionsModal
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboard}
        loading={leaderboardLoading}
        connectedWallet={address}
        currentLeaderWallet={leaderAddress}
      />

      <main className="container sketch-shell">
        <GameHeader onOpenInstructions={() => setInstructionsOpen(true)} />

        {snipedToast ? <div className="sniped-toast">{snipedToast}</div> : null}

        {isLeader ? (
          <div className="leading-banner">🔥 You’re leading.</div>
        ) : null}

        <div className="sketch-status-row">
          <StatusBadge phase={currentPhase} danger={isDanger} />
        </div>

        <section className="sketch-top-row">
          <div className="sketch-mini-card">
            <div className="sketch-mini-label">Season</div>
            <div className="sketch-mini-value">
              {String(currentSeasonId ?? "-")}
            </div>
          </div>

          <div className="sketch-mini-card">
            <div className="sketch-mini-label">Round</div>
            <div className="sketch-mini-value">
              {String(currentRoundId ?? "-")}
            </div>
          </div>

          <div className="sketch-mini-card sketch-pot-card">
            <div className="sketch-mini-label">Pot</div>
            <div className="sketch-mini-value">
              {formatAvax(roundData?.[4])} AVAX
            </div>
          </div>
        </section>

        <section
          className={`sketch-timer-card ${
            isDanger ? "sketch-timer-danger" : ""
          } ${isCritical ? "sketch-timer-critical" : ""}`}
        >
          <div className="sketch-timer-label">Time Left</div>
          <div
            className={`sketch-timer-value ${isDanger ? "danger-pulse" : ""}`}
          >
            {timeLeftLabel}
          </div>
        </section>

        <section className="sketch-action-card">
          <div className="sketch-action-meta">
            <div>
              <div className="sketch-action-label">Make Your Move</div>
              <div className="sketch-cost-label">
                {isConnected ? "Next Press Cost" : "First Press Starts At"}
              </div>{" "}
              <div className="sketch-cost-value">
                {isConnected && pressCost
                  ? `${formatAvax(pressCost)} AVAX`
                  : "0.10 AVAX"}{" "}
              </div>
            </div>
            <div className="sketch-action-helper">
              {isConnected
                ? helperText
                : "Connect wallet to jump in and take the lead."}
            </div>{" "}
          </div>

          <div className="sketch-leader-inline">
            <div className="sketch-leader-main">
              <span className="sketch-leader-inline-label">
                Last pressed by
              </span>

              <span className="sketch-leader-inline-value">
                {leaderAddress ? shortenAddress(leaderAddress) : "-"}
              </span>

              <span className="last-press-meta">Last press {lastPressAgo}</span>
            </div>

            <button
              className="ghost-button leaderboard-inline-button"
              onClick={() => setLeaderboardOpen(true)}
            >
              View leaderboard
            </button>
          </div>

          {justPressed ? (
            <div className="action-success">Press submitted.</div>
          ) : null}

          <button
            disabled={!isConnected || !pressCost || isPending}
            onClick={handlePress}
            className={`action-primary-button ${isDanger ? "pulse-cta" : ""}`}
          >
            {isPending ? "Submitting..." : ctaText}
          </button>

          <div className="claim-block">
            <button
              disabled={
                !isConnected || lastCompletedRoundId === undefined || isPending
              }
              onClick={handleClaimDividend}
              className="action-secondary-button"
            >
              Claim Dividend
            </button>

            <div className="action-caption">
              Dividends become claimable after settlement.
            </div>
          </div>
        </section>

        {isOwner ? (
          <section style={{ marginTop: 10 }}>
            <RoundMaintenanceCard />
          </section>
        ) : null}
      </main>
    </>
  );
}
