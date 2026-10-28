import type { LoveGender, LoveInterestedIn, LoveRelationshipGoal } from "@/utils/findLoveProfile";
import type { LoveAccountType, LoveMembership } from "@/utils/findLoveMembership";

export type { LoveAccountType, LoveGender, LoveInterestedIn, LoveMembership, LoveRelationshipGoal };
/**
 * The viewer's connection with another member:
 * - pending: the viewer sent a request, no answer yet.
 * - received: the other member sent the viewer a request.
 * - connected: accepted; they can chat freely.
 */
export type LoveConnectionStatus = "none" | "pending" | "received" | "connected";

/**
 * The signed-in member's own FindLove profile. It belongs to their Eventis
 * account (same login and phone) but has its own username.
 */
export interface MyLoveProfile {
  username: string;
  gender: LoveGender;
  /** Who they want to meet. Missing on profiles made before it was asked (treated as everyone). */
  interestedIn?: LoveInterestedIn;
  /** ISO date, "YYYY-MM-DD". Age is worked out from it, never stored. */
  dateOfBirth: string;
  /** Set by the server. Private only after confirmed payment; see utils/findLoveMembership.ts. */
  membership: LoveMembership;
  /** Main photo first; may be empty. Free members can have up to FREE_LOVE_PHOTO_LIMIT. */
  photoUrls: string[];
  /** ISO country code from LOVE_COUNTRIES. Discovery shows members from this country only. Missing on profiles made before it was asked. */
  country?: string;
  /** Optional extras, edited after creation. */
  bio?: string;
  interests: string[];
  /** One of LOVE_RELATIONSHIP_GOALS. */
  relationshipGoal?: LoveRelationshipGoal;
  /** Short free text, up to LOVE_LOOKING_FOR_MAX characters. */
  lookingFor?: string;
  /** One of LOVE_NEIGHBORHOODS. Never an exact location. */
  neighborhood?: string;
  createdAt: string;
  updatedAt: string;
}

/** What the create and edit forms send. */
export interface MyLoveProfileInput {
  username: string;
  gender: LoveGender;
  interestedIn: LoveInterestedIn;
  dateOfBirth: string;
  /**
   * Create only: the account type the member picked. Private starts as
   * "pending_payment" and only becomes active once payment is confirmed.
   */
  accountType?: LoveAccountType;
  photoUrls: string[];
  /** ISO country code from LOVE_COUNTRIES. Required. */
  country: string;
  bio?: string;
  interests?: string[];
  relationshipGoal?: LoveRelationshipGoal;
  lookingFor?: string;
  neighborhood?: string;
  /** Create only: the member ticked "I confirm I am 18 or older". */
  confirmedAdult?: boolean;
}

export interface LoveProfile {
  id: string;
  userId: string;
  /** FindLove handle. Discovery shows this, not the Eventis account name. */
  username: string;
  name: string;
  gender: LoveGender;
  age: number;
  city: string;
  /** ISO country code; discovery only lists members from the viewer's country. */
  country?: string;
  occupation: string;
  bio: string;
  interests: string[];
  /** What they want from FindLove; missing when they haven't said. */
  relationshipGoal?: LoveRelationshipGoal;
  /** The kind of person they hope to meet, in their words. */
  lookingFor?: string;
  imageUrl: string;
  /** Photos the member has posted, newest first. The profile page shows up to three. */
  postImageUrls: string[];
  /** The member's actual account type (active membership), as the server reports it. */
  accountType: LoveAccountType;
  isOnline: boolean;
  /** ISO timestamp of the last activity; drives "recently active". */
  lastActiveAt?: string;
  /** Neighbourhood the member chose. An exact location is never stored or shown. */
  neighborhood?: string;
  active: boolean;
  eligible: boolean;
  verified?: boolean;
  connectionStatus?: LoveConnectionStatus;
  /** "received" only: the one message they sent with their request. */
  requestMessage?: string;
}

