/**
 * Today's date as YYYY-MM-DD in the device's time zone. Event dates are local
 * calendar dates, so comparing against a UTC date (toISOString) would treat
 * yesterday's events as upcoming for the first hours of the day in UTC+ zones.
 */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
