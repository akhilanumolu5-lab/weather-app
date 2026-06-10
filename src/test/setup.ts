import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the Cache Storage API used by `utils/iconCache.ts`.
// Provide a minimal in-memory stub so icon-related code can run under tests
// without special-casing "are we in a browser" logic in app code.
if (typeof globalThis.caches === 'undefined') {
  const stores = new Map<string, Map<string, Response>>();

  globalThis.caches = {
    open: async (name: string) => {
      if (!stores.has(name)) {
        stores.set(name, new Map());
      }
      const store = stores.get(name)!;

      return {
        match: async (request: RequestInfo | URL) => store.get(String(request)),
        put: async (request: RequestInfo | URL, response: Response) => {
          store.set(String(request), response);
        },
      } as unknown as Cache;
    },
  } as unknown as CacheStorage;
}

// jsdom doesn't implement URL.createObjectURL/revokeObjectURL.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url';
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
