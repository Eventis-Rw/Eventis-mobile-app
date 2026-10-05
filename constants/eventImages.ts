export const EVENT_IMAGES: Record<string, number> = {
  concert: require("../assets/images/banner-concert.png"),
  tech: require("../assets/images/banner-tech.png"),
  food: require("../assets/images/banner-food.png"),
  "friday-fiesta": require("../assets/images/Second Post.jpeg"),
  "thursday-rewind": require("../assets/images/WhatsApp Image 2026-10-05 at 09.18.10.jpeg"),
  "grill-and-chill": require("../assets/images/WhatsApp Image 2026-10-05 at 09.18.12.jpeg"),
};

export const POSTER_RATIOS: Record<string, number> = {
  "friday-fiesta": 854 / 1080,
  "thursday-rewind": 900 / 1080,
  "grill-and-chill": 937 / 1080,
};

export function getEventImage(image: string) {
  return /^https?:\/\//.test(image) ? { uri: image } : EVENT_IMAGES[image] ?? EVENT_IMAGES.concert;
}
