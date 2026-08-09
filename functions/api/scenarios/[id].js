// Cloudflare Pages Function — /api/scenarios/:id
// GET    -> fetch one scenario
// DELETE -> remove one scenario
//
// Requires a D1 binding named "DB".

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function noDB() {
  return json(
    { error: "D1 database binding 'DB' is not configured for this Pages project." },
    503
  );
}

export async function onRequestGet({ params, env }) {
  if (!env.DB) return noDB();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid id." }, 400);
  try {
    const row = await env.DB.prepare(
      "SELECT id, name, data, created_at FROM scenarios WHERE id = ?"
    )
      .bind(id)
      .first();
    if (!row) return json({ error: "Not found." }, 404);
    return json(row);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function onRequestDelete({ params, env }) {
  if (!env.DB) return noDB();
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid id." }, 400);
  try {
    await env.DB.prepare("DELETE FROM scenarios WHERE id = ?").bind(id).run();
    return json({ deleted: id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
