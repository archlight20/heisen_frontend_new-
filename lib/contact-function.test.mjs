import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/contact.js";

const post = (body, ip = "203.0.113.9") =>
  new Request("https://heisenworks.in/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body,
  });

test("empty object answers 422 JSON, not cached", async () => {
  const res = await onRequestPost({ request: post("{}", "203.0.113.1"), env: {} });
  assert.equal(res.status, 422);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal((await res.json()).ok, false);
});

test("non-JSON body answers 400", async () => {
  const res = await onRequestPost({ request: post("x", "203.0.113.2"), env: {} });
  assert.equal(res.status, 400);
});

test("rate limit keys on CF-Connecting-IP and sends Retry-After", async () => {
  let res;
  for (let i = 0; i < 6; i++) res = await onRequestPost({ request: post("{}", "203.0.113.3"), env: {} });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "600");
});

test("no CORS wildcard on the response", async () => {
  const res = await onRequestPost({ request: post("{}", "203.0.113.4"), env: {} });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});
