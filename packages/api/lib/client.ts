import { assertBody, mergeHeaders, prepareBody } from './body';
import { HttpError, RequestError, isRequestError } from './errors';
import { readResponse } from './read';
import { createAbort } from './signal';
import type {
  Client,
  ClientConfig,
  HttpMethod,
  HttpResponse,
  Middleware,
  RequestContext,
  RequestOptions
} from './types';
import { buildURL, resolveBase } from './url';

const noop = () => undefined;

/**
 * The same stream, with a call when nothing is read from it any more: it
 * ended, failed or was cancelled.
 */
const watch = (
  source: ReadableStream<Uint8Array>,
  over: () => void
): ReadableStream<Uint8Array> => {
  const reader = source.getReader();
  let told = false;
  const end = () => {
    if (!told) over();

    told = true;
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          end();
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        end();
        controller.error(error);
      }
    },
    cancel(reason) {
      end();

      return reader.cancel(reason);
    }
  });
};

const isResponse = (value: unknown): value is HttpResponse =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as HttpResponse).status === 'number';

/**
 * Creates a client.
 *
 * ```ts
 * const api = createClient({
 *   baseURL: 'https://api.example.com/v1',
 *   adapter: fetchAdapter(),
 *   middlewares: [tokenAuth({ cookieName: 'token' })]
 * });
 *
 * const { data } = await api.get<Item[]>('items', { query: { page: 2 } });
 * ```
 *
 * A path is joined to `baseURL` whatever slashes either has (`'items'` and
 * `'/items'` both give `…/v1/items`, also when `baseURL` ends in `/`); a
 * path that leads out of it is refused. `baseURL: '/api'` works in a page
 * only.
 *
 * A request passes the middlewares from the first to the last, is sent by
 * the adapter, and its response passes them back from the last to the
 * first. A response outside 2xx rejects with an `HttpError` once it has
 * passed them all.
 * @param config - The configuration of the client
 */
export const createClient = (config: ClientConfig): Client => {
  if (!config || typeof config.adapter !== 'function') {
    throw new TypeError(
      'createClient needs an adapter, a function that sends the request: createClient({ adapter: fetchAdapter() }).'
    );
  }

  const { adapter } = config;
  const base = resolveBase(config.baseURL);
  const middlewares: ReadonlyArray<Middleware> = [
    ...(config.middlewares ?? [])
  ];

  middlewares.forEach((middleware, index) => {
    if (typeof middleware !== 'function') {
      throw new TypeError(
        `middlewares[${index}] is not a function. A middleware is (context, next) => Promise<HttpResponse>; those of @punica/request-middleware are made by calling them: tokenAuth({ … }).`
      );
    }
  });

  const request = async <T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> => {
    const own = mergeHeaders(options.headers);
    const headers = mergeHeaders(config.headers, options.headers);
    const url = buildURL(base, path, options.query);
    const body = prepareBody(method, options, headers, own);
    const timeout = options.timeout ?? config.timeout;
    const abort = createAbort(options.signal, timeout);

    const context = {
      url,
      headers,
      body,
      responseType: options.responseType,
      init: { ...config.init, ...options.init }
    } as RequestContext;

    // What the client owns cannot be replaced by a middleware
    const fixed = {
      method,
      options,
      requestHeaders: own,
      signal: abort.signal,
      abort: abort.abort,
      throwHttpErrors: options.throwHttpErrors ?? config.throwHttpErrors ?? true
    };

    for (const name of Object.keys(fixed) as Array<keyof typeof fixed>) {
      Object.defineProperty(context, name, {
        value: fixed[name],
        enumerable: true,
        writable: false,
        configurable: false
      });
    }

    /** Why the request is over, once its signal is aborted. */
    const aborted = () =>
      new RequestError(
        abort.timedOut ? 'timeout' : 'abort',
        context,
        abort.signal.reason
      );

    /** The innermost step: the request is sent and its response read. */
    const send = async (): Promise<HttpResponse> => {
      if (abort.signal.aborted) throw aborted();

      // A middleware may have given the request another body
      assertBody(method, context.body);

      /** No response, or one that could not be read to its end. */
      const failed = (error: unknown) => {
        if (abort.signal.aborted) return aborted();

        return isRequestError(error)
          ? error
          : new RequestError('network', context, error);
      };

      let raw: Response;

      try {
        raw = await adapter(context);
      } catch (error) {
        throw failed(error);
      }

      if (!raw || typeof raw.status !== 'number') {
        throw new TypeError(
          'The adapter did not return a Response. An adapter is (context) => Promise<Response>.'
        );
      }

      try {
        return await readResponse(raw, context);
      } catch (error) {
        throw failed(error);
      }
    };

    const dispatch = (index: number): Promise<HttpResponse> => {
      if (index === middlewares.length) return send();

      const middleware = middlewares[index];

      return Promise.resolve()
        .then(() => middleware(context, () => dispatch(index + 1)))
        .then((response) => {
          if (!isResponse(response)) {
            throw new TypeError(
              `The middleware ${middleware.name || `at middlewares[${index}]`} returned no response. A middleware returns what next() gives, or a response of its own: return next().`
            );
          }

          return response;
        });
    };

    let reading = false;

    try {
      if (abort.signal.aborted) throw aborted();

      // Whatever a middleware is waiting for, an aborted request is over
      const cancelled = new Promise<never>((_, reject) => {
        abort.signal.addEventListener('abort', () => reject(aborted()), {
          once: true
        });
      });
      const chain = dispatch(0);

      // The one that loses the race may still reject, with nobody listening
      cancelled.catch(noop);
      chain.catch(noop);

      const response = await Promise.race([chain, cancelled]);

      if (!response.ok && context.throwHttpErrors) {
        throw new HttpError(response, context);
      }

      // A stream is read after the request: its caller can still cancel
      // it, until it has been read or given up
      const stream = response.data;

      if (
        typeof ReadableStream === 'function' &&
        stream instanceof ReadableStream &&
        !stream.locked
      ) {
        response.data = watch(stream, abort.dispose);
        reading = true;
      }

      return response as HttpResponse<T>;
    } finally {
      if (reading) abort.clearTimer();
      else abort.dispose();
    }
  };

  return {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    patch: (path, options) => request('PATCH', path, options),
    delete: (path, options) => request('DELETE', path, options),
    head: (path, options) => request<undefined>('HEAD', path, options)
  };
};
