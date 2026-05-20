import { db, eventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const SEED_EVENTS = [
  {
    id: "1", title: "Neon Pulse Music Festival", category: "Music",
    description: "Experience three days of world-class electronic music under the stars. Featuring top DJs from around the globe, immersive light installations, and an unforgettable atmosphere.",
    location: "Riverside Arena, East Park", city: "London", date: "2026-07-12", time: "18:00", endTime: "04:00",
    price: 89, currency: "GBP", organizer: "PulseEvents Ltd", organizerWebsite: "https://pulseevents.co",
    attendees: 2847, capacity: 5000, image: "concert", tags: ["Electronic","Festival","Outdoor","Multi-day"],
    isFeatured: true, isSponsored: true, isPaid: true, distance: 2.3, rating: 4.8, reviewCount: 312,
  },
  {
    id: "2", title: "FutureTech Summit 2026", category: "Tech",
    description: "The most anticipated technology conference bringing together innovators, founders, and investors. Three days of keynotes, workshops, and networking opportunities.",
    location: "The Convention Centre", city: "Manchester", date: "2026-08-05", time: "09:00", endTime: "18:00",
    price: 250, currency: "GBP", organizer: "TechForward Inc", organizerWebsite: "https://futuretech-summit.com",
    attendees: 1240, capacity: 2000, image: "tech", tags: ["AI","Startups","Networking","Keynote"],
    isFeatured: true, isSponsored: true, isPaid: true, distance: 5.1, rating: 4.9, reviewCount: 89,
  },
  {
    id: "3", title: "Global Street Food Carnival", category: "Food",
    description: "A celebration of world cuisines right in the heart of the city. Over 80 food vendors from 40 countries, live cooking demonstrations, and cultural performances.",
    location: "Victoria Square", city: "Birmingham", date: "2026-06-28", time: "11:00", endTime: "22:00",
    price: 0, currency: "GBP", organizer: "City Events Board", organizerWebsite: undefined,
    attendees: 8420, capacity: 15000, image: "food", tags: ["Free","Food","Family","Culture"],
    isFeatured: true, isSponsored: false, isPaid: false, distance: 0.8, rating: 4.6, reviewCount: 1054,
  },
  {
    id: "4", title: "Champions League Watch Party", category: "Sports",
    description: "Watch the biggest football match of the year on a giant 8K screen with thousands of fans. Food, drinks, and an electric atmosphere guaranteed.",
    location: "Fan Zone, Wembley Park", city: "London", date: "2026-06-01", time: "19:30", endTime: "23:00",
    price: 15, currency: "GBP", organizer: "SportsFan Events", organizerWebsite: "https://sportsfan.events",
    attendees: 3100, capacity: 4000, image: "concert", tags: ["Football","Sports","Fan Zone","Live"],
    isFeatured: false, isSponsored: true, isPaid: true, distance: 3.7, rating: 4.7, reviewCount: 428,
  },
  {
    id: "5", title: "Startup Pitch Night", category: "Business",
    description: "Ten of the most promising startups pitch to a panel of top investors. Network with founders, investors, and industry leaders over drinks.",
    location: "WeWork Offices, Canary Wharf", city: "London", date: "2026-07-03", time: "18:30", endTime: "21:30",
    price: 0, currency: "GBP", organizer: "London Ventures Network", organizerWebsite: undefined,
    attendees: 187, capacity: 250, image: "tech", tags: ["Startups","Networking","Investors","Free"],
    isFeatured: false, isSponsored: false, isPaid: false, distance: 4.2, rating: 4.5, reviewCount: 67,
  },
  {
    id: "6", title: "Midnight Jazz & Blues Lounge", category: "Music",
    description: "An intimate evening of live jazz and blues in a stunning underground venue. Featuring three acclaimed bands and a curated cocktail menu.",
    location: "The Velvet Underground Club", city: "London", date: "2026-07-18", time: "20:00", endTime: "02:00",
    price: 35, currency: "GBP", organizer: "Velvet Nights", organizerWebsite: "https://velvetnights.co",
    attendees: 145, capacity: 200, image: "concert", tags: ["Jazz","Blues","Intimate","Cocktails"],
    isFeatured: false, isSponsored: false, isPaid: true, distance: 1.5, rating: 4.9, reviewCount: 203,
  },
  {
    id: "7", title: "Contemporary Art Opening: Void", category: "Art",
    description: "The opening night of 'Void' — a groundbreaking exhibition exploring themes of identity, technology, and the human condition through immersive multimedia installations.",
    location: "Tate Modern, Bankside", city: "London", date: "2026-07-24", time: "18:00", endTime: "21:00",
    price: 0, currency: "GBP", organizer: "Tate Modern", organizerWebsite: undefined,
    attendees: 420, capacity: 800, image: "tech", tags: ["Art","Exhibition","Free","Contemporary"],
    isFeatured: false, isSponsored: false, isPaid: false, distance: 2.9, rating: 4.7, reviewCount: 89,
  },
  {
    id: "8", title: "Rooftop Cinema: Blade Runner 2049", category: "Art",
    description: "Watch the cult classic under the stars on London's most spectacular rooftop. Blankets provided, cocktail bar open throughout.",
    location: "The Rooftop, Peckham Levels", city: "London", date: "2026-07-30", time: "21:00", endTime: "00:00",
    price: 22, currency: "GBP", organizer: "Sky Cinema Events", organizerWebsite: "https://skycollective.events",
    attendees: 198, capacity: 250, image: "concert", tags: ["Cinema","Rooftop","Outdoor","Cocktails"],
    isFeatured: false, isSponsored: false, isPaid: true, distance: 3.4, rating: 4.8, reviewCount: 156,
  },
  {
    id: "9", title: "Morning Yoga in Hyde Park", category: "Community",
    description: "Start your week with a refreshing outdoor yoga session suitable for all levels. Mats provided, led by certified instructors.",
    location: "Hyde Park, Speaker's Corner Area", city: "London", date: "2026-06-22", time: "07:30", endTime: "09:00",
    price: 0, currency: "GBP", organizer: "Park Wellness Collective", organizerWebsite: undefined,
    attendees: 65, capacity: 100, image: "food", tags: ["Yoga","Free","Wellness","Outdoor"],
    isFeatured: false, isSponsored: false, isPaid: false, distance: 1.1, rating: 4.6, reviewCount: 312,
  },
  {
    id: "10", title: "Electronic Warehouse Rave", category: "Nightlife",
    description: "An all-night techno and house music experience in an industrial warehouse venue. Four rooms, top-tier sound system.",
    location: "Unit 9, Hackney Wick", city: "London", date: "2026-08-15", time: "22:00", endTime: "08:00",
    price: 45, currency: "GBP", organizer: "Warehouse Collective", organizerWebsite: "https://warehousecollective.co",
    attendees: 1850, capacity: 2500, image: "concert", tags: ["Techno","House","Warehouse","All-Night"],
    isFeatured: false, isSponsored: false, isPaid: true, distance: 4.8, rating: 4.9, reviewCount: 567,
  },
  {
    id: "11", title: "Photography Masterclass", category: "Art",
    description: "Intensive one-day workshop covering composition, lighting, and post-processing. Suitable for intermediate photographers.",
    location: "The Photographers Gallery", city: "London", date: "2026-07-10", time: "10:00", endTime: "17:00",
    price: 75, currency: "GBP", organizer: "Lens & Light Studio", organizerWebsite: "https://lensandlight.studio",
    attendees: 16, capacity: 20, image: "tech", tags: ["Photography","Workshop","Skills","Small Group"],
    isFeatured: false, isSponsored: false, isPaid: true, distance: 2.1, rating: 5.0, reviewCount: 44,
  },
  {
    id: "12", title: "Community Founders Breakfast", category: "Business",
    description: "Monthly informal breakfast meetup for local founders and entrepreneurs. Share challenges, celebrate wins, and build genuine connections.",
    location: "The Common Room, Shoreditch", city: "London", date: "2026-06-17", time: "08:00", endTime: "10:00",
    price: 0, currency: "GBP", organizer: "Shoreditch Founders Club", organizerWebsite: undefined,
    attendees: 42, capacity: 60, image: "food", tags: ["Business","Networking","Free","Breakfast"],
    isFeatured: false, isSponsored: false, isPaid: false, distance: 3.3, rating: 4.7, reviewCount: 88,
  },
];

export async function seedDatabase(): Promise<void> {
  try {
    await db
      .insert(eventsTable)
      .values(SEED_EVENTS.map(e => ({ ...e, organizerWebsite: e.organizerWebsite ?? null })))
      .onConflictDoNothing();
    logger.info("Database seeded with events");
  } catch (err) {
    logger.error(err, "Failed to seed database");
  }
}
