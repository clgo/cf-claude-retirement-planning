// Cloudflare Pages Function — /api/scenarios
// GET  -> list the signed-in user's scenarios (newest first)
// POST -> create a scenario { name, data } owned by the signed-in user
//
// Requires a D1 binding named "DB" (see wrangler.toml / README) and a valid
// session cookie. Both routes are scoped to the caller — there is no way to
// reach another account's rows through this endpoint.

import { getSession, json, noDB, unauthorized } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return noDB();
  const session = await getSession(request, env);
  if (!session) return unauthorized();

  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, data, created_at FROM scenarios WHERE user_sub = ? ORDER BY created_at DESC, id DESC"
    )
      .bind(session.sub)
      .all();
    return json(results || []);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return noDB();
  const session = await getSession(request, env);
  if (!session) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = (body.name || "").toString().trim().slice(0, 120);
  const data = (body.data || "").toString();
  if (!name) return json({ error: "A non-empty 'name' is required." }, 400);
  if (!data) return json({ error: "A non-empty 'data' payload is required." }, 400);
  if (data.length > 10000) return json({ error: "Payload too large." }, 413);

  try {
    const res = await env.DB.prepare(
      "INSERT INTO scenarios (user_sub, user_email, name, data) VALUES (?, ?, ?, ?)"
    )
      .bind(session.sub, session.email || "", name, data)
      .run();
    return json({ id: res.meta.last_row_id, name }, 201);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
