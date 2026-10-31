export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    const { name, email, project } = req.body || {};
    return res.status(200).json({
      ok: true,
      message: "Thank you for reaching out. We have received your inquiry.",
      data: { name: name || "" }
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

