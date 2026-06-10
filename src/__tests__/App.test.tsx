import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import type { UseWeatherResult } from '../hooks/useWeather';
import type { WeatherSummary } from '../types/weather';

vi.mock('../hooks/useWeather');
vi.mock('../hooks/useCachedIcon', () => ({
  useCachedIcon: (iconCode?: string) => (iconCode ? `mock://${iconCode}.png` : undefined),
}));
vi.mock('../services/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/config')>();
  return { ...actual, hasApiKey: () => true };
});

import { useWeather } from '../hooks/useWeather';

const weather: WeatherSummary = {
  location: { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 },
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

const baseResult: UseWeatherResult = {
  status: 'idle',
  data: null,
  errorMessage: null,
  source: null,
  needsManualSearch: false,
  searchCity: vi.fn(),
  searchByCoordinates: vi.fn(),
  useCurrentLocation: vi.fn(),
};

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows a loading message while fetching', () => {
    vi.mocked(useWeather).mockReturnValue({ ...baseResult, status: 'loading' });

    render(<App />);

    expect(screen.getByText(/loading weather/i)).toBeInTheDocument();
  });

  it('shows the weather card on success', () => {
    vi.mocked(useWeather).mockReturnValue({ ...baseResult, status: 'success', data: weather, source: 'search' });

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Austin, Texas, US' })).toBeInTheDocument();
  });

  it('shows an error message on failure', () => {
    vi.mocked(useWeather).mockReturnValue({
      ...baseResult,
      status: 'error',
      errorMessage: 'We could not find that city.',
    });

    render(<App />);

    expect(screen.getByRole('alert')).toHaveTextContent(/could not find that city/i);
  });

  it('prompts for a manual search when location access is unavailable', () => {
    vi.mocked(useWeather).mockReturnValue({ ...baseResult, status: 'idle', needsManualSearch: true });

    render(<App />);

    expect(screen.getByText(/search for a us city above/i)).toBeInTheDocument();
  });
});
