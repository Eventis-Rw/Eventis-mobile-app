import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState } from "react-native";

export function useEventClock() {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") update();
    }, 30_000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") update();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []));
  return now;
}
