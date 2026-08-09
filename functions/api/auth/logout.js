// Cloudflare Pages Function — POST /api/auth/logout
// POST only: a GET would let any page sign the user out with an <img> tag.

import { SESSION_COOKIE, clearCookie, json } from "../_shared.js";

export async function onRequestPost({ request }) {
  return json(
    { signedOut: true },
    200,
    { "Set-Cookie": clearCookie(request, SESSION_COOKIE) }
  );
}
