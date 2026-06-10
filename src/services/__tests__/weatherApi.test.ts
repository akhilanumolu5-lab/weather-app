import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCurrentWeather } from '../weatherApi';

vi.mock('../config', () => ({
  OWM_CONFIG: {
    apiKey: 'test-key',
    geoBaseUrl: 'https://api.openweathermap.org/geo/1.0',
    weatherBaseUrl: 'https://api.openweathermap.org/data/2.5',
    iconBaseUrl: 'https://openweathermap.org/img/wn',
    units: 'imperial',
  },
  hasApiKey: () => true,
}));

const sampleResponse = {
  weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
  main: { temp: 72, feels_like: 70, temp_min: 68, temp_max: 75, humidity: 40, pressure: 1015 },
  wind: { speed: 5 },
  sys: { country: 'US' },
  name: 'Austin',
  dt: 1_700_000_000,
  timezone: -18000,
  cod: 200,
};

describe('fetchCurrentWeather', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requests weather for the given coordinates with imperial units', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => sampleResponse } as Response);

    const result = await fetchCurrentWeather({ lat: 30.27, lon: -97.74 });

    expect(result).toEqual(sampleResponse);
    const requestedUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(requestedUrl).toContain('lat=30.27');
    expect(requestedUrl).toContain('lon=-97.74');
    expect(requestedUrl).toContain('units=imperial');
  });

  it('maps a 404 response to CITY_NOT_FOUND', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ cod: '404', message: 'city not found' }),
    } as Response);

    await expect(fetchCurrentWeather({ lat: 0, lon: 0 })).rejects.toMatchObject({ code: 'CITY_NOT_FOUND' });
  });

  it('maps a 429 response to RATE_LIMITED', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ cod: 429, message: 'rate limit exceeded' }),
    } as Response);

    await expect(fetchCurrentWeather({ lat: 0, lon: 0 })).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('maps a generic 500 response to API_ERROR', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ cod: 500, message: 'server error' }),
    } as Response);

    await expect(fetchCurrentWeather({ lat: 0, lon: 0 })).rejects.toMatchObject({ code: 'API_ERROR' });
  });
});
