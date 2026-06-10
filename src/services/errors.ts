/**
 * Typed error used across the service layer so UI code can branch on
 * `error.code` instead of parsing error message strings.
 */
export type WeatherErrorCode =
  | 'MISSING_API_KEY'
  | 'CITY_NOT_FOUND'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'GEOLOCATION_DENIED'
  | 'GEOLOCATION_UNAVAILABLE'
  | 'GEOLOCATION_TIMEOUT'
  | 'UNKNOWN';

export class WeatherServiceError extends Error {
  code: WeatherErrorCode;

  constructor(code: WeatherErrorCode, message: string) {
    super(message);
    this.name = 'WeatherServiceError';
    this.code = code;
  }
}

/**
 * User-friendly copy for each error code. Keeping this in one place makes it
 * easy to keep messaging consistent and to localize later if needed.
 */
export const ERROR_MESSAGES: Record<WeatherErrorCode, string> = {
  MISSING_API_KEY:
    'No OpenWeatherMap API key is configured. Add VITE_OPENWEATHER_API_KEY to your .env file (see .env.example).',
  CITY_NOT_FOUND: "We couldn't find that city. Try the format \"City, ST\" (e.g. Austin, TX).",
  INVALID_API_KEY: 'The configured API key was rejected. Double-check VITE_OPENWEATHER_API_KEY in your .env file.',
  RATE_LIMITED: "We're being rate-limited by the weather service. Please wait a moment and try again.",
  NETWORK_ERROR: 'Unable to reach the weather service. Check your internet connection and try again.',
  API_ERROR: 'The weather service returned an unexpected error. Please try again later.',
  GEOLOCATION_DENIED: 'Location access was denied. You can still search for a city manually.',
  GEOLOCATION_UNAVAILABLE: 'Your current location is unavailable. You can still search for a city manually.',
  GEOLOCATION_TIMEOUT: 'Locating you took too long. You can still search for a city manually.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export function messageForError(error: unknown): string {
  if (error instanceof WeatherServiceError) {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return ERROR_MESSAGES.UNKNOWN;
}
