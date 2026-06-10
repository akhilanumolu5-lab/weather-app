/**
 * Shapes returned by the OpenWeatherMap APIs (only the fields this app uses).
 * See https://openweathermap.org/current and https://openweathermap.org/api/geocoding-api
 */

export interface OwmWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OwmCurrentWeatherResponse {
  weather: OwmWeatherCondition[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
    deg?: number;
  };
  sys: {
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  name: string;
  dt: number;
  timezone: number;
  cod: number | string;
  message?: string;
}

export interface OwmGeocodingResult {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

/**
 * Generic shape OpenWeatherMap uses for error responses, e.g.
 * `{ "cod": 401, "message": "Invalid API key" }`.
 */
export interface OwmErrorResponse {
  cod: number | string;
  message: string;
}

// ---------------------------------------------------------------------------
// Normalized application-level types. Keeping these separate from the raw API
// shapes above means the rest of the app doesn't need to know about
// OpenWeatherMap's response format, and we can swap providers later without
// touching components.
// ---------------------------------------------------------------------------

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationInfo extends Coordinates {
  /** City name, e.g. "Austin" */
  name: string;
  /** US state code, e.g. "TX" (only present for US results) */
  state?: string;
  /** ISO country code, e.g. "US" */
  country: string;
}

export interface WeatherSummary {
  location: LocationInfo;
  /** Current temperature in the configured units (Fahrenheit by default) */
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  /** Relative humidity, percent */
  humidity: number;
  /** Wind speed in the configured units (mph by default) */
  windSpeed: number;
  /** Short human-readable description, e.g. "light rain" */
  description: string;
  /** Icon code used to build the icon URL, e.g. "10d" */
  icon: string;
  /** Broad condition group, e.g. "Rain" */
  conditionMain: string;
  /** When the observation was made (unix seconds, UTC) */
  observedAt: number;
}
