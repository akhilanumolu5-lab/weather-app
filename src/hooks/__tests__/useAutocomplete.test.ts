import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutocomplete } from '../useAutocomplete';

vi.mock('../../services/geocodingApi');
import { fetchAutocompleteSuggestions } from '../../services/geocodingApi';

const mockResults = [
  { name: 'Austin', state: 'Texas', country: 'US', lat: 30.27, lon: -97.74 },
  { name: 'Austin', state: 'Minnesota', country: 'US', lat: 43.67, lon: -92.97 },
];

describe('useAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(fetchAutocompleteSuggestions).mockResolvedValue(mockResults);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('starts with empty suggestions', () => {
    const { result } = renderHook(() => useAutocomplete(''));
    expect(result.current.suggestions).toEqual([]);
  });

  it('does not fetch for an empty query', async () => {
    renderHook(() => useAutocomplete(''));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  it('does not fetch before the 300ms debounce window', async () => {
    renderHook(() => useAutocomplete('Austin'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled();
  });

  it('fetches after 300ms and populates suggestions', async () => {
    const { result } = renderHook(() => useAutocomplete('Austin'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchAutocompleteSuggestions).toHaveBeenCalledWith('Austin');
    expect(result.current.suggestions).toHaveLength(2);
  });

  it('clears suggestions immediately when the query changes', async () => {
    const { result, rerender } = renderHook(({ q }) => useAutocomplete(q), {
      initialProps: { q: 'Austin' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.suggestions).toHaveLength(2);

    rerender({ q: 'Boston' });
    expect(result.current.suggestions).toEqual([]);
  });

  it('ignores stale responses when the query changes before the fetch resolves', async () => {
    let resolveFirst!: (v: typeof mockResults) => void;
    vi.mocked(fetchAutocompleteSuggestions)
      .mockImplementationOnce(() => new Promise((res) => { resolveFirst = res; }))
      .mockResolvedValue([{ name: 'Boston', state: 'Massachusetts', country: 'US', lat: 42.36, lon: -71.06 }]);

    const { result, rerender } = renderHook(({ q }) => useAutocomplete(q), {
      initialProps: { q: 'Aus' },
    });

    // Fire the timer for 'Aus' — fetch starts but is pending
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    // Change query → clear, new timer starts
    rerender({ q: 'Boston' });

    // Fire the timer for 'Boston' and let it resolve
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(result.current.suggestions[0]?.name).toBe('Boston');

    // Resolve the stale first request — should be ignored
    await act(async () => { resolveFirst(mockResults); });
    expect(result.current.suggestions[0]?.name).toBe('Boston');
  });

  it('clearSuggestions empties the list', async () => {
    const { result } = renderHook(() => useAutocomplete('Austin'));

    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(result.current.suggestions).toHaveLength(2);

    act(() => { result.current.clearSuggestions(); });

    expect(result.current.suggestions).toEqual([]);
  });

  it('silently ignores fetch errors and leaves suggestions empty', async () => {
    vi.mocked(fetchAutocompleteSuggestions).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAutocomplete('Austin'));

    await act(async () => { await vi.advanceTimersByTimeAsync(300); });

    expect(fetchAutocompleteSuggestions).toHaveBeenCalled();
    expect(result.current.suggestions).toEqual([]);
  });
});
