"use client";

import { useMemo, useState } from "react";
import { shortenAddress } from "@/lib/format";

export type SocialProfile = {
  wallet: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

type TwitterIdentityButtonProps = {
  wallet?: string;
  isConnected: boolean;
  profile: SocialProfile | null;
  onStartLink: () => Promise<void>;
};

export default function TwitterIdentityButton({
  wallet,
  isConnected,
  profile,
  onStartLink,
}: TwitterIdentityButtonProps) {
  const [busy, setBusy] = useState(false);

  const buttonText = useMemo(() => {
    if (!isConnected) return "Connect wallet first";
    if (profile?.username) return `Showing @${profile.username}`;
    return "Link X profile";
  }, [isConnected, profile]);

  async function handleClick() {
    if (!wallet || !isConnected || busy) return;

    try {
      setBusy(true);
      await onStartLink();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start X login";
      alert(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="identity-link-wrap">
      {profile ? (
        <div className="identity-preview">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={
                profile.displayName ||
                profile.username ||
                shortenAddress(wallet)
              }
              className="leader-avatar"
            />
          ) : (
            <div className="leader-avatar leader-avatar-fallback">
              {(profile.displayName || profile.username || "X")
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}

          <div className="identity-preview-copy">
            <div className="identity-preview-title">
              {profile.displayName ||
                `@${profile.username}` ||
                "Linked profile"}
            </div>
            <div className="identity-preview-subtitle">
              Leaderboard will show your avatar and X name.
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        className="ghost-button"
        disabled={!isConnected || busy}
      >
        {busy ? "Opening X..." : buttonText}
      </button>
    </div>
  );
}
