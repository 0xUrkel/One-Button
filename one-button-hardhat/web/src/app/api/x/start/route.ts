import { updateDb, readDb } from "@/lib/server/db";
import {
  createPkceChallenge,
  createPkceVerifier,
  getXClientId,
  getXRedirectUri,
  getXScope,
  randomString,
} from "@/lib/server/xAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet")?.toLowerCase();
  const nonce = url.searchParams.get("nonce");
  const signature = url.searchParams.get("signature");

  if (!wallet || !nonce || !signature) {
    return new Response("Missing wallet, nonce, or signature", { status: 400 });
  }

  const db = await readDb();
  const nonceRecord = db.nonces[wallet];

  if (!nonceRecord || nonceRecord.nonce !== nonce) {
    return new Response("Invalid or expired nonce", { status: 400 });
  }

  const state = randomString(16);
  const codeVerifier = createPkceVerifier();
  const codeChallenge = createPkceChallenge(codeVerifier);

  await updateDb((nextDb) => {
    nextDb.pendingLinks[state] = {
      wallet,
      nonce,
      signature,
      state,
      codeVerifier,
      createdAt: new Date().toISOString(),
    };
    return nextDb;
  });

  const authUrl = new URL("https://x.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", getXClientId());
  authUrl.searchParams.set("redirect_uri", getXRedirectUri());
  authUrl.searchParams.set("scope", getXScope());
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return Response.redirect(authUrl.toString(), 302);
}
