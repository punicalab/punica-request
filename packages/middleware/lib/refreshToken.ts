import type { Middleware, RequestContext } from '@punica/request';

/** The options of `refreshToken`. */
export interface RefreshTokenOptions {
  /**
   * Gets a new token and puts it where the requests take it from. Return
   * `false` when there is none: the request is not sent again and its 401
   * is the answer. When it throws, the requests that wait reject with what
   * it threw. What it resolves with otherwise is not used: the request sent
   * again reads the token through `tokenAuth`, so store it where `getToken`
   * or the cookie looks.
   *
   * How the server knows who asks (the old token, a cookie, a refresh token)
   * is up to your API. With a token in a storage, sent by `tokenAuth`:
   *
   * ```ts
   * refresh: async () => {
   *   const { data } = await api.post<{ token: string }>('auth/refresh');
   *   localStorage.setItem('token', data.token);
   * }
   * ```
   *
   * with `exclude` naming `auth/refresh`, as it goes through the same client.
   */
  refresh: () => unknown | Promise<unknown>;
  /**
   * Requests whose 401 is the answer, without a refresh. When `refresh`
   * goes through the same client, name its request here: answered with a
   * 401 it would wait for itself.
   */
  exclude?: (context: RequestContext) => boolean;
}

/**
 * Answers a 401 by refreshing the token, once for all the requests that
 * failed meanwhile, and sends the request again. A request is sent again
 * once: a second 401 is its answer.
 *
 * It goes before `tokenAuth` in the list, so that the request it sends
 * again passes `tokenAuth` and takes the new token.
 *
 * ```ts
 * refreshToken({
 *   refresh: () => auth.refresh(),
 *   exclude: (context) => context.url.pathname.endsWith('/auth/refresh')
 * })
 * ```
 * @param options - How the token is refreshed
 */
export const refreshToken = (options: RefreshTokenOptions): Middleware => {
  const { refresh, exclude } = options ?? {};

  if (typeof refresh !== 'function') {
    throw new TypeError(
      'refreshToken needs a function that gets a new token: refreshToken({ refresh }).'
    );
  }

  /** The refresh that is under way, shared by the requests that need it. */
  let refreshing: Promise<boolean> | undefined;
  /** How many times the token has been refreshed. */
  let generation = 0;

  return async function refreshToken(context, next) {
    const sentWith = generation;
    const response = await next();

    if (response.status !== 401 || exclude?.(context)) return response;

    // Refreshed while this request was under way: its token was the old
    // one, and the new one is there already
    if (sentWith === generation) {
      refreshing ??= Promise.resolve()
        .then(refresh)
        .then((result) => {
          if (result === false) return false;

          generation += 1;

          return true;
        })
        .finally(() => {
          refreshing = undefined;
        });

      if (!(await refreshing)) return response;
    }

    return next();
  };
};
