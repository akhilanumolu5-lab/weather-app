import { WeatherServiceError } from './errors';
import type { OwmErrorResponse } from '../types/weather';

/**
 * Thin wrapper around `fetch` shared by the geocoding and weather API
 * modules. It centralizes:
 *  - translating network failures (offline, DNS, CORS, etc.) into
 *    `WeatherServiceError('NETWORK_ERROR')`
 *  - mapping OpenWeatherMap's HTTP error responses (401 / 404 / 429 / 5xx)
 *    into typed `WeatherServiceError`s
 *  - JSON parsing
 */
export async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    // `fetch` throws a TypeError for network-level failures (offline, DNS,
    // blocked by CORS, etc.) rather than rejecting with an HTTP status.
    throw new WeatherServiceError('NETWORK_ERROR', 'Network request failed.');
  }

  if (!response.ok) {
    let body: Partial<OwmErrorResponse> | undefined;
    try {
      body = (await response.json()) as OwmErrorResponse;
    } catch {
      // Response wasn't JSON (e.g. an HTML error page) - fall through with
      // just the status code.
    }

    if (response.status === 401) {
      throw new WeatherServiceError('INVALID_API_KEY', body?.message ?? 'Invalid API key.');
    }
    if (response.status === 404) {
      throw new WeatherServiceError('CITY_NOT_FOUND', body?.message ?? 'Location not found.');
    }
    if (response.status === 429) {
      throw new WeatherServiceError('RATE_LIMITED', body?.message ?? 'Rate limit exceeded.');
    }
    throw new WeatherServiceError(
      'API_ERROR',
      body?.message ?? `Request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as T;
}
