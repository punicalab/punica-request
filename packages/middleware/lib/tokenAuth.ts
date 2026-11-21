import { getCookie } from '@punica/request';
import type { Middleware, RequestContext } from '@punica/request';

/** The options of `tokenAuth`. One of `cookieName` and `getToken` is needed. */
export interface TokenAuthOptions {
  /** The cookie the token is read from, for every request. */
  cookieName?: string;
  /**
   * Gives the token, for every request: from memory, from a storage, from
   * anywhere. Used instead of the cookie.
   */
  getToken?: (
    context: RequestContext
  ) => string | null | undefined | Promise<string | null | undefined>;
  /** The header the token is sent in. `Authorization` by default. */
  headerName?: string;
  /** What is sent, with `${token}` for the token. `Bearer ${token}` by default. */
  tokenFormat?: string;
}

/**
 * Sends a token with every request. Without a token the request goes as it
 * is.
 *
 * ```ts
 * tokenAuth({ cookieName: 'token' })
 * tokenAuth({ getToken: () => session.accessToken })
 * ```
 * @param options - Where the token comes from and how it is sent
 */
export const tokenAuth = (options: TokenAuthOptions): Middleware => {
  const {
    cookieName,
    getToken,
    headerName = 'Authorization',
    tokenFormat = 'Bearer ${token}'
  } = options ?? {};

  if (!cookieName && typeof getToken !== 'function') {
    throw new TypeError(
      'tokenAuth needs to know where the token is: tokenAuth({ cookieName }) or tokenAuth({ getToken }).'
    );
  }

  /** Requests this middleware gave the header to. */
  const given = new WeakSet<RequestContext>();

  return async function tokenAuth(context, next) {
    const token = getToken
      ? await getToken(context)
      : getCookie(cookieName as string);

    if (!token) {
      // Sent again after the token was gone: the old one does not go along
      if (given.has(context)) context.headers.delete(headerName);
    } else {
      given.add(context);

      // Set, not appended: a request that is sent again carries one token,
      // the one of that moment
      context.headers.set(
        headerName,
        tokenFormat.replace('${token}', () => token)
      );
    }

    return next();
  };
};
