export type LoveGender = "She" | "He" | "They";
export type LoveConnectionStatus = "none" | "pending" | "connected";

export interface LoveProfile {
  id: string;
  userId: string;
  name: string;
  gender: LoveGender;
  age: number;
  city: string;
  occupation: string;
  bio: string;
  interests: string[];
  imageUrl: string;
  active: boolean;
  eligible: boolean;
  verified?: boolean;
  connectionStatus?: LoveConnectionStatus;
}

export const MOCK_LOVE_PROFILES: LoveProfile[] = [
  {
    id: "love-amara",
    userId: "user-amara",
    name: "Amara",
    gender: "She",
    age: 25,
    city: "Kigali",
    occupation: "Creative strategist",
    bio: "Live music, quiet coffee shops, and spontaneous weekend plans. Looking for someone kind and curious.",
    interests: ["Live music", "Coffee", "Travel"],
    imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
    verified: true,
    connectionStatus: "connected",
  },
  {
    id: "love-ethan",
    userId: "user-ethan",
    name: "Ethan",
    gender: "He",
    age: 28,
    city: "Kigali",
    occupation: "Product designer",
    bio: "Designing by day, discovering new food spots by night. Always ready for a good concert.",
    interests: ["Design", "Food", "Concerts"],
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
    connectionStatus: "connected",
  },
  {
    id: "love-ineza",
    userId: "user-ineza",
    name: "Ineza",
    gender: "She",
    age: 26,
    city: "Musanze",
    occupation: "Travel photographer",
    bio: "Usually outdoors with a camera. I value honest conversations, laughter, and people who love adventure.",
    interests: ["Photography", "Hiking", "Art"],
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
    verified: true,
  },
  {
    id: "love-noah",
    userId: "user-noah",
    name: "Noah",
    gender: "He",
    age: 30,
    city: "Kigali",
    occupation: "Software engineer",
    bio: "Tech enthusiast, runner, and amateur chef. Here for real connections and memorable experiences.",
    interests: ["Technology", "Running", "Cooking"],
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
  },
  {
    id: "love-keza",
    userId: "user-keza",
    name: "Keza",
    gender: "She",
    age: 27,
    city: "Huye",
    occupation: "Event producer",
    bio: "I create experiences for a living and collect great stories along the way. Dancing is always a yes.",
    interests: ["Dance", "Festivals", "Books"],
    imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
  },
  {
    id: "love-samuel",
    userId: "user-samuel",
    name: "Samuel",
    gender: "He",
    age: 29,
    city: "Rubavu",
    occupation: "Architect",
    bio: "Drawn to good architecture, lakeside sunsets, and conversations that run longer than expected.",
    interests: ["Architecture", "Jazz", "Travel"],
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85",
    active: true,
    eligible: true,
    verified: true,
    connectionStatus: "pending",
  },
];
