import { isRequestError } from './errors';
import type { Client, HttpMethod } from './types';

/** `fetch`'s shape: an address and its `RequestInit`, a `Response` back. */
export type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

const METHODS = new Set<string>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS'
]);

/** What a body read by the client becomes again, for a `Response`. */
const asBody = (data: unknown): BodyInit | null => {
  if (data === undefined || data === null) return null;

  if (
    typeof data === 'string' ||
    (typeof Blob === 'function' && data instanceof Blob) ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    (typeof FormData === 'function' && data instanceof FormData) ||
    (typeof ReadableStream === 'function' && data instanceof ReadableStream)
  ) {
    return data as BodyInit;
  }

  return JSON.stringify(data);
};

/**
 * `fetch`, sent through a client: its middlewares (headers, retries, a cache,
 * a log) are on every call, and code written for `fetch` (a library that
 * takes one, a stream of events, a caller that reads `status` and `json()`)
 * keeps working unchanged.
 *
 * ```ts
 * const api = createClient({ adapter: fetchAdapter(), timeout: 0 });
 * const fetch = toFetch(api);
 * const res = await fetch('https://example.com/hook', { method: 'POST', body });
 * ```
 *
 * It behaves as `fetch` does, not as the client does:
 * - every status comes back as a `Response` (no `HttpError`), its body unread;
 * - a failure rejects as `fetch` would: an abort with the signal's reason, the
 *   client's own timeout with a `TimeoutError` `DOMException` (what
 *   `AbortSignal.timeout()` gives), no answer with the adapter's own error
 *   (`TypeError: fetch failed`);
 * - `method`, `headers`, `body` and `signal` are the request's; the rest of
 *   the init (`credentials`, `redirect`, `duplex`, …) goes to the adapter.
 *
 * The client's `timeout` still applies: give it `timeout: 0` for calls that
 * set their own limit with a signal, as `fetch` callers do.
 *
 * A middleware that answers by itself (a cache) has no `Response` to hand
 * on: its answer is made into one from its status, headers and data.
 * @param client - The client the calls go through
 */
export const toFetch =
  (client: Client): FetchLike =>
  async (input, init = {}) => {
    const { method = 'GET', headers, body, signal, ...rest } = init;
    const verb = method.toUpperCase();

    if (!METHODS.has(verb)) {
      throw new TypeError(`"${method}" is not a method the client sends.`);
    }

    let response;

    try {
      response = await client.request(verb as HttpMethod, String(input), {
        headers: new Headers(headers ?? {}),
        ...(body !== undefined && body !== null ? { body } : {}),
        ...(signal ? { signal } : {}),
        init: rest,
        responseType: 'stream',
        throwHttpErrors: false
      });
    } catch (error) {
      if (isRequestError(error)) {
        if (error.reason === 'abort' && signal?.aborted) throw signal.reason;

        if (error.reason === 'timeout') {
          throw new DOMException(error.message, 'TimeoutError');
        }

        if (error.cause !== undefined) throw error.cause;
      }

      throw error;
    }

    const { raw } = response;

    // A success is handed on unread. Any other status the client has read
    // (an error's body is read by its Content-Type): it comes back as the
    // same answer, with the body that was read.
    if (raw && !raw.bodyUsed) return raw;

    return new Response(asBody(response.data), {
      status: response.status,
      statusText: raw?.statusText ?? '',
      headers: response.headers
    });
  };
