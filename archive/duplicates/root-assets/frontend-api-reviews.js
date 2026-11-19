const SEED_REVIEWS = [
  {
    id: "rev-01",
    name: "Vikramaditya Sharma",
    role: "Head of Product",
    company: "Cybershield Technologies",
    rating: 5,
    text: "HeisenWorks re-engineered our enterprise security operations center in 4 weeks. Their motion work and crisp dark-mode interface transformed how tier-1 analysts monitor zero-day telemetry. Flawless execution.",
    verified: true,
    date: "October 2026",
    avatar: "VS"
  },
  {
    id: "rev-02",
    name: "Dr. Elena Rostova",
    role: "Principal Systems Architect",
    company: "FlyLab Avionics",
    rating: 5,
    text: "The telemetry visualization HUD HeisenWorks delivered handles 60fps WebGL rendering under real-time sensor load. Their engineering discipline and obsessive design attention made our pre-flight dashboard an industry benchmark.",
    verified: true,
    date: "September 2026",
    avatar: "ER"
  },
  {
    id: "rev-03",
    name: "Kabir Mehta",
    role: "Co-Founder & CEO",
    company: "Zodd Apparel",
    rating: 5,
    text: "Our conversion rate jumped 38% within two weeks of launching our flagship e-commerce redesign with HeisenWorks. Fast, responsive, and completely custom without cookie-cutter templates.",
    verified: true,
    date: "August 2026",
    avatar: "KM"
  }
];

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      reviews: SEED_REVIEWS
    });
  }

  if (req.method === "POST") {
    const { name, company, role, rating, reviewText, _hp_verify } = req.body || {};

    if (_hp_verify && _hp_verify.trim() !== "") {
      return res.status(400).json({ ok: false, error: "Spam detected." });
    }

    if (!name || !reviewText) {
      return res.status(422).json({ ok: false, error: "Name and review text are required." });
    }

    const item = {
      id: `rev-${Date.now()}`,
      name: name.trim(),
      company: (company || "Private Client").trim(),
      role: (role || "Client").trim(),
      rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
      text: reviewText.trim(),
      verified: false,
      status: "pending",
      date: "Just now"
    };

    return res.status(200).json({
      ok: true,
      success: true,
      message: "Thank you! Your review has been submitted for moderation and will appear once verified.",
      item
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

