/**
 * POST /api/contact — "Start a project" leads.
 * Validates the lead, rate-limits by IP, and emails it to the studio inbox via Resend.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY   Resend API key (required to send email)
 *   LEAD_TO_EMAIL    Inbox that receives leads (default: info@heisenworks.in)
 *   LEAD_FROM_EMAIL  Verified sender, e.g. "HeisenWorks Website <leads@heisenworks.in>"
 *                    (the domain must be verified in Resend)
 *   RESEND_API_URL   Optional override of the Resend endpoint (used for local testing)
 */

const RESEND_URL = process.env.RESEND_API_URL || "https://api.resend.com/emails";
const RATE_LIMIT = 5;                       // requests…
const RATE_WINDOW_MS = 10 * 60 * 1000;      // …per 10 minutes per IP

// Best-effort, per-instance memory. Serverless instances do not share it; use a shared
// store (e.g. Upstash/Vercel KV) if stricter limits are ever needed.
const hits = new Map();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] || (req.socket && req.socket.remoteAddress) || "unknown";
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
  }
  return recent.length > RATE_LIMIT;
}

function str(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePhone(raw) {
  let s = String(raw || "").replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^\d{10}$/.test(s)) s = "+91" + s;
  return PHONE_RE.test(s) ? s : null;
}

function validate(body) {
  const lead = {
    name: str(body.name, 100),
    email: str(body.email, 254),
    whatsapp: normalizePhone(body.whatsapp),
    project: str(body.project, 3000),
    service: str(body.service, 100),
    planId: str(body.planId, 40),
    planName: str(body.planName, 100),
    priceShown: str(body.priceShown, 100),
    currency: str(body.currency, 3),
    pageUrl: str(body.pageUrl, 500),
    utm_source: str(body.utm_source, 100),
    utm_medium: str(body.utm_medium, 100),
    utm_campaign: str(body.utm_campaign, 100),
    timestamp: str(body.timestamp, 40),
  };
  const errors = {};
  if (!lead.name) errors.name = "Name is required.";
  if (!EMAIL_RE.test(lead.email)) errors.email = "A valid email is required.";
  if (!lead.whatsapp) errors.whatsapp = "A valid WhatsApp number with country code is required.";
  if (!lead.planName && !lead.service) errors.service = "Please choose a service.";
  return { lead, errors };
}

function buildEmail(lead) {
  const planLabel = lead.planName || lead.service || "General enquiry";
  const rows = [
    ["Plan / service", planLabel],
    ["Price shown", lead.priceShown || "—"],
    ["Currency", lead.currency || "—"],
    ["Plan ID", lead.planId || "—"],
    ["Name", lead.name],
    ["Email", lead.email],
    ["WhatsApp", lead.whatsapp],
    ["Project", lead.project || "—"],
    ["Page URL", lead.pageUrl || "—"],
    ["UTM source", lead.utm_source || "—"],
    ["UTM medium", lead.utm_medium || "—"],
    ["UTM campaign", lead.utm_campaign || "—"],
    ["Submitted at", lead.timestamp || new Date().toISOString()],
  ];
  const subject = `New lead: ${planLabel} – ${lead.name}`.replace(/[\r\n]+/g, " ").slice(0, 200);
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px">` +
    `<h2 style="margin:0 0 16px;font-size:20px">New lead from heisenworks.in</h2>` +
    `<table cellpadding="10" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">` +
    rows
      .map(
        ([k, v], i) =>
          `<tr style="background:${i % 2 ? "#ffffff" : "#f6f5f3"}">` +
          `<th align="left" valign="top" style="width:150px;border:1px solid #e6e5e2;font-weight:600">${escapeHtml(k)}</th>` +
          `<td style="border:1px solid #e6e5e2;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
      )
      .join("") +
    `</table><p style="font-size:12px;color:#666;margin-top:16px">Reply to this email to answer ${escapeHtml(lead.name)} directly.</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return { subject, html, text };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: "Invalid JSON" }); }
  }

  // Spam honeypot
  if (typeof body._hp_verify === "string" && body._hp_verify.trim() !== "") {
    return res.status(400).json({ ok: false, error: "Spam detected." });
  }

  if (rateLimited(clientIp(req))) {
    res.setHeader("Retry-After", "600");
    return res.status(429).json({ ok: false, error: "Too many requests. Please try again in a few minutes." });
  }

  const { lead, errors } = validate(body);
  if (Object.keys(errors).length) {
    return res.status(422).json({ ok: false, error: "Please check the highlighted fields.", errors });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set; lead not emailed:", lead.email);
    return res.status(503).json({ ok: false, error: "Email is not configured." });
  }

  const { subject, html, text } = buildEmail(lead);
  try {
    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL || "HeisenWorks Website <leads@heisenworks.in>",
        to: [process.env.LEAD_TO_EMAIL || "info@heisenworks.in"],
        reply_to: lead.email,
        subject,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error("[contact] Resend error", r.status, await r.text());
      return res.status(502).json({ ok: false, error: "Could not send email." });
    }
    return res.status(200).json({ ok: true, success: true, message: "Lead received." });
  } catch (err) {
    console.error("[contact] Resend request failed:", err);
    return res.status(502).json({ ok: false, error: "Could not send email." });
  }
}
