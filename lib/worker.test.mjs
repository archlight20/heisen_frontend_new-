import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

test("POST /api/contact delegates to lead handler", async () => {
  const req = new Request("https://heisenworks.in/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const data = await res.json();
  assert.equal(data.ok, false);
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

test("returns 404 if ASSETS binding missing", async () => {
  const req = new Request("https://heisenworks.in/unknown");
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 404);
});
