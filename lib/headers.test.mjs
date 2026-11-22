import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const headers = readFileSync(new URL("../heisenworks_frontend/_headers", import.meta.url), "utf8");
const value = (name) => (headers.match(new RegExp(`^\\s+${name}:\\s*(.+)$`, "m")) || [])[1]?.trim();

test("HSTS does not lock subdomains or request preload", () => {
  // includeSubDomains/preload break any HTTP-only subdomain for a year; opt in deliberately later
  assert.equal(value("Strict-Transport-Security"), "max-age=31536000");
});

test("asset cache is not immutable, because asset file names are not content-hashed", () => {
  assert.doesNotMatch(value("Cache-Control"), /immutable/);
});
