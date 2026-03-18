"use client";

import { shortenAddress } from "@/lib/format";

export default function LeaderCard({
  leader,
  isLeader = false,
  compact = false,
}: {
  leader?: string;
  isLeader?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? "leader-card leader-card-compact" : "leader-card"}
    >
      <div className="leader-label">Last Pressed By</div>

      <div className="leader-value">{shortenAddress(leader)}</div>

      <div className="leader-subtext desktop-only-text">
        {isLeader
          ? "You are currently winning."
          : "Beat them before time runs out."}
      </div>
    </div>
  );
}
