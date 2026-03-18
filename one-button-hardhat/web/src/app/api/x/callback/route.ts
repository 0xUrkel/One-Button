import { verifyMessage } from "viem";
import { readDb, updateDb } from "@/lib/server/db";
import {
  buildWalletLinkMessage,
  getAppBaseUrl,
  getXClientId,
  getXClientSecret,
  getXRedirectUri,
} from "@/lib/server/xAuth";

type XTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type XMeResponse = {
  data?: {
    id?: string;
    username?: string;
    name?: string;
    profile_image_url?: string;
  };
};

export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url);
    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");

    if (!code || !state) {
      console.error("X callback missing code/state");
      return Response.redirect(`${getAppBaseUrl()}/?x_link=missing_code`);
    }

    const db = await readDb();
    const pending = db.pendingLinks[state];

    if (!pending) {
      console.error("X callback bad state", state);
      return Response.redirect(`${getAppBaseUrl()}/?x_link=bad_state`);
    }

    const message = buildWalletLinkMessage(pending.wallet, pending.nonce);

    const verified = await verifyMessage({
      address: pending.wallet as `0x${string}`,
      message,
      signature: pending.signature as `0x${string}`,
    });

    if (!verified) {
      console.error("X callback bad signature for wallet", pending.wallet);
      return Response.redirect(`${getAppBaseUrl()}/?x_link=bad_signature`);
    }

    const body = new URLSearchParams();
    body.set("code", code);
    body.set("grant_type", "authorization_code");
    body.set("client_id", getXClientId());
    body.set("redirect_uri", getXRedirectUri());
    body.set("code_verifier", pending.codeVerifier);

    const maybeSecret = getXClientSecret();
    if (maybeSecret) {
      body.set("client_secret", maybeSecret);
    }

    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });

    const tokenText = await tokenResponse.text();
    let tokenData: XTokenResponse = {};
    try {
      tokenData = JSON.parse(tokenText) as XTokenResponse;
    } catch {}

    if (!tokenResponse.ok) {
      console.error("X token exchange failed", {
        status: tokenResponse.status,
        body: tokenText,
      });
      return Response.redirect(`${getAppBaseUrl()}/?x_link=token_failed`);
    }

    if (!tokenData.access_token) {
      console.error("X token response missing access token", tokenData);
      return Response.redirect(`${getAppBaseUrl()}/?x_link=no_access_token`);
    }

    const meUrl = new URL("https://api.x.com/2/users/me");
    meUrl.searchParams.set("user.fields", "profile_image_url");

    const meResponse = await fetch(meUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      cache: "no-store",
    });

    const meText = await meResponse.text();
    let meData: XMeResponse = {};
    try {
      meData = JSON.parse(meText) as XMeResponse;
    } catch {}

    if (!meResponse.ok) {
      console.error("X /me failed", {
        status: meResponse.status,
        body: meText,
      });
      return Response.redirect(`${getAppBaseUrl()}/?x_link=me_failed`);
    }

    await updateDb((nextDb) => {
      nextDb.profiles[pending.wallet] = {
        wallet: pending.wallet,
        twitterUserId: meData.data?.id,
        username: meData.data?.username,
        displayName: meData.data?.name,
        avatarUrl: normalizeAvatar(meData.data?.profile_image_url),
        linkedAt: new Date().toISOString(),
      };

      if (nextDb.leaderboard[pending.wallet]) {
        nextDb.leaderboard[pending.wallet].profile =
          nextDb.profiles[pending.wallet];
      }

      delete nextDb.pendingLinks[state];
      delete nextDb.nonces[pending.wallet];

      return nextDb;
    });

    return Response.redirect(`${getAppBaseUrl()}/?x_link=success`);
  } catch (error) {
    console.error("Unhandled X callback error", error);
    return Response.redirect(`${getAppBaseUrl()}/?x_link=callback_failed`);
  }
}

function normalizeAvatar(url?: string) {
  if (!url) return undefined;
  return url.replace("_normal", "_200x200");
}
