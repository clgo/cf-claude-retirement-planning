// Cloudflare Pages Function — GET /api/auth/me
// Tells the frontend whether to show "Sign in" or "Signed in as ...".
// Always 200: being signed out is a normal state here, not an error.

import { getSession, json, missingAuthConfig } from "../_shared.js";

export async function onRequestGet({ request, env }) {
  if (missingAuthConfig(env).length) {
    return json({ signedIn: false, configured: false });
  }
  const session = await getSession(request, env);
  return json({
    signedIn: !!session,
    configured: true,
    email: session ? session.email : null,
  });
}
