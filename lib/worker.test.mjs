import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const post = (body, ip = "203.0.113.9") =>
  new Request("https://heisenworks.in/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body,
  });

test("POST /api/contact delegates to lead handler", async () => {
  const res = await worker.fetch(post("{}", "203.0.113.1"), {});
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
  const data = await res.json();
  assert.equal(data.ok, false);
});

test("rate limit keys on CF-Connecting-IP and sends Retry-After", async () => {
  const valid = JSON.stringify({ name: "Asha", email: "asha@example.com", whatsapp: "+919876543210", service: "Website" });
  let res;
  for (let i = 0; i < 6; i++) res = await worker.fetch(post(valid, "203.0.113.3"), {});
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "600");
});

test("static route delegates to env.ASSETS", async () => {
  let called = false;
  const mockAssets = {
    fetch: async (r) => {
      called = true;
      return new Response("OK", { status: 200 });
    },
  };
  const req = new Request("https://heisenworks.in/team");
  const res = await worker.fetch(req, { ASSETS: mockAssets });
  assert.equal(called, true);
  assert.equal(res.status, 200);
});
