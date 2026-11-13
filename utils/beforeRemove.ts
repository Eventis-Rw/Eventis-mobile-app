import type { NavigationAction } from "expo-router";

export type BeforeRemoveEvent = {
  preventDefault: () => void;
  data: { action: NavigationAction };
};

type BeforeRemoveNavigation = {
  addListener: (
    event: "beforeRemove",
    listener: (event: BeforeRemoveEvent) => void,
  ) => () => void;
};

export function subscribeBeforeRemove(
  navigation: unknown,
  listener: (event: BeforeRemoveEvent) => void,
): () => void {
  return (navigation as BeforeRemoveNavigation).addListener(
    "beforeRemove",
    listener,
  );
}
