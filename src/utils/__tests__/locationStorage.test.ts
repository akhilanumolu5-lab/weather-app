import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearLastLocation, getLastLocation, saveLastLocation } from '../locationStorage';
import type { LocationInfo } from '../../types/weather';

const austin: LocationInfo = { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 };

describe('locationStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing has been saved', () => {
    expect(getLastLocation()).toBeNull();
  });

  it('round-trips a saved location', () => {
    saveLastLocation(austin);
    expect(getLastLocation()).toEqual(austin);
  });

  it('clears the saved location', () => {
    saveLastLocation(austin);
    clearLastLocation();
    expect(getLastLocation()).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('weather-app:last-location', '{not json');
    expect(getLastLocation()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    localStorage.setItem('weather-app:last-location', JSON.stringify({ name: 'Austin' }));
    expect(getLastLocation()).toBeNull();
  });

  it('does not throw if localStorage access fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => saveLastLocation(austin)).not.toThrow();

    spy.mockRestore();
  });
});
