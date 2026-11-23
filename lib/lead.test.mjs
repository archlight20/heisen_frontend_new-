import test from "node:test";
import assert from "node:assert/strict";
import { handleLead, normalizePhone } from "./lead.js";

const ENV = { RESEND_API_KEY: "k" };
let ipSeq = 0;
const ip = () => `10.0.0.${++ipSeq}`;

function lead(over = {}) {
  return { name: "Asha Rao", email: "asha@example.com", whatsapp: "+919876543210", service: "Website", project: "New site", ...over };
}

function fakeFetch(response = { ok: true, status: 200, text: async () => "" }) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    if (response instanceof Error) throw response;
    return response;
  };
  fn.calls = calls;
  return fn;
}

test("valid lead is emailed through Resend and answers 200", async () => {
  const fetch = fakeFetch();
  const r = await handleLead(lead(), { ip: ip(), env: ENV, fetch });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(fetch.calls.length, 1);
  const { url, init, body } = fetch.calls[0];
  assert.equal(url, "https://api.resend.com/emails");
  assert.equal(init.headers.Authorization, "Bearer k");
  assert.equal(body.reply_to, "asha@example.com");
  assert.deepEqual(body.to, ["info@heisenworks.in"]);
});

test("missing whatsapp answers 422 without sending", async () => {
  const fetch = fakeFetch();
  const r = await handleLead(lead({ whatsapp: "" }), { ip: ip(), env: ENV, fetch });
  assert.equal(r.status, 422);
  assert.ok(r.json.errors.whatsapp);
  assert.equal(fetch.calls.length, 0);
});

test("no service and no planName answers 422", async () => {
  const r = await handleLead(lead({ service: "" }), { ip: ip(), env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 422);
  assert.ok(r.json.errors.service);
});

test("filled honeypot answers 400 Spam detected.", async () => {
  const r = await handleLead(lead({ _hp_verify: "bot" }), { ip: ip(), env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "Spam detected.");
});

test("sixth request from the same ip within the window answers 429", async () => {
  const same = ip();
  let r;
  for (let i = 0; i < 6; i++) r = await handleLead(lead(), { ip: same, env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 429);
  assert.equal(r.headers["Retry-After"], "600");
});

test("invalid attempts do not use up the rate limit", async () => {
  const same = ip();
  for (let i = 0; i < 5; i++) await handleLead(lead({ whatsapp: "12" }), { ip: same, env: ENV, fetch: fakeFetch() });
  const r = await handleLead(lead(), { ip: same, env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 200);
});

test("missing RESEND_API_KEY answers 503", async () => {
  const r = await handleLead(lead(), { ip: ip(), env: {}, fetch: fakeFetch() });
  assert.equal(r.status, 503);
});

test("Resend non-2xx answers 502", async () => {
  const fetch = fakeFetch({ ok: false, status: 500, text: async () => "boom" });
  const r = await handleLead(lead(), { ip: ip(), env: ENV, fetch });
  assert.equal(r.status, 502);
});

test("Resend network failure answers 502", async () => {
  const r = await handleLead(lead(), { ip: ip(), env: ENV, fetch: fakeFetch(new Error("offline")) });
  assert.equal(r.status, 502);
});

test("non-JSON string body answers 400 Invalid JSON", async () => {
  const r = await handleLead("not json", { ip: ip(), env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "Invalid JSON");
});

test("null body answers 422 instead of throwing", async () => {
  const r = await handleLead(null, { ip: ip(), env: ENV, fetch: fakeFetch() });
  assert.equal(r.status, 422);
});

test("newline in name cannot reach the email subject", async () => {
  const fetch = fakeFetch();
  await handleLead(lead({ name: "A\r\nBcc: x@y.z" }), { ip: ip(), env: ENV, fetch });
  assert.doesNotMatch(fetch.calls[0].body.subject, /[\r\n]/);
});

test("html in project text is escaped in the email", async () => {
  const fetch = fakeFetch();
  await handleLead(lead({ project: "<script>" }), { ip: ip(), env: ENV, fetch });
  assert.match(fetch.calls[0].body.html, /&lt;script&gt;/);
});

test("normalizePhone adds +91 to 10 digits, converts 00 prefix, rejects junk", () => {
  assert.equal(normalizePhone("9876543210"), "+919876543210");
  assert.equal(normalizePhone("0044 20 7946 0958"), "+442079460958");
  assert.equal(normalizePhone("12"), null);
});

test("normalizePhone accepts an Indian number written with a leading 0", () => {
  assert.equal(normalizePhone("09876543210"), "+919876543210");
  assert.equal(normalizePhone("098765 43210"), "+919876543210");
});
