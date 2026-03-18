import { readDb } from "@/lib/server/db";
import type { LeaderboardEntryRecord } from "@/lib/types/social";

export async function GET() {
  const db = await readDb();

  const entries = (Object.values(db.leaderboard) as LeaderboardEntryRecord[])
    .sort((a, b) => {
      if (b.presses !== a.presses) return b.presses - a.presses;
      return (b.lastPressTime || "").localeCompare(a.lastPressTime || "");
    })
    .map((entry, index) => ({
      rank: index + 1,
      wallet: entry.wallet,
      presses: entry.presses,
      avaxContributed: entry.avaxContributed,
      lastPressTime: entry.lastPressTime,
      isWinning: entry.isWinning,
      profile: db.profiles[entry.wallet.toLowerCase()] ?? null,
    }));

  return Response.json(entries);
}
