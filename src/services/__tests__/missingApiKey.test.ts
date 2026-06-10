import { describe, it, expect, vi } from 'vitest';
import { geocodeUsCity, reverseGeocode } from '../geocodingApi';
import { fetchCurrentWeather } from '../weatherApi';

vi.mock('../config', () => ({
  OWM_CONFIG: {
    apiKey: undefined,
    geoBaseUrl: 'https://api.openweathermap.org/geo/1.0',
    weatherBaseUrl: 'https://api.openweathermap.org/data/2.5',
    iconBaseUrl: 'https://openweathermap.org/img/wn',
    units: 'imperial',
  },
  hasApiKey: () => false,
}));

describe('when no API key is configured', () => {
  it('geocodeUsCity throws MISSING_API_KEY without calling fetch', async () => {
    globalThis.fetch = vi.fn();

    await expect(geocodeUsCity('Austin', 'TX')).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('reverseGeocode throws MISSING_API_KEY without calling fetch', async () => {
    globalThis.fetch = vi.fn();

    await expect(reverseGeocode({ lat: 1, lon: 2 })).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetchCurrentWeather throws MISSING_API_KEY without calling fetch', async () => {
    globalThis.fetch = vi.fn();

    await expect(fetchCurrentWeather({ lat: 1, lon: 2 })).rejects.toMatchObject({ code: 'MISSING_API_KEY' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
