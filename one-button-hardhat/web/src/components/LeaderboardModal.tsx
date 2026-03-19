"use client";

import { shortenAddress } from "@/lib/format";

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  presses?: number;
  avaxContributed?: string;
  lastPressTime?: string;
  isWinning?: boolean;
  profile?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
};

type LeaderboardModalProps = {
  open: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  loading?: boolean;
  connectedWallet?: string;
  currentLeaderWallet?: string;
};

export default function LeaderboardModal({
  open,
  onClose,
  entries,
  loading = false,
  connectedWallet,
  currentLeaderWallet,
}: LeaderboardModalProps) {
  if (!open) return null;

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={panel}>
        <div className="leaderboard-modal-header">
          <div className="leaderboard-modal-copy">
            <h2 className="leaderboard-modal-title">Current Leaderboard</h2>
            <p className="leaderboard-modal-subtitle">
              Climb the board, defend your lead, and survive the timer.
            </p>
          </div>

          <button onClick={onClose} className="leaderboard-close-button">
            Close
          </button>
        </div>

        <div className="leaderboard-table-wrap">
          <div className="leaderboard-table-head">
            <div>Rank</div>
            <div>Player</div>
            <div>Presses</div>
            <div>AVAX</div>
            <div>Last Press</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="leaderboard-empty">Loading leaderboard...</div>
          ) : entries.length === 0 ? (
            <div className="leaderboard-empty">
              No leaderboard data yet. Be the first to press.
            </div>
          ) : (
            <div className="leaderboard-table-body">
              {entries.map((entry) => {
                const isYou =
                  !!connectedWallet &&
                  connectedWallet.toLowerCase() === entry.wallet.toLowerCase();

                const isCurrentLeader =
                  !!currentLeaderWallet &&
                  currentLeaderWallet.toLowerCase() ===
                    entry.wallet.toLowerCase();

                const playerName =
                  entry.profile?.displayName ||
                  (entry.profile?.username
                    ? `@${entry.profile.username}`
                    : shortenAddress(entry.wallet));

                return (
                  <div
                    key={entry.wallet}
                    className={`leaderboard-row ${
                      isCurrentLeader ? "leaderboard-row-active" : ""
                    } ${isYou ? "leaderboard-row-you" : ""}`}
                  >
                    <div
                      className="leaderboard-cell leaderboard-rank"
                      data-label="Rank"
                    >
                      <span className="leaderboard-rank-pill">
                        #{entry.rank}
                      </span>
                    </div>

                    <div
                      className="leaderboard-cell leaderboard-player"
                      data-label="Player"
                    >
                      {entry.profile?.avatarUrl ? (
                        <img
                          src={entry.profile.avatarUrl}
                          alt={playerName}
                          className="leader-avatar"
                        />
                      ) : (
                        <div className="leader-avatar leader-avatar-fallback">
                          {playerName.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="leaderboard-player-copy">
                        <div className="leaderboard-player-name">
                          {playerName}
                        </div>
                        <div className="leaderboard-player-wallet">
                          {shortenAddress(entry.wallet)}
                        </div>
                      </div>
                    </div>

                    <div
                      className="leaderboard-cell leaderboard-number"
                      data-label="Presses"
                    >
                      {entry.presses ?? "-"}
                    </div>

                    <div
                      className="leaderboard-cell leaderboard-number"
                      data-label="AVAX"
                    >
                      {entry.avaxContributed ?? "-"}
                    </div>

                    <div
                      className="leaderboard-cell leaderboard-time"
                      data-label="Last Press"
                    >
                      {formatLastPress(entry.lastPressTime)}
                    </div>

                    <div
                      className="leaderboard-cell leaderboard-badges"
                      data-label="Status"
                    >
                      {isCurrentLeader ? (
                        <span className="leaderboard-badge leaderboard-badge-win">
                          Leader
                        </span>
                      ) : null}

                      {entry.isWinning && !isCurrentLeader ? (
                        <span className="leaderboard-badge leaderboard-badge-hot">
                          Hot
                        </span>
                      ) : null}

                      {isYou ? (
                        <span className="leaderboard-badge leaderboard-badge-you">
                          You
                        </span>
                      ) : null}

                      {!isCurrentLeader && !entry.isWinning && !isYou ? (
                        <span className="leaderboard-badge leaderboard-badge-idle">
                          Live
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatLastPress(value?: string) {
  if (!value) return "-";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 5) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.76)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 1120,
  maxHeight: "88vh",
  overflowY: "auto",
  background:
    "linear-gradient(180deg, rgba(13,14,18,0.98), rgba(9,10,13,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
};
