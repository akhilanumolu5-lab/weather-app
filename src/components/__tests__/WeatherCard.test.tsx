import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeatherCard } from '../WeatherCard';
import type { WeatherSummary } from '../../types/weather';

// Avoid the real icon-caching network/Cache Storage flow in this component test.
vi.mock('../../hooks/useCachedIcon', () => ({
  useCachedIcon: (iconCode?: string) => (iconCode ? `mock://${iconCode}.png` : undefined),
}));

const weather: WeatherSummary = {
  location: { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 },
  temperature: 72.4,
  feelsLike: 70.1,
  tempMin: 68.2,
  tempMax: 75.9,
  humidity: 40,
  windSpeed: 5.2,
  description: 'clear sky',
  icon: '01d',
  conditionMain: 'Clear',
  observedAt: 1_700_000_000,
};

describe('WeatherCard', () => {
  it('renders the location, rounded temperature, and conditions', () => {
    render(<WeatherCard weather={weather} source="search" />);

    expect(screen.getByRole('heading', { name: 'Austin, Texas, US' })).toBeInTheDocument();
    expect(screen.getByText('72°F')).toBeInTheDocument();
    expect(screen.getByText('Clear sky')).toBeInTheDocument();
    expect(screen.getByText('70°F')).toBeInTheDocument(); // feels like
    expect(screen.getByText('76° / 68°')).toBeInTheDocument(); // high / low
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('5 mph')).toBeInTheDocument();
  });

  it('shows the current-location badge only when sourced from geolocation', () => {
    const { rerender } = render(<WeatherCard weather={weather} source="current-location" />);
    expect(screen.getByText(/using your current location/i)).toBeInTheDocument();

    rerender(<WeatherCard weather={weather} source="search" />);
    expect(screen.queryByText(/using your current location/i)).not.toBeInTheDocument();
  });

  it('renders the weather icon with the cached source', () => {
    render(<WeatherCard weather={weather} source="search" />);

    const icon = screen.getByRole('img', { name: 'clear sky' });
    expect(icon).toHaveAttribute('src', 'mock://01d.png');
  });
});
