import crypto from "crypto";

export function randomString(size = 32): string {
  return crypto.randomBytes(size).toString("hex");
}

export function createPkceVerifier(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function createPkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function buildWalletLinkMessage(wallet: string, nonce: string): string {
  return [
    "One Button wants to link your X profile.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

export function getAppBaseUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://127.0.0.1:3000";

  return value.replace(/\/$/, "");
}

export function getXRedirectUri(): string {
  return `${getAppBaseUrl()}/api/x/callback`;
}

export function getXClientId(): string {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing X_CLIENT_ID");
  }
  return clientId;
}

export function getXClientSecret(): string | undefined {
  return process.env.X_CLIENT_SECRET || undefined;
}

export function getXScope(): string {
  return "users.read tweet.read offline.access";
}
