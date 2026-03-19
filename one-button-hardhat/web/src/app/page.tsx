"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWatchBlockNumber,
  useWriteContract,
} from "wagmi";

import { CONTRACT_ADDRESS, EMPTY_ADDRESS } from "@/lib/constants";
import { oneButtonGameAbi } from "@/lib/abi/oneButtonGameAbi";
import { formatAvax, formatSeconds, shortenAddress } from "@/lib/format";

import ConnectWalletButton from "@/components/ConnectWalletButton";
import InstructionsModal from "@/components/InstructionsModal";
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

  const { data: ownerAddress, refetch: refetchOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "owner",
  });

  const { data: currentRoundId, refetch: refetchCurrentRoundId } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "currentRoundId",
    });

  const { data: currentSeasonId, refetch: refetchCurrentSeasonId } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "currentSeasonId",
    });

  const { data: timeRemaining, refetch: refetchTimeRemaining } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "getTimeRemaining",
    });

  const { data: currentPhase, refetch: refetchCurrentPhase } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "getCurrentPhase",
  });

  const { data: roundData, refetch: refetchRoundData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "rounds",
    args: currentRoundId !== undefined ? [currentRoundId] : undefined,
    query: { enabled: currentRoundId !== undefined },
  });

  const { data: pressCost, refetch: refetchPressCost } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: oneButtonGameAbi,
    functionName: "getCurrentPressCost",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const roundTuple = roundData as readonly unknown[] | undefined;

  const leaderAddress = useMemo(() => {
    const candidate = roundTuple?.[10];
    return typeof candidate === "string" ? candidate : undefined;
  }, [roundTuple]);

  const { data: leaderLastPressAt, refetch: refetchLeaderLastPressAt } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "playerLastPressAt",
      args:
        currentRoundId !== undefined && leaderAddress
          ? [currentRoundId, leaderAddress as `0x${string}`]
          : undefined,
      query: {
        enabled: currentRoundId !== undefined && !!leaderAddress,
      },
    });

  const lastCompletedRoundId = useMemo(() => {
    if (currentRoundId === undefined || currentRoundId === 0n) return undefined;
    return currentRoundId - 1n;
  }, [currentRoundId]);

  const { data: lastRoundData, refetch: refetchLastRoundData } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "rounds",
      args:
        lastCompletedRoundId !== undefined ? [lastCompletedRoundId] : undefined,
      query: { enabled: lastCompletedRoundId !== undefined },
    });

  const lastRoundTuple = lastRoundData as readonly unknown[] | undefined;

  const { data: lastRoundContribution, refetch: refetchLastRoundContribution } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "playerContribution",
      args:
        lastCompletedRoundId !== undefined && address
          ? [lastCompletedRoundId, address]
          : undefined,
      query: {
        enabled: lastCompletedRoundId !== undefined && !!address,
      },
    });

  const { data: dividendAlreadyClaimed, refetch: refetchDividendClaimed } =
    useReadContract({
      address: CONTRACT_ADDRESS,
      abi: oneButtonGameAbi,
      functionName: "dividendClaimed",
      args:
        lastCompletedRoundId !== undefined && address
          ? [lastCompletedRoundId, address]
          : undefined,
      query: {
        enabled: lastCompletedRoundId !== undefined && !!address,
      },
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

  useWatchBlockNumber({
    onBlockNumber() {
      setNowMs(Date.now());
      void refetchOwner();
      void refetchCurrentRoundId();
      void refetchCurrentSeasonId();
      void refetchTimeRemaining();
      void refetchCurrentPhase();
      void refetchRoundData();
      void refetchLastRoundData();
      void refetchLeaderLastPressAt();

      if (address) {
        void refetchPressCost();
        void refetchLastRoundContribution();
        void refetchDividendClaimed();
      }

      void loadLeaderboard();
    },
  });

  const isOwner = useMemo(() => {
    if (!address || !ownerAddress) return false;
    return address.toLowerCase() === ownerAddress.toLowerCase();
  }, [address, ownerAddress]);

  const timeLeftLabel = useMemo(() => {
    return formatSeconds(displayTimeRemaining);
  }, [displayTimeRemaining]);

  const isDanger = useMemo(() => {
    const secs = Number(displayTimeRemaining ?? 0n);
    return secs <= 60;
  }, [displayTimeRemaining]);

  const isCritical = useMemo(() => {
    const secs = Number(displayTimeRemaining ?? 0n);
    return secs <= 15;
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

  const lastPressAgo = useMemo(() => {
    const raw = leaderLastPressAt;

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
  }, [leaderLastPressAt, nowMs]);

  const lastRoundSettled = Boolean(lastRoundTuple?.[11]);
  const lastRoundWinner =
    typeof lastRoundTuple?.[10] === "string" ? lastRoundTuple[10] : undefined;
  const lastRoundWinnerPayout =
    typeof lastRoundTuple?.[5] === "bigint" ? lastRoundTuple[5] : 0n;
  const lastRoundDividendPool =
    typeof lastRoundTuple?.[6] === "bigint" ? lastRoundTuple[6] : 0n;
  const lastRoundTotalPot =
    typeof lastRoundTuple?.[4] === "bigint" ? lastRoundTuple[4] : 0n;

  const claimableDividend = useMemo(() => {
    if (!lastRoundSettled) return 0n;
    if (!address) return 0n;
    if (dividendAlreadyClaimed) return 0n;
    if (
      typeof lastRoundContribution !== "bigint" ||
      lastRoundContribution === 0n
    ) {
      return 0n;
    }
    if (lastRoundTotalPot === 0n || lastRoundDividendPool === 0n) return 0n;

    return (lastRoundDividendPool * lastRoundContribution) / lastRoundTotalPot;
  }, [
    address,
    dividendAlreadyClaimed,
    lastRoundContribution,
    lastRoundDividendPool,
    lastRoundSettled,
    lastRoundTotalPot,
  ]);

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

          void refetchCurrentRoundId();
          void refetchCurrentSeasonId();
          void refetchTimeRemaining();
          void refetchCurrentPhase();
          void refetchRoundData();
          void refetchLastRoundData();
          void refetchPressCost();
          void refetchLeaderLastPressAt();
          void refetchLastRoundContribution();
          void refetchDividendClaimed();
          void loadLeaderboard();
        },
      },
    );
  }

  function handleClaimDividend() {
    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: oneButtonGameAbi,
        functionName: "claimDividend",
        args: [lastCompletedRoundId ?? 0n],
      },
      {
        onSuccess: () => {
          void refetchLastRoundContribution();
          void refetchDividendClaimed();
          void refetchLastRoundData();
        },
      },
    );
  }

  const statCards = [
    {
      label: "Season",
      value: String(currentSeasonId ?? "-"),
      accent: false,
    },
    {
      label: "Round",
      value: String(currentRoundId ?? "-"),
      accent: false,
    },
    {
      label: "Pot",
      value: `${formatAvax(roundTuple?.[4] as bigint | undefined)} AVAX`,
      accent: true,
    },
    {
      label: "Last Round Dividend Pool",
      value: `${formatAvax(lastRoundDividendPool)} AVAX`,
      accent: false,
    },
    {
      label: "Your Contribution",
      value: `${formatAvax(
        typeof lastRoundContribution === "bigint" ? lastRoundContribution : 0n,
      )} AVAX`,
      accent: false,
    },
    {
      label: "Claimable Dividend",
      value: `${formatAvax(claimableDividend)} AVAX`,
      accent: true,
    },
  ];

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
        <section className="compact-hero compact-hero-tight">
          <div className="compact-hero-copy">
            <h1>One Button</h1>
            <p>Last presser wins the pot.</p>
          </div>

          <div className="compact-hero-actions compact-hero-actions-stack">
            <ConnectWalletButton />

            <button
              onClick={() => setInstructionsOpen(true)}
              className="hero-inline-link"
              type="button"
            >
              How it works
            </button>
          </div>
        </section>

        {snipedToast ? <div className="sniped-toast">{snipedToast}</div> : null}

        {lastRoundSettled &&
        lastRoundWinner &&
        lastRoundWinner !== EMPTY_ADDRESS ? (
          <section className="winner-banner-card">
            <div className="winner-banner-head">Previous Round Winner</div>
            <div className="winner-banner-row">
              <div className="winner-banner-left">
                <div className="winner-banner-wallet">
                  {shortenAddress(lastRoundWinner)}
                </div>
                <div className="winner-banner-sub">
                  Round #{String(lastCompletedRoundId ?? "-")} settled
                </div>
              </div>

              <div className="winner-banner-right">
                <div className="winner-banner-won-label">Won</div>
                <div className="winner-banner-amount">
                  {formatAvax(lastRoundWinnerPayout)} AVAX
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {isLeader ? (
          <div className="leading-banner">🔥 You’re leading.</div>
        ) : null}

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

        <section className="stats-grid stats-grid-compact">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`stats-grid-card ${card.accent ? "is-accent" : ""}`}
            >
              <span className="stats-grid-label">{card.label}</span>
              <strong className="stats-grid-value">{card.value}</strong>
            </div>
          ))}
        </section>

        <section className="sketch-action-card action-card-compact action-card-centered">
          <div className="sketch-action-label">Make Your Move</div>

          <div className="sketch-cost-wrap sketch-cost-wrap-centered">
            <div className="sketch-cost-label">
              {isConnected ? "Next Press Cost" : "First Press Starts At"}
            </div>

            <div className="sketch-cost-value">
              {isConnected && pressCost
                ? `${formatAvax(pressCost)} AVAX`
                : "0.10 AVAX"}
            </div>
          </div>

          <p className="action-card-helper action-card-helper-centered">
            {helperText}
          </p>

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
                !isConnected ||
                lastCompletedRoundId === undefined ||
                isPending ||
                claimableDividend === 0n ||
                !!dividendAlreadyClaimed
              }
              onClick={handleClaimDividend}
              className="ghost-button secondary-ghost-button"
            >
              {dividendAlreadyClaimed
                ? "✅ Dividend Claimed"
                : claimableDividend > 0n
                ? `Claim ${formatAvax(claimableDividend)} AVAX`
                : "No Dividend"}
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

      <a
        href="https://x.com/0xUrkel"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-help"
      >
        ?
      </a>
    </>
  );
}
