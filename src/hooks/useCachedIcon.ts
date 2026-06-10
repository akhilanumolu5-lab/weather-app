import { useEffect, useState } from 'react';
import { getCachedIconSrc, getIconUrl } from '../utils/iconCache';

interface CachedIcon {
  code: string;
  src: string;
}

/**
 * Resolves a displayable `src` for a weather icon, transparently caching the
 * image via the Cache Storage API (see `utils/iconCache.ts`).
 *
 * Until the cached version is resolved (or for an icon that has never been
 * requested before), returns the direct CDN URL so the `<img>` has something
 * to render immediately. The `code` field on the cached result is checked
 * against the current `iconCode` so that a stale blob URL from a previous
 * icon is never shown while a new one is loading.
 */
export function useCachedIcon(iconCode: string | undefined): string | undefined {
  const [cached, setCached] = useState<CachedIcon | undefined>(undefined);

  useEffect(() => {
    if (!iconCode) return;

    let cancelled = false;
    let objectUrl: string | undefined;

    getCachedIconSrc(iconCode).then((resolved) => {
      if (cancelled) return;
      if (resolved.startsWith('blob:')) {
        objectUrl = resolved;
      }
      setCached({ code: iconCode, src: resolved });
    });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [iconCode]);

  if (!iconCode) return undefined;

  return cached?.code === iconCode ? cached.src : getIconUrl(iconCode);
}
