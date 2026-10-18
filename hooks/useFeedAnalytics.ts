import { useEffect, useRef, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import type { ViewToken } from "react-native";
import type { Event } from "@/constants/events";
import type { AnalyticsSource } from "@/services/analyticsService";
import { useAnalytics } from "@/context/AnalyticsContext";
import { createQualifiedViewTracker } from "@/utils/qualifiedViews";

export function useFeedAnalytics(source: AnalyticsSource, covered = false) {
  const { trackEvent, foreground } = useAnalytics();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const latest = useRef({ trackEvent, source, active: false });
  latest.current = { trackEvent, source, active: focused && foreground && !covered };
  const visible = useRef<Event[]>([]);
  const loaded = useRef(new Set<string>());
  const tracker = useRef<ReturnType<typeof createQualifiedViewTracker<Event>> | null>(null);
  if (!tracker.current) tracker.current = createQualifiedViewTracker<Event>((event) => {
    if (latest.current.active) latest.current.trackEvent(event, "feed_view", latest.current.source);
  });
  const update = useCallback(() => {
    tracker.current?.update(visible.current.filter((event) => loaded.current.has(event.id)), latest.current.active);
  }, []);
  useEffect(() => { update(); return () => tracker.current?.dispose(); }, [focused, foreground, covered, source, update]);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 0 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Event>[] }) => {
    visible.current = viewableItems.filter((token) => token.isViewable).map((token) => token.item);
    update();
  }, [update]);
  const onMediaReady = useCallback((id: string, ready = true) => { if (ready) loaded.current.add(id); else loaded.current.delete(id); update(); }, [update]);
  return { viewabilityConfig, onViewableItemsChanged, onMediaReady };
}
