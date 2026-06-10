import { OWM_CONFIG } from '../services/config';

/**
 * Caches OpenWeatherMap weather icons using the browser's Cache Storage API
 * (the same mechanism service workers use). This means an icon is only
 * downloaded once - subsequent views (even after a full page reload) are
 * served from disk instead of hitting the network again.
 *
 * Falls back to returning the plain CDN URL in environments where the Cache
 * API isn't available (e.g. some test runners or older browsers), so the app
 * degrades to relying on normal HTTP caching instead of breaking.
 */

const ICON_CACHE_NAME = 'weather-app-icons-v1';

/** Build the CDN URL for a given OpenWeatherMap icon code, e.g. "10d". */
export function getIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
  return `${OWM_CONFIG.iconBaseUrl}/${iconCode}@${size}.png`;
}

/**
 * Resolve a displayable URL for an icon, using the Cache Storage API to
 * avoid re-downloading icons that have already been fetched.
 *
 * Returns either a `blob:` object URL (caller should revoke it when done) or
 * the original CDN URL if caching isn't available/failed.
 */
export async function getCachedIconSrc(iconCode: string): Promise<string> {
  const url = getIconUrl(iconCode);

  if (typeof caches === 'undefined') {
    return url;
  }

  try {
    const cache = await caches.open(ICON_CACHE_NAME);
    let response = await cache.match(url);

    if (!response) {
      response = await fetch(url);
      if (response.ok) {
        // `put` consumes the response body, so cache a clone and keep the
        // original for use below.
        await cache.put(url, response.clone());
      }
    }

    if (!response.ok) {
      return url;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    // Network/cache failure - fall back to the direct URL so the <img> tag
    // can still attempt to load it (and benefit from normal HTTP caching).
    return url;
  }
}
