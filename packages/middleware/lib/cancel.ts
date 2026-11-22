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
  /** When each request was made, and how often everything had been cancelled by then. */
  const made = new WeakMap<RequestContext, { order: number; round: number }>();
  /** The latest request made for a key, also after it ended. */
  const latest = new Map<string, number>();
  let count = 0;
  let round = 0;

  const middleware: Middleware = async function cancel(context, next) {
    // Cancelled already, and passing by on its way out: it has no say
    if (context.signal.aborted) return next();

    let own = made.get(context);

    if (!own) {
      own = { order: (count += 1), round };
      made.set(context, own);
    }

    const key =
      getKey?.(context) ??
      `${context.method} ${context.url.origin}${context.url.pathname}`;

    // Sent again, after a token was refreshed, when a later request has
    // taken its place or everything was cancelled meanwhile: it gives way
    if (own.round !== round || (latest.get(key) ?? 0) > own.order) {
      context.abort();

      return next();
    }

    const other = underWay.get(key);

    if (other && other !== context) other.abort();

    underWay.set(key, context);
    // The newest key last, so that the oldest can be forgotten
    latest.delete(key);
    latest.set(key, own.order);

    if (latest.size > 1000) {
      latest.delete(latest.keys().next().value as string);
    }

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

      // Those that wait to be sent again are not under way: they see this
      round += 1;
      underWay.clear();
      all.forEach((context) => context.abort());
    }
  });
};
