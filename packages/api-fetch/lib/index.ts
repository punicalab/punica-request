import type { Adapter } from '@punica/request';

/** The options of the fetch adapter. */
export interface FetchAdapterOptions {
  /**
   * The `fetch` that sends the requests. By default the global one, looked
   * up for every request.
   */
  fetch?: typeof fetch;
}

/** Base64 of a text, as bytes of UTF-8. */
const toBase64 = (text: string): string =>
  btoa(
    Array.from(new TextEncoder().encode(text), (byte) =>
      String.fromCharCode(byte)
    ).join('')
  );

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

    let { url, headers } = context;

    // fetch refuses an address that holds credentials: they go in a header
    if (url.username || url.password) {
      const credentials = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;

      url = new URL(url.href);
      url.username = '';
      url.password = '';
      headers = new Headers(headers);

      if (!headers.has('authorization')) {
        headers.set('authorization', `Basic ${toBase64(credentials)}`);
      }
    }

    return send(url.href, {
      ...context.init,
      method: context.method,
      headers,
      body: context.body,
      signal: context.signal
    });
  };
