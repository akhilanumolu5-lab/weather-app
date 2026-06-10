import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { getWeatherForCity, getWeatherForCoordinates, getWeatherForLocation } from '../services/weatherService';
import { messageForError } from '../services/errors';
import { getLastLocation, saveLastLocation } from '../utils/locationStorage';
import type { WeatherSummary } from '../types/weather';

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

/** Where the currently-displayed weather data came from, for UI messaging. */
export type WeatherSource = 'saved-location' | 'current-location' | 'search' | null;

export interface UseWeatherResult {
  status: WeatherStatus;
  data: WeatherSummary | null;
  /** User-friendly error message, ready to display directly. */
  errorMessage: string | null;
  source: WeatherSource;
  /**
   * True once we know there's no usable starting point (no saved city, and
   * geolocation was denied/unavailable) - the UI should prompt the user to
   * search manually.
   */
  needsManualSearch: boolean;
  /** Search for a US city, optionally narrowed by two-letter state code. */
  searchCity: (city: string, stateCode?: string) => void;
  /** Search by coordinates (e.g. from an autocomplete suggestion that already has lat/lon). */
  searchByCoordinates: (lat: number, lon: number) => void;
  /** Re-request weather for the user's current location. */
  useCurrentLocation: () => void;
}

/**
 * App-level "view model" hook that ties together geocoding, the weather API,
 * geolocation, and localStorage persistence.
 *
 * Startup behavior (see project README for the rationale):
 *  1. If a city was previously searched (or geolocated), load weather for it
 *     immediately - this is the "auto-load last city" requirement.
 *  2. Otherwise, request geolocation permission. If granted, show weather
 *     for the user's current location and remember it as the "last
 *     location" going forward.
 *  3. If there's no saved location and geolocation is denied/unavailable,
 *     `needsManualSearch` becomes true so the UI can prompt the user to
 *     search for a city.
 */
export function useWeather(): UseWeatherResult {
  const [status, setStatus] = useState<WeatherStatus>('idle');
  const [data, setData] = useState<WeatherSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [source, setSource] = useState<WeatherSource>(null);
  const [needsManualSearch, setNeedsManualSearch] = useState(false);

  const geolocation = useGeolocation();

  // Avoids setting state after unmount, and lets us tell whether a given
  // async response is still the most recent request.
  const requestIdRef = useRef(0);

  const runRequest = useCallback(async (task: () => Promise<WeatherSummary>, requestSource: WeatherSource) => {
    const requestId = ++requestIdRef.current;
    setStatus('loading');
    setError(null);

    try {
      const result = await task();
      if (requestIdRef.current !== requestId) return; // a newer request superseded this one
      setData(result);
      setSource(requestSource);
      setStatus('success');
      setNeedsManualSearch(false);
      saveLastLocation(result.location);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err);
      setStatus('error');
    }
  }, []);

  const searchCity = useCallback(
    (city: string, stateCode?: string) => {
      void runRequest(() => getWeatherForCity(city, stateCode), 'search');
    },
    [runRequest]
  );

  const searchByCoordinates = useCallback(
    (lat: number, lon: number) => {
      void runRequest(() => getWeatherForCoordinates({ lat, lon }), 'search');
    },
    [runRequest]
  );

  const useCurrentLocation = useCallback(() => {
    geolocation.requestLocation();
  }, [geolocation]);

  // Initial load: prefer a saved location, otherwise fall back to geolocation.
  // `runRequest` sets `status` to "loading" synchronously before awaiting,
  // which is the standard data-fetching-effect pattern from the React docs
  // (https://react.dev/reference/react/useEffect#fetching-data-with-effects);
  // the newer `set-state-in-effect` lint rule flags it anyway, so it's
  // disabled for these two effects.
  useEffect(() => {
    const last = getLastLocation();
    if (last) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runRequest(() => getWeatherForLocation(last), 'saved-location');
    } else {
      geolocation.requestLocation();
    }
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to geolocation results (covers both the automatic first-launch
  // request above and manual "use my location" clicks).
  useEffect(() => {
    if (geolocation.status === 'granted' && geolocation.coords) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runRequest(() => getWeatherForCoordinates(geolocation.coords!), 'current-location');
    } else if (geolocation.status === 'denied' || geolocation.status === 'unavailable') {
      setNeedsManualSearch((current) => {
        // Only fall back to the "search manually" prompt if we don't already
        // have data on screen (e.g. from a saved location).
        return current || data === null;
      });
      setStatus((current) => (current === 'loading' ? 'idle' : current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geolocation.status, geolocation.coords]);

  const errorMessage = error ? messageForError(error) : null;

  return {
    status,
    data,
    errorMessage,
    source,
    needsManualSearch,
    searchCity,
    searchByCoordinates,
    useCurrentLocation,
  };
}
