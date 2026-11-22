// POST /api/contact on Cloudflare Pages. All lead logic lives in lib/lead.js.
import { handleLead } from "../../lib/lead.js";

export async function onRequestPost({ request, env }) {
  const result = await handleLead(await request.text(), {
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    env,
  });
  return Response.json(result.json, {
    status: result.status,
    headers: { "Cache-Control": "no-store", ...result.headers },
  });
}
