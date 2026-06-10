import { OWM_CONFIG, hasApiKey } from './config';
import { WeatherServiceError } from './errors';
import { fetchJson } from './httpClient';
import type { Coordinates, LocationInfo, OwmGeocodingResult } from '../types/weather';

/**
 * Wraps OpenWeatherMap's Geocoding API
 * (https://openweathermap.org/api/geocoding-api), which is the recommended
 * way to convert city/state names to coordinates and back - the older
 * "search by city name" parameter on the weather endpoint is deprecated.
 */

function toLocationInfo(result: OwmGeocodingResult): LocationInfo {
  return {
    name: result.name,
    state: result.state,
    country: result.country,
    lat: result.lat,
    lon: result.lon,
  };
}

function assertApiKey(): void {
  if (!hasApiKey()) {
    throw new WeatherServiceError('MISSING_API_KEY', 'OpenWeatherMap API key is not configured.');
  }
}

/**
 * Fetch up to 5 US city suggestions for the given partial query string.
 * Returns an empty array on any error so the autocomplete dropdown simply
 * stays hidden rather than crashing or showing an error.
 */
export async function fetchAutocompleteSuggestions(query: string): Promise<OwmGeocodingResult[]> {
  if (!hasApiKey()) return [];

  const params = new URLSearchParams({
    q: query,
    limit: '5',
    countrycodes: 'US',
    appid: OWM_CONFIG.apiKey ?? '',
  });

  return fetchJson<OwmGeocodingResult[]>(`${OWM_CONFIG.geoBaseUrl}/direct?${params.toString()}`);
}

/**
 * Look up coordinates for a US city, optionally narrowed by state code.
 *
 * @param city - City name, e.g. "Austin"
 * @param stateCode - Optional two-letter US state code, e.g. "TX"
 * @returns The best-matching location, or `null` if nothing matched.
 */
export async function geocodeUsCity(city: string, stateCode?: string): Promise<LocationInfo | null> {
  assertApiKey();

  const trimmedCity = city.trim();
  if (!trimmedCity) {
    throw new WeatherServiceError('CITY_NOT_FOUND', 'Please enter a city name.');
  }

  const queryParts = [trimmedCity];
  if (stateCode?.trim()) {
    queryParts.push(stateCode.trim());
  }
  queryParts.push('US');

  const params = new URLSearchParams({
    q: queryParts.join(','),
    limit: '1',
    appid: OWM_CONFIG.apiKey ?? '',
  });

  const results = await fetchJson<OwmGeocodingResult[]>(`${OWM_CONFIG.geoBaseUrl}/direct?${params.toString()}`);

  if (!results.length) {
    return null;
  }

  return toLocationInfo(results[0]);
}

/**
 * Reverse-geocode raw coordinates (e.g. from the browser's Geolocation API)
 * into a human-friendly location name.
 *
 * Falls back to a generic "Current Location" label if the geocoder returns
 * no match, since coordinates alone are still enough to fetch weather.
 */
export async function reverseGeocode(coords: Coordinates): Promise<LocationInfo> {
  assertApiKey();

  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    limit: '1',
    appid: OWM_CONFIG.apiKey ?? '',
  });

  const results = await fetchJson<OwmGeocodingResult[]>(`${OWM_CONFIG.geoBaseUrl}/reverse?${params.toString()}`);

  if (!results.length) {
    return {
      name: 'Current Location',
      country: '',
      lat: coords.lat,
      lon: coords.lon,
    };
  }

  return toLocationInfo(results[0]);
}
