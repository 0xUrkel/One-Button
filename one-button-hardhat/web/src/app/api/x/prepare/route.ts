import { updateDb } from "@/lib/server/db";
import { buildWalletLinkMessage, randomString } from "@/lib/server/xAuth";

type PrepareBody = {
  wallet?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as PrepareBody;
  const wallet = body.wallet?.toLowerCase();

  if (!wallet) {
    return new Response("Missing wallet", { status: 400 });
  }

  const nonce = randomString(16);
  const message = buildWalletLinkMessage(wallet, nonce);

  await updateDb((db) => {
    db.nonces[wallet] = {
      nonce,
      message,
      createdAt: new Date().toISOString(),
    };
    return db;
  });

  return Response.json({
    nonce,
    message,
  });
}
