import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAutocompleteSuggestions } from '../services/geocodingApi';
import type { OwmGeocodingResult } from '../types/weather';

export type AutocompleteSuggestion = Pick<OwmGeocodingResult, 'name' | 'state' | 'country' | 'lat' | 'lon'>;

export function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuggestions([]);
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(() => {
      const id = ++requestIdRef.current;
      fetchAutocompleteSuggestions(trimmed)
        .then((results) => {
          if (requestIdRef.current === id) setSuggestions(results);
        })
        .catch(() => {
          if (requestIdRef.current === id) setSuggestions([]);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, clearSuggestions };
}
