import { geocodeUsCity, reverseGeocode } from './geocodingApi';
import { fetchCurrentWeather } from './weatherApi';
import { WeatherServiceError } from './errors';
import type { Coordinates, LocationInfo, OwmCurrentWeatherResponse, WeatherSummary } from '../types/weather';

/**
 * Top-level service used by the UI layer (hooks/components shouldn't talk to
 * the OpenWeatherMap APIs directly). This module is responsible for:
 *  - combining the geocoding + current-weather calls into single operations
 *  - normalizing OpenWeatherMap's response shape into `WeatherSummary`,
 *    which is the only shape the rest of the app needs to know about
 */

function normalize(location: LocationInfo, raw: OwmCurrentWeatherResponse): WeatherSummary {
  const condition = raw.weather[0];
  return {
    location,
    temperature: raw.main.temp,
    feelsLike: raw.main.feels_like,
    tempMin: raw.main.temp_min,
    tempMax: raw.main.temp_max,
    humidity: raw.main.humidity,
    windSpeed: raw.wind.speed,
    description: condition?.description ?? 'Unknown',
    icon: condition?.icon ?? '01d',
    conditionMain: condition?.main ?? 'Unknown',
    observedAt: raw.dt,
  };
}

/**
 * Resolve a US city (optionally "City, ST") to coordinates and fetch its
 * current weather.
 *
 * @throws {WeatherServiceError} with code `CITY_NOT_FOUND` if the geocoder
 * has no match for the given input.
 */
export async function getWeatherForCity(city: string, stateCode?: string): Promise<WeatherSummary> {
  const location = await geocodeUsCity(city, stateCode);
  if (!location) {
    throw new WeatherServiceError('CITY_NOT_FOUND', `No match for "${city}${stateCode ? `, ${stateCode}` : ''}".`);
  }

  const raw = await fetchCurrentWeather(location);
  return normalize(location, raw);
}

/**
 * Fetch current weather for raw coordinates (e.g. from the browser's
 * Geolocation API), reverse-geocoding them into a friendly place name for
 * display.
 */
export async function getWeatherForCoordinates(coords: Coordinates): Promise<WeatherSummary> {
  const [location, raw] = await Promise.all([reverseGeocode(coords), fetchCurrentWeather(coords)]);
  return normalize(location, raw);
}

/**
 * Re-fetch weather for a previously-resolved location (used to refresh the
 * "last searched city" on launch without re-running the geocoder).
 */
export async function getWeatherForLocation(location: LocationInfo): Promise<WeatherSummary> {
  const raw = await fetchCurrentWeather(location);
  return normalize(location, raw);
}
