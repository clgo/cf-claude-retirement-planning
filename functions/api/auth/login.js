// Cloudflare Pages Function — GET /api/auth/login
// Starts the Google sign-in redirect. No third-party script runs in the browser.

import {
  STATE_COOKIE,
  buildCookie,
  missingAuthConfig,
  notConfigured,
} from "../_shared.js";

const STATE_TTL_SECONDS = 600;

export async function onRequestGet({ request, env }) {
  const missing = missingAuthConfig(env);
  if (missing.length) return notConfigured(missing);

  const origin = new URL(request.url).origin;

  // Opaque random value echoed back by Google and compared against the cookie,
  // so a forged callback from another site can't complete a sign-in.
  const state = crypto.randomUUID();

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", origin + "/api/auth/callback");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "select_account");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Cache-Control": "no-store",
      "Set-Cookie": buildCookie(request, STATE_COOKIE, state, STATE_TTL_SECONDS),
    },
  });
}
