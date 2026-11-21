/**
 * GET /api/reviews          -> live Google reviews for the HeisenWorks Business Profile
 * GET /api/reviews?write=1  -> 302 redirect to Google's "write a review" dialog
 *
 * Required environment variables (set them in Vercel → Project → Settings → Environment Variables):
 *   GOOGLE_PLACES_API_KEY  Google Cloud API key with "Places API (New)" enabled
 *   GOOGLE_PLACE_ID        (optional) overrides DEFAULT_PLACE_ID below
 *
 * Google returns at most 5 reviews per place (its "most relevant" selection).
 * Responses are cached on Vercel's CDN for 6 hours to keep API usage (and cost) low.
 */

  const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places/";
  // HeisenWorks Google Business Profile (public identifier; GOOGLE_PLACE_ID env var overrides it)
  const DEFAULT_PLACE_ID = "ChIJFdG7apNjTAwRyG-Czax4ie4";
  const FIELD_MASK = "id,displayName,rating,userRatingCount,googleMapsUri,reviews";

  function writeReviewUrl(placeId) {
    return placeId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
      : "https://www.google.com/maps/search/HeisenWorks";
  }

  function normalizeReview(r) {
    const author = r.authorAttribution || {};
    const text = (r.originalText && r.originalText.text) || (r.text && r.text.text) || "";
    return {
      author: author.displayName || "Google user",
      authorUrl: author.uri || null,
      authorPhoto: author.photoUri || null,
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      text,
      relativeTime: r.relativePublishTimeDescription || "",
      publishTime: r.publishTime || null,
      reviewUrl: r.googleMapsUri || null
    };
  }

  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

  if(req.method !== "GET") {
        return res.status(405).json({ ok: false, error: "Method not allowed. Reviews are left directly on Google." });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      const placeId = process.env.GOOGLE_PLACE_ID || DEFAULT_PLACE_ID;
      const query = req.query || {};

      if (query.write) {
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.statusCode = 302;
        res.setHeader("Location", writeReviewUrl(placeId));
        return res.end();
      }

      if (!apiKey || !placeId) {
        return res.status(503).json({
          ok: false,
          error: "Google reviews are not configured (missing GOOGLE_PLACES_API_KEY).",
          place: { writeReviewUrl: writeReviewUrl(placeId) },
          reviews: []
        });
      }

        try {
          const lang = typeof query.lang === "string" && /^[a-z]{2}(-[A-Z]{2})?$/.test(query.lang) ? query.lang : "en";
          const gRes = await fetch(`${PLACES_ENDPOINT}${encodeURIComponent(placeId)}?languageCode=${lang}`, {
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": FIELD_MASK
            }
          });

            if (!gRes.ok) {
              const detail = await gRes.text();
              console.error("Google Places API error:", gRes.status, detail);
              return res.status(502).json({
                ok: false,
                error: "Could not load reviews from Google.",
                place: { writeReviewUrl: writeReviewUrl(placeId) },
                reviews: []
              });
            }

            const data = await gRes.json();
            const reviews = (data.reviews || []).map(normalizeReview).filter((r) => r.text.trim() !== "");

            // Cache at the edge for 6h, serve stale for up to 24h while refreshing in the background.
            res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");

            return res.status(200).json({
              ok: true,
      source: "google",
              place: {
                name: (data.displayName && data.displayName.text) || "HeisenWorks",
                rating: typeof data.rating === "number" ? data.rating : null,
                totalReviews: typeof data.userRatingCount === "number" ? data.userRatingCount : 0,
                mapsUrl: data.googleMapsUri || null,
                writeReviewUrl: writeReviewUrl(placeId)
              },
              reviews
            });
          } catch (err) {
            console.error("Reviews handler failed:", err);
            return res.status(500).json({
              ok: false,
              error: "Unexpected error while loading reviews.",
              place: { writeReviewUrl: writeReviewUrl(placeId) },
              reviews: []
            });
          }
        }
