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

    // Static assets fallback (Cloudflare Workers Static Assets binding)
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
