import type { Event } from "@/constants/events";

// Presentation posts transcribed from the supplied flyers. Unpublished counts,
// prices and capacity below are demo values, not live availability.
const defaults = {
  city: "Kigali", currency: "RWF", price: 0, endTime: "", attendees: 0,
  capacity: 0, isFeatured: false, isSponsored: false, isPaid: false,
  distance: 0, rating: 0, reviewCount: 0, viewCount: 0,
};

export const FEATURED_DEMO_POSTS: Event[] = [
  {
    ...defaults,
    id: "demo-friday-fiesta", title: "Friday Fiesta", category: "Nightlife",
    description: "Friday Fiesta at The Rush Bar with DJ Serge, DJ Fidelo, DJ Rolando and DJ Piaa. Presentation post; confirm entry details with the organizer.",
    location: "The Rush Bar, Remera Kisimenti (Kwa Manzi)",
    date: "2026-10-02", time: "18:00", organizer: "The Rush Bar",
    image: "friday-fiesta", tags: ["Demo", "DJs", "Friday Fiesta"],
  },
  {
    ...defaults,
    id: "demo-thursday-rewind", title: "Thursday Rewind", category: "Nightlife",
    description: "Every Thursday from 7 PM: food, drinks and fresh music by DJ Space. Pool table available. Free entry at Kaizen Hotel.",
    location: "Kaizen Hotel, Nyabugogo, near traffic lights",
    date: "2026-10-01", time: "19:00", organizer: "Kaizen Hotel",
    image: "thursday-rewind", tags: ["Demo", "Pool", "DJ Space", "Free entry"],
  },
  {
    ...defaults,
    id: "demo-grill-and-chill", title: "Grill and Chill", category: "Music",
    description: "Lucky Bluez and the band, with music by DJ Ben10 at Yessah Lounge. Presentation post; confirm entry details with the organizer.",
    location: "Yessah Lounge, near Zaria Court, former Mumento / Kosmic rooftop",
    date: "2026-10-01", time: "19:00", organizer: "Yessah Lounge",
    image: "grill-and-chill", tags: ["Demo", "Live music", "Lucky Bluez", "Grill"],
  },
];

export const DEMO_POST_ORDER = FEATURED_DEMO_POSTS.map((event) => event.id);
