import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

describe('useGeolocation', () => {
  const originalGeolocation = navigator.geolocation;

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { value: originalGeolocation, configurable: true });
  });

  it('starts in the idle state', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toBeNull();
  });

  it('reports granted coordinates on success', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 30.27, longitude: -97.74 } } as GeolocationPosition);
        },
      },
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.coords).toEqual({ lat: 30.27, lon: -97.74 });
  });

  it('reports "denied" when the user rejects the permission prompt', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
        },
      },
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.coords).toBeNull();
  });

  it('reports "unavailable" when geolocation is not supported', () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.status).toBe('unavailable');
  });
});
