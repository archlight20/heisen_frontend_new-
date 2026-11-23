// Cloudflare Worker entry point for heisenworks.
// Serves /api/contact via lib/lead.js and all static assets via env.ASSETS.
import { handleLead } from "./lib/lead.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Lead dispatch API endpoint
    if (url.pathname === "/api/contact" && request.method === "POST") {
      const result = await handleLead(await request.text(), {
        ip: request.headers.get("CF-Connecting-IP") || "unknown",
        env,
      });
      return Response.json(result.json, {
        status: result.status,
        headers: { "Cache-Control": "no-store", ...result.headers },
      });
    }

    // Static assets (binding declared in wrangler.json)
    return env.ASSETS.fetch(request);
  },
};
