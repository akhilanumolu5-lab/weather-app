import type { LocationInfo } from '../types/weather';

/**
 * Persists the last successfully-viewed location so the app can restore it
 * on the next launch without waiting on geolocation or a fresh search.
 */

const STORAGE_KEY = 'weather-app:last-location';

export function getLastLocation(): LocationInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LocationInfo>;
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number' || typeof parsed.name !== 'string') {
      return null;
    }

    return {
      name: parsed.name,
      state: parsed.state,
      country: parsed.country ?? '',
      lat: parsed.lat,
      lon: parsed.lon,
    };
  } catch {
    // Corrupt JSON, storage disabled (e.g. private browsing), etc. - treat
    // as "no saved location" rather than crashing the app.
    return null;
  }
}

export function saveLastLocation(location: LocationInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // Ignore write failures (e.g. storage quota exceeded or disabled) -
    // persistence is a nice-to-have, not critical to the app working.
  }
}

export function clearLastLocation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
