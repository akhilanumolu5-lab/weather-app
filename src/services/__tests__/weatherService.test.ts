import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWeatherForCity, getWeatherForCoordinates, getWeatherForLocation } from '../weatherService';
import { WeatherServiceError } from '../errors';
import type { LocationInfo, OwmCurrentWeatherResponse } from '../../types/weather';

vi.mock('../geocodingApi');
vi.mock('../weatherApi');

import { geocodeUsCity, reverseGeocode } from '../geocodingApi';
import { fetchCurrentWeather } from '../weatherApi';

const austin: LocationInfo = { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 };

const rawWeather: OwmCurrentWeatherResponse = {
  weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
  main: { temp: 72, feels_like: 70, temp_min: 68, temp_max: 75, humidity: 40, pressure: 1015 },
  wind: { speed: 5 },
  sys: { country: 'US' },
  name: 'Austin',
  dt: 1_700_000_000,
  timezone: -18000,
  cod: 200,
};

describe('getWeatherForCity', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('geocodes the city and returns normalized weather', async () => {
    vi.mocked(geocodeUsCity).mockResolvedValue(austin);
    vi.mocked(fetchCurrentWeather).mockResolvedValue(rawWeather);

    const result = await getWeatherForCity('Austin', 'TX');

    expect(geocodeUsCity).toHaveBeenCalledWith('Austin', 'TX');
    expect(fetchCurrentWeather).toHaveBeenCalledWith(austin);
    expect(result).toEqual({
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
    });
  });

  it('throws CITY_NOT_FOUND when the geocoder has no match', async () => {
    vi.mocked(geocodeUsCity).mockResolvedValue(null);

    await expect(getWeatherForCity('Nonexistentville')).rejects.toBeInstanceOf(WeatherServiceError);
    await expect(getWeatherForCity('Nonexistentville')).rejects.toMatchObject({ code: 'CITY_NOT_FOUND' });
    expect(fetchCurrentWeather).not.toHaveBeenCalled();
  });
});

describe('getWeatherForCoordinates', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reverse geocodes and fetches weather in parallel', async () => {
    vi.mocked(reverseGeocode).mockResolvedValue(austin);
    vi.mocked(fetchCurrentWeather).mockResolvedValue(rawWeather);

    const result = await getWeatherForCoordinates({ lat: 30.27, lon: -97.74 });

    expect(reverseGeocode).toHaveBeenCalledWith({ lat: 30.27, lon: -97.74 });
    expect(result.location).toEqual(austin);
    expect(result.temperature).toBe(72);
  });
});

describe('getWeatherForLocation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches weather without re-geocoding', async () => {
    vi.mocked(fetchCurrentWeather).mockResolvedValue(rawWeather);

    const result = await getWeatherForLocation(austin);

    expect(geocodeUsCity).not.toHaveBeenCalled();
    expect(reverseGeocode).not.toHaveBeenCalled();
    expect(result.location).toEqual(austin);
  });
});
