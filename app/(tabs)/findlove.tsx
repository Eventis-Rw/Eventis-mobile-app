import { Redirect } from "expo-router";

import { FIND_LOVE_ENABLED } from "@/services/findLoveService";

// The tab is an entry point; FindLove runs as its own section at /love.
export default function FindLoveEntry() {
  return <Redirect href={(FIND_LOVE_ENABLED ? "/love" : "/(tabs)") as any} />;
}
