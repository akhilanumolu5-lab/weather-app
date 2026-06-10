/** Capitalizes the first letter, e.g. "light rain" -> "Light rain". */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Formats a unix timestamp (seconds) as a local time string, e.g. "3:45 PM". */
export function formatObservedTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Joins location parts (city, state, country) into a display string, skipping empty values. */
export function formatLocationLabel(parts: Array<string | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(', ');
}