export const MOCK_LOVE_PROFILES: LoveProfile[] = [
  {
    id: "love-amara",
    userId: "user-amara",
    username: "amara.k",
    name: "Amara",
    gender: "Woman",
    age: 25,
    city: "Kigali",
    country: "RW",
    occupation: "Creative strategist",
    bio: "Live music, quiet coffee shops, and spontaneous weekend plans. Looking for someone kind and curious.",
    relationshipGoal: "Long-term relationship",
    lookingFor: "Someone kind and curious who enjoys a good live show.",
    interests: ["Live music", "Coffee", "Travel"],
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: true,
    neighborhood: "Kimihurura",
    active: true,
    eligible: true,
    verified: true,
    connectionStatus: "connected",
  },
  {
    id: "love-ethan",
    userId: "user-ethan",
    username: "ethan_m",
    name: "Ethan",
    gender: "Man",
    age: 28,
    city: "Kigali",
    country: "RW",
    occupation: "Product designer",
    bio: "Designing by day, discovering new food spots by night. Always ready for a good concert.",
    relationshipGoal: "Long-term relationship",
    lookingFor: "A foodie who will try a new place with me every weekend.",
    interests: ["Design", "Food", "Concerts"],
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: false,
    neighborhood: "Remera",
    active: true,
    eligible: true,
    connectionStatus: "connected",
  },
  {
    id: "love-ineza",
    userId: "user-ineza",
    username: "ineza.lens",
    name: "Ineza",
    gender: "Woman",
    age: 26,
    city: "Musanze",
    country: "RW",
    occupation: "Travel photographer",
    bio: "Usually outdoors with a camera. I value honest conversations, laughter, and people who love adventure.",
    relationshipGoal: "Marriage",
    lookingFor: "An honest, adventurous person ready to build something real.",
    interests: ["Photography", "Hiking", "Art"],
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: true,
    neighborhood: "Muhoza",
    active: true,
    eligible: true,
    verified: true,
  },
  {
    id: "love-noah",
    userId: "user-noah",
    username: "noah.runs",
    name: "Noah",
    gender: "Man",
    age: 30,
    city: "Kigali",
    country: "RW",
    occupation: "Software engineer",
    bio: "Tech enthusiast, runner, and amateur chef. Here for real connections and memorable experiences.",
    relationshipGoal: "Long-term relationship",
    lookingFor: "Someone who can keep up on a morning run and loves to cook.",
    interests: ["Technology", "Running", "Cooking"],
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: false,
    neighborhood: "Kicukiro",
    active: true,
    eligible: true,
    connectionStatus: "received",
    requestMessage: "Hi! I saw you like running too. Fancy a morning jog around Kicukiro sometime?",
  },
  {
    id: "love-keza",
    userId: "user-keza",
    username: "keza_dances",
    name: "Keza",
    gender: "Woman",
    age: 27,
    city: "Huye",
    country: "RW",
    occupation: "Event producer",
    bio: "I create experiences for a living and collect great stories along the way. Dancing is always a yes.",
    relationshipGoal: "Something casual",
    lookingFor: "A good dancer, or someone happy to learn.",
    interests: ["Dance", "Festivals", "Books"],
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: true,
    neighborhood: "Ngoma",
    active: true,
    eligible: true,
    connectionStatus: "received",
    requestMessage: "Hey 👋 Your profile made me smile. Would love to chat about the festivals this season!",
  },
  {
    id: "love-samuel",
    userId: "user-samuel",
    username: "sam.builds",
    name: "Samuel",
    gender: "Man",
    age: 29,
    city: "Rubavu",
    country: "RW",
    occupation: "Architect",
    bio: "Drawn to good architecture, lakeside sunsets, and conversations that run longer than expected.",
    relationshipGoal: "Still figuring it out",
    lookingFor: "Someone thoughtful who enjoys slow evenings by the lake.",
    interests: ["Architecture", "Jazz", "Travel"],
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: false,
    neighborhood: "Gisenyi",
    active: true,
    eligible: true,
    verified: true,
    connectionStatus: "pending",
  },
  {
    // Private member: everyone can see her, but only Private members can connect.
    id: "love-claire",
    userId: "user-claire",
    username: "claire.private",
    name: "Claire",
    gender: "Woman",
    age: 31,
    city: "Kigali",
    country: "RW",
    occupation: "Lawyer",
    bio: "Private profile. Weekend hikes and good books.",
    relationshipGoal: "Marriage",
    lookingFor: "A calm, faithful partner who loves the outdoors.",
    interests: ["Hiking", "Books"],
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "private",
    isOnline: true,
    neighborhood: "Remera",
    active: true,
    eligible: true,
  },
  {
    // Outside Rwanda: only members who chose Kenya see her.
    id: "love-wanjiru",
    userId: "user-wanjiru",
    username: "wanjiru.w",
    name: "Wanjiru",
    gender: "Woman",
    age: 27,
    city: "Nairobi",
    country: "KE",
    occupation: "Marketing lead",
    bio: "Weekend road trips, rooftop jazz and long brunches. Say hi if you love live shows.",
    relationshipGoal: "New friends",
    lookingFor: "People to go to concerts and brunches with.",
    interests: ["Live music", "Travel", "Food"],
    imageUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85",
    postImageUrls: [
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80",
    ],
    accountType: "public",
    isOnline: true,
    active: true,
    eligible: true,
  },
];

/**
 * Demo only: minutes since each member was last active, applied when the demo
 * list loads so presence ("Online now", "Active 3h ago") looks realistic.
 */
export const DEMO_LAST_ACTIVE_MINUTES: Record<string, number> = {
  "love-amara": 1,
  "love-ethan": 45,
  "love-ineza": 3,
  "love-noah": 60 * 30,
  "love-keza": 0,
  "love-samuel": 60 * 5,
  "love-claire": 2,
  "love-wanjiru": 20,
};
