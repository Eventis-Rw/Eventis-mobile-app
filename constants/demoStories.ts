import type { PublishedStory } from "@/services/storyService";

export function makeDemoStories(createdAt: number): PublishedStory[] {
  return [
    { ownerId: "demo-kigali-jazz", organizerName: "Kigali Jazz", image: require("../assets/images/banner-concert.png"), eventId: "evt_1", eventTitle: "Neon Pulse Music Festival" },
    { ownerId: "demo-tech-kigali", organizerName: "Tech Kigali", image: require("../assets/images/banner-tech.png"), eventId: "evt_2", eventTitle: "FutureTech Summit" },
    { ownerId: "demo-street-food", organizerName: "Street Food Fest", image: require("../assets/images/banner-food.png"), eventId: "evt_3", eventTitle: "Street Food Carnival" },
  ].map(({ image, ...item }, index) => ({
    ...item, id: `demo-story-${index}-${createdAt}`, organizerAvatar: "", storyImage: image,
    mediaType: "image", background: "#080B10", fit: "contain", overlays: [], createdAt,
    expiresAt: createdAt + 86400000,
  }));
}

