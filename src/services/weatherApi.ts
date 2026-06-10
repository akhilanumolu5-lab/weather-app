import { OWM_CONFIG, hasApiKey } from './config';
import { WeatherServiceError } from './errors';
import { fetchJson } from './httpClient';
import type { Coordinates, OwmCurrentWeatherResponse } from '../types/weather';

/**
 * Wraps OpenWeatherMap's "Current Weather Data" endpoint
 * (https://openweathermap.org/current). We always query by coordinates -
 * the city-name query parameter is deprecated, so callers should resolve a
 * city/zip to coordinates via `geocodingApi` first.
 */
export async function fetchCurrentWeather(coords: Coordinates): Promise<OwmCurrentWeatherResponse> {
  if (!hasApiKey()) {
    throw new WeatherServiceError('MISSING_API_KEY', 'OpenWeatherMap API key is not configured.');
  }

  const params = new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    units: OWM_CONFIG.units,
    appid: OWM_CONFIG.apiKey ?? '',
  });

  return fetchJson<OwmCurrentWeatherResponse>(`${OWM_CONFIG.weatherBaseUrl}/weather?${params.toString()}`);
}
