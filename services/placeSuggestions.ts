// Free, keyless place search (OpenStreetMap data) used to suggest venues,
// restaurants and hotels while someone types an event location.
const PHOTON_URL = "https://photon.komoot.io/api/";

export interface PlaceSuggestion {
  id: string;
  label: string;
  secondaryLabel: string;
  category?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface PhotonFeature {
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: { coordinates?: [number, number] };
}

export async function fetchPlaceSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const url = `${PHOTON_URL}?q=${encodeURIComponent(trimmed)}&limit=6&lang=en`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const body = (await response.json()) as { features?: PhotonFeature[] };
  const features = Array.isArray(body.features) ? body.features : [];
  return features
    .map((feature, index): PlaceSuggestion | null => {
      const props = feature.properties ?? {};
      const coords = feature.geometry?.coordinates;
      const streetLine =
        props.street && props.housenumber
          ? `${props.street} ${props.housenumber}`
          : props.street;
      const parts = [streetLine, props.city, props.state, props.country].filter(
        (part): part is string => Boolean(part),
      );
      const label = props.name || parts[0];
      if (!label) return null;
      return {
        id: `${props.osm_type ?? "place"}-${props.osm_id ?? index}`,
        label,
        secondaryLabel: parts.filter((part) => part !== label).join(", "),
        category: props.osm_value || props.type,
        city: props.city,
        latitude: Array.isArray(coords) ? coords[1] : undefined,
        longitude: Array.isArray(coords) ? coords[0] : undefined,
      };
    })
    .filter((s): s is PlaceSuggestion => s !== null);
}

export function formatPlaceSuggestion(suggestion: PlaceSuggestion): string {
  return [suggestion.label, suggestion.secondaryLabel].filter(Boolean).join(", ");
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: "restaurant-outline",
  fast_food: "fast-food-outline",
  cafe: "cafe-outline",
  bar: "wine-outline",
  pub: "beer-outline",
  hotel: "bed-outline",
  hostel: "bed-outline",
  guest_house: "bed-outline",
  motel: "bed-outline",
  nightclub: "musical-notes-outline",
};

export function placeSuggestionIcon(category?: string): string {
  return (category && CATEGORY_ICONS[category]) || "location-outline";
}
