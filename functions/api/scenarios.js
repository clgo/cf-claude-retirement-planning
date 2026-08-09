// Cloudflare Pages Function — /api/scenarios
// GET  -> list saved scenarios (newest first)
// POST -> create a scenario { name, data }
//
// Requires a D1 binding named "DB" (see wrangler.toml / README).

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

export async function onRequestGet({ env }) {
  if (!env.DB) return noDB();
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, data, created_at FROM scenarios ORDER BY created_at DESC, id DESC"
    ).all();
    return json(results || []);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return noDB();
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
      "INSERT INTO scenarios (name, data) VALUES (?, ?)"
    )
      .bind(name, data)
      .run();
    return json({ id: res.meta.last_row_id, name }, 201);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}
