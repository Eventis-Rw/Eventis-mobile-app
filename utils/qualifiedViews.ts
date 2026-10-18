/** One cancellable timer per eligible item; hiding or removing it resets dwell time. */
export function createQualifiedViewTracker<T extends { id: string }>(report: (item: T) => void,
  schedule: (callback: () => void, ms: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const reported = new Set<string>();
  return {
    update(items: T[], active: boolean) {
      const ids = new Set(active ? items.map((item) => item.id) : []);
      for (const [id, timer] of timers) if (!ids.has(id)) { cancel(timer); timers.delete(id); }
      for (const id of reported) if (!ids.has(id)) reported.delete(id);
      if (!active) return;
      for (const item of items) if (!timers.has(item.id) && !reported.has(item.id)) {
        timers.set(item.id, schedule(() => { timers.delete(item.id); reported.add(item.id); report(item); }, 1000));
      }
    },
    dispose() { timers.forEach(cancel); timers.clear(); reported.clear(); },
  };
}
