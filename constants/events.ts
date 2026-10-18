export type EventCategory =
  | "All"
  | "Music"
  | "Sports"
  | "Business"
  | "Food"
  | "Tech"
  | "Art"
  | "Nightlife"
  | "Community";

export interface Event {
  id: string;
  /** Publisher identity when supplied by the events source. */
  ownerId?: string;
  organisationId?: string;
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  city: string;
  date: string;
  time: string;
  endTime: string;
  price: number;
  currency: string;
  organizer: string;
  organizerWebsite?: string;
  attendees: number;
  capacity: number;
  image: string;
  tags: string[];
  isFeatured: boolean;
  isSponsored: boolean;
  isPaid: boolean;
  distance: number;
  rating: number;
  reviewCount: number;
  /** View count displayed on event cards; defaults to zero when absent. */
  viewCount?: number;
  /** Organizer notes (dress code, entry rules, what to bring), one per item. Not in the events API yet. */
  instructions?: string[];
}

export interface Organizer {
  id: string;
  name: string;
  type: "business" | "individual";
  avatar: string;
  eventsCount: number;
  verified: boolean;
}

// Fallback list; EventsContext replaces it with the API's categories when available.
export const CATEGORIES: EventCategory[] = [
  "All",
  "Music",
  "Sports",
  "Business",
  "Food",
  "Tech",
  "Art",
  "Nightlife",
  "Community",
];
