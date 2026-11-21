import { getCookie } from '@punica/request';
import type { Middleware } from '@punica/request';

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

  return function cookie(context, next) {
    const value = getCookie(cookieName);

    if (value) context.headers.set(headerName, value);

    return next();
  };
};
