export const EVENT_IMAGES: Record<string, number> = {
  concert: require("../assets/images/banner-concert.png"),
  tech: require("../assets/images/banner-tech.png"),
  food: require("../assets/images/banner-food.png"),
  "friday-fiesta": require("../assets/images/friday-fiesta.jpeg"),
  "thursday-rewind": require("../assets/images/thursday-rewind.jpeg"),
  "grill-and-chill": require("../assets/images/grill-and-chill.jpeg"),
};

export const POSTER_RATIOS: Record<string, number> = {
  "friday-fiesta": 854 / 1080,
  "thursday-rewind": 900 / 1080,
  "grill-and-chill": 937 / 1080,
};

export function getEventImage(image: string) {
  return /^https?:\/\//.test(image) ? { uri: image } : EVENT_IMAGES[image] ?? EVENT_IMAGES.concert;
}
