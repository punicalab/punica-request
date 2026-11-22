import { getCookie } from '@punica/request';
import type { Middleware, RequestContext } from '@punica/request';

/** The options of `cookie`. */
export interface CookieOptions {
  /** The cookie whose value is sent. */
  cookieName: string;
  /** The header it is sent in. */
  headerName: string;
}

/**
 * Sends the value of a cookie in a header, a CSRF token for example. Without
 * the cookie the request goes as it is.
 *
 * ```ts
 * cookie({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })
 * ```
 * @param options - The cookie and the header
 */
export const cookie = (options: CookieOptions): Middleware => {
  const { cookieName, headerName } = options ?? {};

  if (!cookieName || !headerName) {
    throw new TypeError(
      'cookie needs both names: cookie({ cookieName, headerName }).'
    );
  }

  /** Requests this middleware gave the header to. */
  const given = new WeakSet<RequestContext>();

  return function cookie(context, next) {
    const value = getCookie(cookieName);

    if (value) {
      given.add(context);
      context.headers.set(headerName, value);
    } else if (given.has(context)) {
      // Sent again after the cookie was gone
      context.headers.delete(headerName);
    }

    return next();
  };
};
