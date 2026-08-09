// Cloudflare Pages Function — /api/scenarios/:id
// GET    -> fetch one of the signed-in user's scenarios
// DELETE -> remove one of the signed-in user's scenarios
//
// Both queries filter on user_sub as well as id, so a row belonging to another
// account behaves exactly as if it did not exist. We deliberately answer 404
// rather than 403 in that case: 403 would confirm that the id is real and
// simply belongs to somebody else.

import { getSession, json, noDB, unauthorized } from "../_shared.js";

export async function onRequestGet({ params, request, env }) {
  if (!env.DB) return noDB();
  const session = await getSession(request, env);
  if (!session) return unauthorized();

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid id." }, 400);

  try {
    const row = await env.DB.prepare(
      "SELECT id, name, data, created_at FROM scenarios WHERE id = ? AND user_sub = ?"
    )
      .bind(id, session.sub)
      .first();
    if (!row) return json({ error: "Not found." }, 404);
    return json(row);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function onRequestDelete({ params, request, env }) {
  if (!env.DB) return noDB();
  const session = await getSession(request, env);
  if (!session) return unauthorized();

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid id." }, 400);

  try {
    const res = await env.DB.prepare(
      "DELETE FROM scenarios WHERE id = ? AND user_sub = ?"
    )
      .bind(id, session.sub)
      .run();
    // Report what actually happened; the old version claimed success for ids
    // that were never there.
    if (!res.meta.changes) return json({ error: "Not found." }, 404);
    return json({ deleted: id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
