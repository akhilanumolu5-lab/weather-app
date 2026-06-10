/**
 * Central configuration for talking to the OpenWeatherMap APIs.
 *
 * The API key is supplied via an environment variable so it never has to be
 * hard-coded or committed to source control. Vite only exposes variables
 * prefixed with `VITE_` to client code (see https://vite.dev/guide/env-and-mode).
 *
 * Copy `.env.example` to `.env` and fill in `VITE_OPENWEATHER_API_KEY` to
 * enable live API calls.
 */

const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined;

export const OWM_CONFIG = {
  apiKey,
  /** Current weather endpoint (https://openweathermap.org/current) */
  weatherBaseUrl: 'https://api.openweathermap.org/data/2.5',
  /** Geocoding endpoint used to convert city/state names <-> coordinates */
  geoBaseUrl: 'https://api.openweathermap.org/geo/1.0',
  /** Base URL for weather condition icons (https://openweathermap.org/weather-conditions) */
  iconBaseUrl: 'https://openweathermap.org/img/wn',
  /**
   * "imperial" gives temperatures in Fahrenheit and wind speed in mph, which
   * matches the expectations of US users (the brief focuses on US cities).
   */
  units: 'imperial' as const,
};

/** True once the developer has dropped a real key into `.env`. */
export function hasApiKey(): boolean {
  return Boolean(OWM_CONFIG.apiKey && OWM_CONFIG.apiKey.trim().length > 0);
}
