// Cloudflare Pages Function — GET /api/auth/callback
// Google redirects here with ?code=...&state=.... We exchange the code for an
// id_token server-side (the client secret never reaches the browser), then set
// our own signed session cookie.

import {
  STATE_COOKIE,
  clearCookie,
  decodeJwtClaims,
  missingAuthConfig,
  notConfigured,
  readCookie,
  sessionCookie,
  sessionPayload,
  signSession,
} from "../_shared.js";

/* Send the user back to the app with a short reason code rather than showing a
 * raw error page; index.html turns these into a toast. */
function backToApp(request, reason) {
  const origin = new URL(request.url).origin;
  const headers = new Headers({
    Location: origin + (reason ? "/?auth=" + reason : "/"),
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", clearCookie(request, STATE_COOKIE));
  return { headers };
}

export async function onRequestGet({ request, env }) {
  const missing = missingAuthConfig(env);
  if (missing.length) return notConfigured(missing);

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // The user cancelled at Google's consent screen.
  if (url.searchParams.get("error")) {
    const { headers } = backToApp(request, "denied");
    return new Response(null, { status: 302, headers });
  }

  const expectedState = readCookie(request, STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) {
    const { headers } = backToApp(request, "state");
    return new Response(null, { status: 302, headers });
  }

  let claims;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: url.origin + "/api/auth/callback",
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error("token endpoint " + res.status);
    claims = decodeJwtClaims((await res.json()).id_token);
  } catch {
    const { headers } = backToApp(request, "exchange");
    return new Response(null, { status: 302, headers });
  }

  // `sub` is Google's stable per-user id and is what we key scenarios on —
  // email can change hands, sub cannot.
  if (!claims || !claims.sub || claims.email_verified !== true) {
    const { headers } = backToApp(request, "unverified");
    return new Response(null, { status: 302, headers });
  }

  const token = await signSession(
    sessionPayload(claims.sub, claims.email || ""),
    env.SESSION_SECRET
  );

  const { headers } = backToApp(request, null);
  headers.append("Set-Cookie", sessionCookie(request, token));
  return new Response(null, { status: 302, headers });
}
