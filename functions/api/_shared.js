// Shared helpers for the /api Functions.
// Pages does not route files whose name starts with "_", so this is not an endpoint.

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });

export const noDB = () =>
  json(
    { error: "D1 database binding 'DB' is not configured for this Pages project." },
    503
  );

export const notConfigured = (missing) =>
  json(
    {
      error:
        "Google sign-in is not configured for this deployment. Missing: " +
        missing.join(", ") +
        ".",
    },
    503
  );

/* Returns the names of any auth settings that haven't been provided. */
export function missingAuthConfig(env) {
  return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "SESSION_SECRET"].filter(
    (k) => !env[k]
  );
}

/* ---------- base64url ---------------------------------------------------- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* Reads the claims out of a JWT without verifying the signature.
 *
 * Only safe for an id_token we just received in the body of our own TLS request
 * to Google's token endpoint — OpenID Connect explicitly permits skipping
 * signature validation there, because the transport already authenticates the
 * issuer. Never use this on a token handed to us by a browser. */
export function decodeJwtClaims(jwt) {
  const parts = String(jwt || "").split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(decoder.decode(fromBase64Url(parts[1])));
  } catch {
    return null;
  }
}

/* ---------- session token ------------------------------------------------ */
// Stateless, HMAC-SHA256 signed: "<base64url(json)>.<base64url(sig)>".
// Nothing secret lives in the payload — it is signed, not encrypted — so it
// carries only the Google subject id, the email we display, and an expiry.

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(payload, secret) {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return body + "." + toBase64Url(new Uint8Array(sig));
}

/* Returns the payload, or null if the token is absent, tampered with, or expired. */
export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  try {
    const key = await hmacKey(secret);
    // crypto.subtle.verify compares in constant time.
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(token.slice(dot + 1)),
      encoder.encode(body)
    );
    if (!ok) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(body)));
    if (!payload.sub || !payload.exp) return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionPayload(sub, email) {
  return {
    sub,
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
}

/* ---------- cookies ------------------------------------------------------ */

export const SESSION_COOKIE = "rr_session";
export const STATE_COOKIE = "rr_oauth_state";

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/* Secure is set only over https so that http://localhost dev still works. */
export function buildCookie(request, name, value, maxAgeSeconds) {
  const secure = new URL(request.url).protocol === "https:";
  return (
    `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}` +
    (secure ? "; Secure" : "")
  );
}

export const clearCookie = (request, name) => buildCookie(request, name, "", 0);

export const sessionCookie = (request, token) =>
  buildCookie(request, SESSION_COOKIE, token, SESSION_TTL_SECONDS);

/* ---------- auth guard --------------------------------------------------- */

/* Resolves to the session payload, or null when the caller is signed out. */
export async function getSession(request, env) {
  return verifySession(readCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
}

export const unauthorized = () =>
  json({ error: "Sign in with Google to use saved scenarios." }, 401);
