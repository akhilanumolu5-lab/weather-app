# Weather App

A React + TypeScript weather app powered by the [OpenWeatherMap API](https://openweathermap.org/api).

## Features

- Search weather by city name
- Detect current location via the browser Geolocation API
- Displays temperature, humidity, wind speed, "feels like", and weather icon
- Recent location history persisted in `localStorage`
- Icon caching to avoid redundant network requests

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Add your API key

Copy `.env.example` to `.env` and fill in your OpenWeatherMap key:

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

Get a free key at <https://openweathermap.org/api>. New keys can take up to a couple of hours to activate.

### 3. Run the dev server

```bash
npm run dev
```

Open <http://localhost:5173> in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the full test suite (Vitest) |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
├── App.tsx              # Root component
├── components/          # React UI components
│   ├── SearchBar.tsx
│   ├── WeatherCard.tsx
│   ├── StatusMessage.tsx
│   └── WeatherIcon.tsx
├── hooks/               # Custom React hooks
│   ├── useWeather.ts
│   ├── useGeolocation.ts
│   └── useCachedIcon.ts
├── services/            # API clients and configuration
│   ├── config.ts
│   ├── errors.ts
│   ├── httpClient.ts
│   ├── geocodingApi.ts
│   ├── weatherApi.ts
│   └── weatherService.ts
├── types/
│   └── weather.ts       # Shared TypeScript types
└── utils/
    ├── format.ts        # Unit/display formatting helpers
    ├── iconCache.ts     # Icon cache (Cache Storage API)
    └── locationStorage.ts  # localStorage helpers
```

## Tech stack

- **React 19** with TypeScript
- **Vite 8** for build tooling
- **Vitest** + **Testing Library** for tests
- **OpenWeatherMap** Current Weather + Geocoding APIs
