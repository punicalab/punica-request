import type { HttpResponse, Middleware, RequestContext } from '@punica/request';
import type { CacheEntry, IStorage } from './storage';

export * from './storage';
export * from './session';
export * from './indexedDB';

declare module '@punica/request' {
  interface RequestOptions {
    /**
     * Answers the request from the cache, and keeps its response there.
     * `ttl` is how many milliseconds the response is good for; without it,
     * for as long as the storage keeps it. Needs the `cache` middleware.
     */
    cache?: boolean | { ttl?: number };
  }
}

/** The options of `cache`. */
export interface CacheOptions {
  /** Where the responses are kept: `StorageSession`, `StorageIndexedDB` or your own. */
  storage: IStorage;
  /**
   * What a response is kept under. By default how it is read and its whole
   * address. Add what else decides the answer, the user for example.
   */
  getKey?: (context: RequestContext) => string;
}

/**
 * Answers `GET` requests that ask for it from a cache.
 *
 * ```ts
 * const api = createClient({ …, middlewares: [cache({ storage: new StorageSession() })] });
 *
 * await api.get('countries', { cache: { ttl: 60_000 } });
 * ```
 *
 * Only responses within 2xx are kept. A cache that cannot be read or
 * written never fails a request: the request is sent.
 * @param options - Where the responses are kept
 */
export const cache = (options: CacheOptions): Middleware => {
  const { storage, getKey } = options ?? {};

  if (
    !storage ||
    typeof storage.get !== 'function' ||
    typeof storage.set !== 'function'
  ) {
    throw new TypeError(
      'cache needs a storage with get and set: cache({ storage: new StorageSession() }).'
    );
  }

  return async function cache(context, next) {
    const asked = context.options.cache;

    // A stream is read once, by the caller: there is nothing to keep
    if (
      !asked ||
      context.method !== 'GET' ||
      context.responseType === 'stream'
    ) {
      return next();
    }

    // The same address read as text and as JSON are two answers
    const key =
      getKey?.(context) ?? `${context.responseType ?? ''} ${context.url.href}`;
    let entry: CacheEntry | null | undefined;

    try {
      entry = await storage.get(key);

      if (
        entry &&
        entry.expiresAt !== undefined &&
        Date.now() >= entry.expiresAt
      ) {
        entry = undefined;
        await storage.delete?.(key);
      }
    } catch {
      // A cache that cannot be read is an empty one: the request is sent
    }

    if (entry) {
      return {
        ok: true,
        status: entry.status,
        headers: new Headers(entry.headers),
        data: entry.data
      };
    }

    const response: HttpResponse = await next();

    if (response.ok) {
      const ttl = typeof asked === 'object' ? asked.ttl : undefined;
      const headers: Array<[string, string]> = [];

      response.headers.forEach((value, name) => headers.push([name, value]));

      try {
        await storage.set(key, {
          status: response.status,
          headers,
          data: response.data,
          ...(ttl && ttl > 0 ? { expiresAt: Date.now() + ttl } : {})
        });
      } catch {
        // The response is what was asked for; the cache is a convenience
      }
    }

    return response;
  };
};
