import { updateDb } from "@/lib/server/db";

type RecordBody = {
  wallet?: string;
  avaxContributed?: string;
  txHash?: string;
  roundId?: string | null;
  isWinning?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json()) as RecordBody;
  const wallet = body.wallet?.toLowerCase();

  if (!wallet) {
    return new Response("Missing wallet", { status: 400 });
  }

  await updateDb((db) => {
    const existing = db.leaderboard[wallet];

    db.leaderboard[wallet] = {
      wallet,
      presses: (existing?.presses ?? 0) + 1,
      avaxContributed: addDecimalStrings(
        existing?.avaxContributed ?? "0",
        body.avaxContributed ?? "0",
      ),
      lastPressTime: new Date().toISOString(),
      isWinning: body.isWinning ?? false,
      lastTxHash: body.txHash ?? existing?.lastTxHash,
      profile: db.profiles[wallet] ?? null,
    };

    for (const key of Object.keys(db.leaderboard)) {
      db.leaderboard[key].isWinning = key === wallet;
    }

    return db;
  });

  return Response.json({ ok: true });
}

function addDecimalStrings(a: string, b: string): string {
  const aNum = Number.parseFloat(a || "0");
  const bNum = Number.parseFloat(b || "0");
  const total =
    (Number.isFinite(aNum) ? aNum : 0) + (Number.isFinite(bNum) ? bNum : 0);

  return total.toFixed(6).replace(/\.?0+$/, "");
}
