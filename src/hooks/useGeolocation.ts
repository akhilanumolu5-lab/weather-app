import { useCallback, useState } from 'react';
import type { Coordinates } from '../types/weather';

export type GeolocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface GeolocationState {
  coords: Coordinates | null;
  status: GeolocationStatus;
}

export interface UseGeolocationResult extends GeolocationState {
  /** Triggers the browser's location permission prompt (if not already decided). */
  requestLocation: () => void;
}

/**
 * Thin wrapper around the browser's Geolocation API.
 *
 * Note: `getCurrentPosition` itself surfaces the permission prompt - there is
 * no separate "ask for permission" call. We model the result as a small
 * status enum so the UI can show a friendly fallback when access is denied
 * or unsupported, instead of failing silently.
 */
export function useGeolocation(): UseGeolocationResult {
  const [state, setState] = useState<GeolocationState>({ coords: null, status: 'idle' });

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ coords: null, status: 'unavailable' });
      return;
    }

    setState({ coords: null, status: 'requesting' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: { lat: position.coords.latitude, lon: position.coords.longitude },
          status: 'granted',
        });
      },
      (error) => {
        const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
        setState({ coords: null, status });
      },
      { timeout: 10_000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { ...state, requestLocation };
}
