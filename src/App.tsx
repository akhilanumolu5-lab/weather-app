import { SearchBar } from './components/SearchBar';
import { StatusMessage } from './components/StatusMessage';
import { WeatherCard } from './components/WeatherCard';
import { useWeather } from './hooks/useWeather';
import { hasApiKey } from './services/config';
import './App.css';

function App() {
  const { status, data, errorMessage, source, needsManualSearch, searchCity, searchByCoordinates, useCurrentLocation } = useWeather();
  const isLoading = status === 'loading';

  return (
    <main className="app">
      <h1>Weather</h1>

      {!hasApiKey() && (
        <StatusMessage
          variant="error"
          message="No OpenWeatherMap API key configured. Copy .env.example to .env and add VITE_OPENWEATHER_API_KEY."
        />
      )}

      <SearchBar onSearch={searchCity} onSelectLocation={searchByCoordinates} isLoading={isLoading} />

      <button type="button" className="location-button" onClick={useCurrentLocation} disabled={isLoading}>
        Use my current location
      </button>

      {isLoading && <StatusMessage message="Loading weather…" />}

      {status === 'error' && errorMessage && <StatusMessage variant="error" message={errorMessage} />}

      {needsManualSearch && status !== 'success' && status !== 'loading' && (
        <StatusMessage message="We couldn't access your location. Search for a US city above to get started." />
      )}

      {data && <WeatherCard weather={data} source={source} />}
    </main>
  );
}

export default App;
