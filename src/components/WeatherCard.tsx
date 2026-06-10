import { WeatherIcon } from './WeatherIcon';
import { capitalize, formatLocationLabel, formatObservedTime } from '../utils/format';
import type { WeatherSource } from '../hooks/useWeather';
import type { WeatherSummary } from '../types/weather';

export interface WeatherCardProps {
  weather: WeatherSummary;
  source: WeatherSource;
}

/** Displays the current conditions for a resolved location. */
export function WeatherCard({ weather, source }: WeatherCardProps) {
  const { location, temperature, feelsLike, tempMin, tempMax, humidity, windSpeed, description, icon, observedAt } =
    weather;

  const locationLabel = formatLocationLabel([location.name, location.state, location.country]);

  return (
    <section className="weather-card" aria-live="polite">
      <header className="weather-card__header">
        <h2>{locationLabel || 'Current Location'}</h2>
        {source === 'current-location' && <p className="weather-card__badge">Using your current location</p>}
      </header>

      <div className="weather-card__main">
        <WeatherIcon iconCode={icon} description={description} />
        <p className="weather-card__temperature">{Math.round(temperature)}°F</p>
      </div>

      <p className="weather-card__description">{capitalize(description)}</p>

      <dl className="weather-card__details">
        <div>
          <dt>Feels like</dt>
          <dd>{Math.round(feelsLike)}°F</dd>
        </div>
        <div>
          <dt>High / Low</dt>
          <dd>
            {Math.round(tempMax)}° / {Math.round(tempMin)}°
          </dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{humidity}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>{Math.round(windSpeed)} mph</dd>
        </div>
      </dl>

      <p className="weather-card__observed-at">As of {formatObservedTime(observedAt)}</p>
    </section>
  );
}
