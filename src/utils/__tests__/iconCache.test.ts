import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedIconSrc, getIconUrl } from '../iconCache';

describe('getIconUrl', () => {
  it('builds the OpenWeatherMap icon CDN URL', () => {
    expect(getIconUrl('10d')).toBe('https://openweathermap.org/img/wn/10d@2x.png');
    expect(getIconUrl('10d', '4x')).toBe('https://openweathermap.org/img/wn/10d@4x.png');
  });
});

describe('getCachedIconSrc', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and caches the icon on first request, returning a blob URL', async () => {
    const fakeBlob = new Blob(['fake-image-bytes']);
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(fakeBlob, { status: 200 })
    );

    const src = await getCachedIconSrc('01d');

    expect(src.startsWith('blob:')).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('serves subsequent requests for the same icon from the cache without re-fetching', async () => {
    const fakeBlob = new Blob(['fake-image-bytes']);
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(fakeBlob, { status: 200 }));

    await getCachedIconSrc('02d');
    await getCachedIconSrc('02d');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the direct URL if the network request fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'));

    const src = await getCachedIconSrc('03d');

    expect(src).toBe(getIconUrl('03d'));
  });
});
