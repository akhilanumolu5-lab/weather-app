import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAutocomplete, type AutocompleteSuggestion } from '../hooks/useAutocomplete';

export interface SearchBarProps {
  onSearch: (city: string, stateCode?: string) => void;
  onSelectLocation?: (lat: number, lon: number) => void;
  isLoading: boolean;
}

const STATE_CODE_PATTERN = /^[A-Za-z]{2}$/;

export function SearchBar({ onSearch, onSelectLocation, isLoading }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const { suggestions, clearSuggestions } = useAutocomplete(value);
  const showDropdown = suggestions.length > 0;

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (inputContainerRef.current && !inputContainerRef.current.contains(event.target as Node)) {
        clearSuggestions();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [clearSuggestions]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') clearSuggestions();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError('Please enter a city name.');
      return;
    }

    const [cityPart, statePart] = trimmed.split(',').map((part) => part.trim());

    if (statePart && !STATE_CODE_PATTERN.test(statePart)) {
      setValidationError('State must be a two-letter code, e.g. "Austin, TX".');
      return;
    }

    setValidationError(null);
    onSearch(cityPart, statePart ? statePart.toUpperCase() : undefined);
    clearSuggestions();
  }

  function handleSuggestionClick(suggestion: AutocompleteSuggestion) {
    setValue(suggestion.name);
    clearSuggestions();
    setValidationError(null);
    if (onSelectLocation) {
      onSelectLocation(suggestion.lat, suggestion.lon);
    } else {
      onSearch(suggestion.name);
    }
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <label htmlFor="city-search" className="visually-hidden">
        Search for a US city
      </label>
      <div ref={inputContainerRef} className="search-input-container">
        <input
          id="city-search"
          name="city-search"
          type="text"
          placeholder="Search a US city, e.g. Austin, TX"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(clearSuggestions, 150)}
          disabled={isLoading}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'city-suggestions' : undefined}
          aria-expanded={showDropdown}
        />
        {showDropdown && (
          <ul id="city-suggestions" className="autocomplete-dropdown" role="listbox" aria-label="City suggestions">
            {suggestions.map((s, i) => (
              <li
                key={`${s.lat}-${s.lon}-${i}`}
                role="option"
                aria-selected={false}
                className="autocomplete-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(s);
                }}
              >
                {s.name}
                {s.state ? `, ${s.state}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Searching…' : 'Search'}
      </button>
      {validationError && (
        <p role="alert" className="field-error">
          {validationError}
        </p>
      )}
    </form>
  );
}
