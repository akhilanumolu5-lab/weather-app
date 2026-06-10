import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeUsCity, reverseGeocode } from '../geocodingApi';

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

function mockFetchOnce(response: Partial<Response> & { json: () => Promise<unknown> }) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, ...response } as Response);
}

describe('geocodeUsCity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the first matching location and queries with city, state, US', async () => {
    mockFetchOnce({ json: async () => [{ name: 'Austin', lat: 30.27, lon: -97.74, country: 'US', state: 'Texas' }] });

    const result = await geocodeUsCity('Austin', 'TX');

    expect(result).toEqual({ name: 'Austin', lat: 30.27, lon: -97.74, country: 'US', state: 'Texas' });
    const requestedUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(decodeURIComponent(requestedUrl)).toContain('q=Austin,TX,US');
  });

  it('omits the state from the query when not provided', async () => {
    mockFetchOnce({ json: async () => [{ name: 'Austin', lat: 30.27, lon: -97.74, country: 'US' }] });

    await geocodeUsCity('Austin');

    const requestedUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(decodeURIComponent(requestedUrl)).toContain('q=Austin,US');
  });

  it('returns null when the geocoder has no matches', async () => {
    mockFetchOnce({ json: async () => [] });

    const result = await geocodeUsCity('Nonexistentville');

    expect(result).toBeNull();
  });

  it('rejects blank input without making a network request', async () => {
    globalThis.fetch = vi.fn();

    await expect(geocodeUsCity('   ')).rejects.toMatchObject({ code: 'CITY_NOT_FOUND' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('maps a 401 response to INVALID_API_KEY', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ cod: 401, message: 'Invalid API key' }),
    } as Response);

    await expect(geocodeUsCity('Austin')).rejects.toMatchObject({ code: 'INVALID_API_KEY' });
  });

  it('maps a fetch failure to NETWORK_ERROR', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(geocodeUsCity('Austin')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the matching location for given coordinates', async () => {
    mockFetchOnce({ json: async () => [{ name: 'Austin', lat: 30.27, lon: -97.74, country: 'US', state: 'Texas' }] });

    const result = await reverseGeocode({ lat: 30.27, lon: -97.74 });

    expect(result.name).toBe('Austin');
    expect(result.state).toBe('Texas');
  });

  it('falls back to a generic label when nothing matches', async () => {
    mockFetchOnce({ json: async () => [] });

    const result = await reverseGeocode({ lat: 1, lon: 2 });

    expect(result).toEqual({ name: 'Current Location', country: '', lat: 1, lon: 2 });
  });
});
