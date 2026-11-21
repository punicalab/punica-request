import type { Middleware, RequestContext } from '@punica/request';

/** The options of `cancel`. */
export interface CancelOptions {
  /**
   * What makes two requests the same one, so that the later cancels the
   * earlier. By default their method and their address without its query: a
   * new search cancels the one before it. Return `context.url.href` with
   * the method to let requests that differ in their query run side by side.
   */
  getKey?: (context: RequestContext) => string;
}

/** The middleware `cancel` makes, with what cancels everything. */
export interface CancelMiddleware extends Middleware {
  /** Cancels every request that is under way. */
  cancelAll(): void;
}

/**
 * Keeps the latest of the requests that are the same one: sending it again
 * cancels the one before, which rejects with a `RequestError` of reason
 * `abort`.
 *
 * ```ts
 * const latest = cancel();
 * const api = createClient({ …, middlewares: [latest] });
 *
 * latest.cancelAll(); // when the user leaves the page, say
 * ```
 * @param options - What counts as the same request
 */
export const cancel = (options: CancelOptions = {}): CancelMiddleware => {
  const { getKey } = options;
  const underWay = new Map<string, RequestContext>();

  const middleware: Middleware = async function cancel(context, next) {
    const key =
      getKey?.(context) ??
      `${context.method} ${context.url.origin}${context.url.pathname}`;
    const earlier = underWay.get(key);

    // The request itself, sent again after a token was refreshed, is not
    // an earlier one
    if (earlier && earlier !== context) earlier.abort();

    underWay.set(key, context);

    try {
      return await next();
    } finally {
      // However it ended. A later request may have taken its place
      if (underWay.get(key) === context) underWay.delete(key);
    }
  };

  return Object.assign(middleware, {
    cancelAll() {
      const all = [...underWay.values()];

      underWay.clear();
      all.forEach((context) => context.abort());
    }
  });
};
