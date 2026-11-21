/**
 * HeisenWorks Google reviews — fixed list, copied from our Google Business Profile.
 * Used by the homepage review cards and the /reviews page. No Google API is called.
 *
 * To add or update a review: copy the reviewer's name, star rating, month and full text
 * from Google Maps and add an entry below. Also update `rating` and `totalReviews`.
 */
window.HW_GOOGLE_REVIEWS = {
  place: {
    rating: 4.8,
    totalReviews: 5,
    mapsUrl: "https://www.google.com/maps/place/?q=place_id:ChIJFdG7apNjTAwRyG-Czax4ie4",
    writeReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJFdG7apNjTAwRyG-Czax4ie4"
  },
  reviews: [
    {
      author: "KHAWAJA",
      rating: 5,
      date: "November 2026",
      text: "Amazing experience with Heisenworks! Loved my portfolio. Special appreciation to Fahad and the team. The best part is that even the founder personally checks in after delivery to ensure everything is perfect. Truly dedicated team. Everyone should give them a try!"
    },
    {
      author: "Quick 5",
      rating: 4,
      date: "November 2026",
      text: "I had an excellent experience working with Heisenworks. They handled one of my projects exceptionally well, and the overall quality of their work, professionalism, and dedication really impressed me. The team understood the requirements, communicated effectively, and delivered results beyond my expectations.\n\nThe only reason I’m giving 4 stars instead of 5 is that there is still a little room for improvement in a few areas. Apart from that, everything was genuinely great. I would definitely recommend Heisenworks to anyone looking for a reliable and creative team. Looking forward to working with them again!"
    },
    {
      author: "imoin sini",
      rating: 5,
      date: "November 2026",
      text: "Excellent work"
    },
    {
      author: "Walter Nuto",
      rating: 5,
      date: "November 2026",
      text: "Nice experience"
    }
    // Add more real reviews from Google here, in the same format:
    // { author: "Name", rating: 5, date: "November 2026", text: "Full review text" },
  ]
};
