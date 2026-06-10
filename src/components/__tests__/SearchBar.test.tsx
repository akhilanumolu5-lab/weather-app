import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

vi.mock('../../hooks/useAutocomplete');
import { useAutocomplete } from '../../hooks/useAutocomplete';

const noSuggestions = { suggestions: [], clearSuggestions: vi.fn() };

const austinSuggestion = { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 };
const mnSuggestion = { name: 'Austin', state: 'Minnesota', country: 'US', lat: 43.67, lon: -92.97 };

describe('SearchBar', () => {
  beforeEach(() => {
    vi.mocked(useAutocomplete).mockReturnValue(noSuggestions);
  });

  it('submits the city name alone when no state is given', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} isLoading={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'Austin');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('Austin', undefined);
  });

  it('splits "City, ST" into city and uppercased state code', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} isLoading={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'Austin, tx');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith('Austin', 'TX');
  });

  it('shows a validation error and does not submit for an empty query', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} isLoading={false} />);

    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a city name/i);
  });

  it('shows a validation error for an invalid state code', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} isLoading={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'Austin, Texas');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/two-letter code/i);
  });

  it('disables the input and button while loading', () => {
    render(<SearchBar onSearch={vi.fn()} isLoading={true} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
  });

  describe('autocomplete dropdown', () => {
    it('shows suggestions as a dropdown when the hook returns results', () => {
      const clearSuggestions = vi.fn();
      vi.mocked(useAutocomplete).mockReturnValue({
        suggestions: [austinSuggestion, mnSuggestion],
        clearSuggestions,
      });

      render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(2);
      expect(screen.getByText('Austin, Texas')).toBeInTheDocument();
      expect(screen.getByText('Austin, Minnesota')).toBeInTheDocument();
    });

    it('hides the dropdown when there are no suggestions', () => {
      vi.mocked(useAutocomplete).mockReturnValue(noSuggestions);

      render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('calls onSelectLocation with coordinates when a suggestion is clicked', async () => {
      const onSelectLocation = vi.fn();
      const clearSuggestions = vi.fn();
      vi.mocked(useAutocomplete).mockReturnValue({ suggestions: [austinSuggestion], clearSuggestions });

      render(<SearchBar onSearch={vi.fn()} onSelectLocation={onSelectLocation} isLoading={false} />);

      await userEvent.click(screen.getByRole('option', { name: 'Austin, Texas' }));

      expect(onSelectLocation).toHaveBeenCalledWith(30.27, -97.74);
      expect(clearSuggestions).toHaveBeenCalled();
    });

    it('falls back to onSearch(cityName) when onSelectLocation is not provided', async () => {
      const onSearch = vi.fn();
      vi.mocked(useAutocomplete).mockReturnValue({ suggestions: [austinSuggestion], clearSuggestions: vi.fn() });

      render(<SearchBar onSearch={onSearch} isLoading={false} />);

      await userEvent.click(screen.getByRole('option', { name: 'Austin, Texas' }));

      expect(onSearch).toHaveBeenCalledWith('Austin');
    });

    it('clears suggestions when the input loses focus (after 150 ms delay)', () => {
      vi.useFakeTimers();
      try {
        const clearSuggestions = vi.fn();
        vi.mocked(useAutocomplete).mockReturnValue({ suggestions: [austinSuggestion], clearSuggestions });

        render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

        fireEvent.blur(screen.getByRole('textbox'));
        expect(clearSuggestions).not.toHaveBeenCalled();

        vi.advanceTimersByTime(150);
        expect(clearSuggestions).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('clears suggestions when Escape is pressed', async () => {
      const clearSuggestions = vi.fn();
      vi.mocked(useAutocomplete).mockReturnValue({ suggestions: [austinSuggestion], clearSuggestions });

      render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

      await userEvent.type(screen.getByRole('textbox'), '{Escape}');

      expect(clearSuggestions).toHaveBeenCalled();
    });

    it('clears suggestions when the form is submitted', async () => {
      const clearSuggestions = vi.fn();
      vi.mocked(useAutocomplete).mockReturnValue({ suggestions: [austinSuggestion], clearSuggestions });

      render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

      await userEvent.type(screen.getByRole('textbox'), 'Austin');
      await userEvent.click(screen.getByRole('button', { name: /search/i }));

      expect(clearSuggestions).toHaveBeenCalled();
    });

    it('omits the state label when the suggestion has no state', () => {
      vi.mocked(useAutocomplete).mockReturnValue({
        suggestions: [{ name: 'Austin', country: 'US', lat: 30.27, lon: -97.74 }],
        clearSuggestions: vi.fn(),
      });

      render(<SearchBar onSearch={vi.fn()} isLoading={false} />);

      expect(screen.getByRole('option')).toHaveTextContent('Austin');
      expect(screen.getByRole('option')).not.toHaveTextContent(',');
    });
  });
});
