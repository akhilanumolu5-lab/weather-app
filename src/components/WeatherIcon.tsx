import { useCachedIcon } from '../hooks/useCachedIcon';

export interface WeatherIconProps {
  iconCode: string;
  description: string;
}

/**
 * Renders a weather condition icon (https://openweathermap.org/weather-conditions),
 * served from the local cache after the first load via `useCachedIcon`.
 */
export function WeatherIcon({ iconCode, description }: WeatherIconProps) {
  const src = useCachedIcon(iconCode);

  if (!src) return null;

  return <img src={src} alt={description} className="weather-icon" width={100} height={100} />;
}
