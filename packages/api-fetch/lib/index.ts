import type { Adapter } from '@punica/request';

/** The options of the fetch adapter. */
export interface FetchAdapterOptions {
  /**
   * The `fetch` that sends the requests. By default the global one, looked
   * up for every request.
   */
  fetch?: typeof fetch;
}

/**
 * Sends requests with `fetch`: in browsers, in Node 18 and later, in workers
 * and wherever else `fetch` exists.
 *
 * ```ts
 * const api = createClient({ baseURL, adapter: fetchAdapter() });
 * ```
 * @param options - The options of the adapter
 */
export const fetchAdapter =
  (options: FetchAdapterOptions = {}): Adapter =>
  (context) => {
    const send = options.fetch ?? globalThis.fetch;

    if (typeof send !== 'function') {
      throw new TypeError(
        'There is no fetch here. Give one to the adapter, fetchAdapter({ fetch }), or use httpAdapter() of @punica/request-http.'
      );
    }

    return send(context.url.href, {
      ...context.init,
      method: context.method,
      headers: context.headers,
      body: context.body,
      signal: context.signal
    });
  };
