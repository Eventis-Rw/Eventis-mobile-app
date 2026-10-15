import type { PublishedStory } from "@/services/storyService";

// Temporary testing mode. Set EXPO_PUBLIC_RESET_STORY_VIEWS_ON_RELOAD=false
// to restore watched-state persistence for other accounts across reloads.
export const RESET_STORY_VIEWS_ON_RELOAD = process.env.EXPO_PUBLIC_USE_EVENTS_API !== "true" &&
  process.env.EXPO_PUBLIC_RESET_STORY_VIEWS_ON_RELOAD !== "false";
const concert = require("../assets/images/banner-concert.png");
const food = require("../assets/images/banner-food.png");
const tech = require("../assets/images/banner-tech.png");
const fiesta = require("../assets/images/friday-fiesta.jpeg");
const rewind = require("../assets/images/thursday-rewind.jpeg");
const grill = require("../assets/images/grill-and-chill.jpeg");
const avatar = (photo: string) => `https://images.unsplash.com/${photo}?w=160&auto=format&fit=crop&q=80`;

export function makeDemoStories(createdAt: number): PublishedStory[] {
  return [
    { ownerId: "demo-rush-bar", organizerName: "The Rush Bar", images: [fiesta, concert, fiesta], organizerAvatar: avatar("photo-1470225620780-dba8ba36b745"), eventId: "demo-friday-fiesta", eventTitle: "Friday Fiesta" },
    { ownerId: "demo-kaizen", organizerName: "Kaizen Hotel", images: [rewind, food], organizerAvatar: avatar("photo-1555396273-367ea4eb4db5"), eventId: "demo-thursday-rewind", eventTitle: "Thursday Rewind" },
    { ownerId: "demo-yessah", organizerName: "Yessah Lounge", images: [grill, concert], organizerAvatar: avatar("photo-1511671782779-c97d3d27a1d4"), eventId: "demo-grill-and-chill", eventTitle: "Grill and Chill" },
    { ownerId: "demo-kigali-jazz", organizerName: "Kigali Jazz", images: [concert, grill], organizerAvatar: avatar("photo-1511671782779-c97d3d27a1d4"), eventId: "1", eventTitle: "Neon Pulse Music Festival" },
    { ownerId: "demo-tech-kigali", organizerName: "Tech Kigali", images: [tech, concert], organizerAvatar: avatar("photo-1531482615713-2afd69097998"), eventId: "2", eventTitle: "FutureTech Summit" },
    { ownerId: "demo-street-food", organizerName: "Street Food Fest", images: [food, rewind], organizerAvatar: avatar("photo-1555396273-367ea4eb4db5"), eventId: "3", eventTitle: "Street Food Carnival" },
    { ownerId: "demo-yoga", organizerName: "Yoga Life", images: [require("../assets/images/onboarding-people.jpg"), food], organizerAvatar: avatar("photo-1506126613408-eca07ce68773"), eventId: "9", eventTitle: "Yoga in the Park" },
    { ownerId: "demo-midnight", organizerName: "Midnight Beats", images: [concert, fiesta], organizerAvatar: avatar("photo-1470225620780-dba8ba36b745"), eventId: "10", eventTitle: "Underground Warehouse Rave" },
    { ownerId: "demo-city", organizerName: "City Creatives", images: [tech, require("../assets/images/onboarding-city.jpg")], organizerAvatar: avatar("photo-1531482615713-2afd69097998"), eventId: "11", eventTitle: "Photography Masterclass" },
  ].flatMap(({ images, ...account }, accountIndex) => images.map((image, index) => ({
    ...account, id: `demo-story-${accountIndex}-${index}-${createdAt}`, storyImage: image,
    mediaType: "image" as const, background: "#080B10", fit: "contain" as const, overlays: [],
    createdAt: createdAt - (images.length - index) * 60000 - accountIndex * 600000,
    expiresAt: createdAt + 86400000,
  })));
}

