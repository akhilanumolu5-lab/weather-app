/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenWeatherMap API key - see .env.example */
  readonly VITE_OPENWEATHER_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
