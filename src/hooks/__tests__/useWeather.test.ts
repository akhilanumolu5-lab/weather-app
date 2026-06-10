import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WeatherServiceError } from '../../services/errors';
import type { LocationInfo, WeatherSummary } from '../../types/weather';

vi.mock('../../services/weatherService');
vi.mock('../../utils/locationStorage');
vi.mock('../useGeolocation');

import { getWeatherForCity, getWeatherForCoordinates, getWeatherForLocation } from '../../services/weatherService';
import { getLastLocation, saveLastLocation } from '../../utils/locationStorage';
import { useGeolocation } from '../useGeolocation';
import { useWeather } from '../useWeather';

const austin: LocationInfo = { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 };

const weatherSummary: WeatherSummary = {
  location: austin,
  temperature: 72,
  feelsLike: 70,
  tempMin: 68,
  tempMax: 75,
  humidity: 40,
  windSpeed: 5,
  description: 'clear sky',
  icon: '01d',
  conditionMain: 'Clear',
  observedAt: 1_700_000_000,
};

function mockGeolocation(overrides: Partial<ReturnType<typeof useGeolocation>> = {}) {
  vi.mocked(useGeolocation).mockReturnValue({
    coords: null,
    status: 'idle',
    requestLocation: vi.fn(),
    ...overrides,
  });
}

describe('useWeather', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads weather for the saved location on mount', async () => {
    vi.mocked(getLastLocation).mockReturnValue(austin);
    vi.mocked(getWeatherForLocation).mockResolvedValue(weatherSummary);
    mockGeolocation();

    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.source).toBe('saved-location');
    expect(result.current.data).toEqual(weatherSummary);
    expect(getWeatherForLocation).toHaveBeenCalledWith(austin);
    expect(saveLastLocation).toHaveBeenCalledWith(weatherSummary.location);
  });

  it('falls back to geolocation when there is no saved location', async () => {
    vi.mocked(getLastLocation).mockReturnValue(null);
    vi.mocked(getWeatherForCoordinates).mockResolvedValue(weatherSummary);

    const requestLocation = vi.fn();
    mockGeolocation({ requestLocation });

    const { result, rerender } = renderHook(() => useWeather());

    expect(requestLocation).toHaveBeenCalled();

    mockGeolocation({ coords: { lat: 30.27, lon: -97.74 }, status: 'granted', requestLocation });
    rerender();

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.source).toBe('current-location');
    expect(getWeatherForCoordinates).toHaveBeenCalledWith({ lat: 30.27, lon: -97.74 });
  });

  it('prompts for manual search when there is no saved location and geolocation is denied', async () => {
    vi.mocked(getLastLocation).mockReturnValue(null);
    const requestLocation = vi.fn();
    mockGeolocation({ requestLocation });

    const { result, rerender } = renderHook(() => useWeather());

    mockGeolocation({ status: 'denied', requestLocation });
    rerender();

    await waitFor(() => expect(result.current.needsManualSearch).toBe(true));
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
  });

  it('searchCity loads weather and marks the source as "search"', async () => {
    vi.mocked(getLastLocation).mockReturnValue(null);
    mockGeolocation({ status: 'denied' });
    vi.mocked(getWeatherForCity).mockResolvedValue(weatherSummary);

    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.needsManualSearch).toBe(true));

    act(() => {
      result.current.searchCity('Austin', 'TX');
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.source).toBe('search');
    expect(getWeatherForCity).toHaveBeenCalledWith('Austin', 'TX');
  });

  it('exposes a friendly message when a search fails', async () => {
    vi.mocked(getLastLocation).mockReturnValue(null);
    mockGeolocation({ status: 'denied' });
    vi.mocked(getWeatherForCity).mockRejectedValue(new WeatherServiceError('CITY_NOT_FOUND', 'no match'));

    const { result } = renderHook(() => useWeather());

    await waitFor(() => expect(result.current.needsManualSearch).toBe(true));

    act(() => {
      result.current.searchCity('Nonexistentville');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toMatch(/couldn't find/i);
  });
});
