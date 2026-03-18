export type SocialProfile = {
  wallet: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  twitterUserId?: string;
  linkedAt?: string;
};

export type LeaderboardEntryRecord = {
  wallet: string;
  presses: number;
  avaxContributed: string;
  lastPressTime: string;
  isWinning?: boolean;
  lastTxHash?: string;
  profile?: SocialProfile | null;
};

export type PendingLink = {
  wallet: string;
  nonce: string;
  signature: string;
  state: string;
  codeVerifier: string;
  createdAt: string;
};

export type LocalDb = {
  profiles: Record<string, SocialProfile>;
  leaderboard: Record<string, LeaderboardEntryRecord>;
  nonces: Record<string, { nonce: string; message: string; createdAt: string }>;
  pendingLinks: Record<string, PendingLink>;
};
