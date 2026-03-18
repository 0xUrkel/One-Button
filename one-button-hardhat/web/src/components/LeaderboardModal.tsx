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
        <div style={headerRow}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Current Leaderboard</h2>
            <p style={{ margin: "8px 0 0", opacity: 0.75, lineHeight: 1.5 }}>
              Climb the board, defend your lead, and survive the timer.
            </p>
          </div>

          <button onClick={onClose} style={closeButton}>
            Close
          </button>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
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
            entries.map((entry) => {
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
                  key={`${entry.rank}-${entry.wallet}`}
                  className={`leaderboard-row ${
                    isCurrentLeader ? "leaderboard-row-active" : ""
                  }`}
                >
                  <div className="leaderboard-rank">#{entry.rank}</div>

                  <div className="leaderboard-player">
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

                  <div>{entry.presses ?? "-"}</div>
                  <div>{entry.avaxContributed ?? "-"}</div>
                  <div>{formatLastPress(entry.lastPressTime)}</div>

                  <div className="leaderboard-badges">
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
                  </div>
                </div>
              );
            })
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
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 980,
  maxHeight: "85vh",
  overflowY: "auto",
  background: "#111214",
  border: "1px solid #26272b",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 16,
};

const closeButton: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid #333",
  padding: "8px 12px",
  borderRadius: 10,
};
