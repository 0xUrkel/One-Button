"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";

import { CONTRACT_ADDRESS, EMPTY_ADDRESS } from "@/lib/constants";
import { oneButtonGameAbi } from "@/lib/abi/oneButtonGameAbi";
import { formatAvax, formatSeconds, shortenAddress } from "@/lib/format";

import ConnectWalletButton from "@/components/ConnectWalletButton";
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
    if (timeRemaining === undefined) return;
    setDisplayTimeRemaining(timeRemaining);
  }, [timeRemaining]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNowMs(Date.now());
      setDisplayTimeRemaining((prev) => (prev > 0n ? prev - 1n : 0n));
    }, 1000);

    return () => window.clearInterval(tick);
  }, []);

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const roundTuple = roundData as readonly unknown[] | undefined;

  const leaderAddress = useMemo(() => {
    const candidate = roundTuple?.[2];
    return typeof candidate === "string" ? candidate : undefined;
  }, [roundTuple]);

  const timeLeftLabel = useMemo(() => {
    return formatSeconds(displayTimeRemaining);
  }, [displayTimeRemaining]);

  const isDanger = useMemo(() => {
    const secs = Number(displayTimeRemaining ?? 0n);
    return secs <= 3600;
  }, [displayTimeRemaining]);

  const isCritical = useMemo(() => {
    const secs = Number(displayTimeRemaining ?? 0n);
    return secs <= 600;
  }, [displayTimeRemaining]);

  const isLeader = useMemo(() => {
    if (!address || !leaderAddress) return false;
    return address.toLowerCase() === leaderAddress.toLowerCase();
  }, [address, leaderAddress]);

  const helperText = useMemo(() => {
    if (!isConnected) return "Connect wallet to jump in and take the lead.";
    if (isLeader)
      return "You’re in front. Defend the lead until the timer hits zero.";
    if (isCritical) return "Sudden death. Every second matters now.";
    if (isDanger) return "The window is tight. One press can swing the round.";
    return "Press to take the lead before someone else does.";
  }, [isConnected, isLeader, isCritical, isDanger]);

  const ctaText = useMemo(() => {
    if (!isConnected) return "Connect Wallet to Play";
    if (isPending) return "Submitting...";
    if (isLeader) return "Defend Your Lead";
    return "Press the Button";
  }, [isConnected, isLeader, isPending]);

  const lastCompletedRoundId = useMemo(() => {
    if (currentRoundId === undefined || currentRoundId === 0n) return undefined;
    return currentRoundId - 1n;
  }, [currentRoundId]);

  const lastPressAgo = useMemo(() => {
    const raw = roundTuple?.[3];
    if (typeof raw !== "bigint" || raw === 0n) return "Unknown";

    const diffSeconds = Math.max(
      0,
      Math.floor((nowMs - Number(raw) * 1000) / 1000),
    );

    if (diffSeconds < 5) return "just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `${mins}m ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, [roundTuple, nowMs]);

  async function loadLeaderboard() {
    setLeaderboardLoading(true);

    try {
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
          } catch {
            // no-op
          }

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
        <section className="compact-hero">
          <div className="compact-hero-copy">
            <h1>One Button</h1>
            <p>Last presser wins the pot.</p>
          </div>

          <div className="compact-hero-actions">
            <button
              onClick={() => setInstructionsOpen(true)}
              className="ghost-button hero-secondary-button"
            >
              How It Works
            </button>

            <ConnectWalletButton />
          </div>
        </section>

        {snipedToast ? <div className="sniped-toast">{snipedToast}</div> : null}

        {isLeader ? (
          <div className="leading-banner">🔥 You’re leading.</div>
        ) : null}

        <div className="sketch-status-row">
          <StatusBadge phase={currentPhase} danger={isDanger} />
        </div>

        <section
          className={`sketch-timer-card hero-timer-card ${
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

        <section className="stats-strip">
          <div className="stats-strip-item">
            <span className="stats-strip-label">Season</span>
            <strong className="stats-strip-value">
              {String(currentSeasonId ?? "-")}
            </strong>
          </div>

          <div className="stats-strip-item">
            <span className="stats-strip-label">Round</span>
            <strong className="stats-strip-value">
              {String(currentRoundId ?? "-")}
            </strong>
          </div>

          <div className="stats-strip-item stats-strip-item-pot">
            <span className="stats-strip-label">Pot</span>
            <strong className="stats-strip-value">
              {formatAvax(roundTuple?.[4] as bigint | undefined)} AVAX
            </strong>
          </div>
        </section>

        <section className="sketch-action-card action-card-compact">
          <div className="action-card-top">
            <div className="sketch-action-label">Make Your Move</div>

            <div className="sketch-cost-wrap">
              <div className="sketch-cost-label">
                {isConnected ? "Next Press Cost" : "First Press Starts At"}
              </div>

              <div className="sketch-cost-value">
                {isConnected && pressCost
                  ? `${formatAvax(pressCost)} AVAX`
                  : "0.10 AVAX"}
              </div>
            </div>
          </div>

          <p className="action-card-helper">{helperText}</p>

          {justPressed ? (
            <div className="action-success">Press submitted.</div>
          ) : null}

          <button
            disabled={!isConnected || !pressCost || isPending}
            onClick={handlePress}
            className={`action-primary-button ${isDanger ? "pulse-cta" : ""}`}
          >
            {ctaText}
          </button>

          <div className="mobile-last-pressed">
            <span className="mobile-last-pressed-label">Last press</span>
            <span className="mobile-last-pressed-value">
              {leaderAddress && leaderAddress !== EMPTY_ADDRESS
                ? shortenAddress(leaderAddress)
                : "-"}
            </span>
            <span className="mobile-last-pressed-meta">{lastPressAgo}</span>
          </div>
        </section>

        <section className="secondary-actions-card">
          <div className="secondary-actions-grid">
            <button
              className="ghost-button secondary-ghost-button"
              onClick={() => setLeaderboardOpen(true)}
            >
              View Leaderboard
            </button>

            <button
              disabled={
                !isConnected || lastCompletedRoundId === undefined || isPending
              }
              onClick={handleClaimDividend}
              className="ghost-button secondary-ghost-button"
            >
              Claim Dividend
            </button>
          </div>

          <div className="action-caption secondary-caption">
            Dividends become claimable after settlement.
          </div>
        </section>

        {isOwner ? (
          <section style={{ marginTop: 4 }}>
            <RoundMaintenanceCard />
          </section>
        ) : null}
      </main>
    </>
  );
}
