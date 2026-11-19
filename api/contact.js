export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    const { name, email, project, _hp_verify } = req.body || {};

    // Spam honeypot detection
    if (_hp_verify && _hp_verify.trim() !== "") {
      return res.status(400).json({ ok: false, error: "Spam detected." });
    }

    if (!name || !email) {
      return res.status(422).json({ ok: false, error: "Name and email are required." });
    }

    return res.status(200).json({
      ok: true,
      success: true,
      message: "Thank you for reaching out. We have received your inquiry and will reply within one business day.",
      data: { name: name || "" }
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
