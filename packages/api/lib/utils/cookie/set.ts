/**
 * Sets a browser cookie with the specified key, value, and optional parameters.
 * @param key - The name of the cookie.
 * @param value - The value to store in the cookie.
 * @param options - Optional parameters for the cookie:
 *                  - domain: The domain for which the cookie is valid.
 *                  - expires: The expiration date and time for the cookie.
 *                  - path: The path within the domain for which the cookie is valid.
 *                  - secure: Indicates if the cookie should only be transmitted over secure protocols (e.g., HTTPS).
 *                  - sameSite: Controls when cookies are sent with cross-origin requests.
 */
export const setCookie = (
  key: string,
  value: string,
  options?: {
    domain?: string;
    expires?: Date | string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }
) => {
  if (typeof document !== 'undefined') {
    let cookieString = `${key}=${encodeURIComponent(value)}`;

    if (options) {
      if (options.domain) {
        cookieString += `; domain=${options.domain}`;
      }

      if (options.expires) {
        const expires =
          options.expires instanceof Date
            ? options.expires.toUTCString()
            : options.expires;
        cookieString += `; expires=${expires}`;
      }

      if (options.path) {
        cookieString += `; path=${options.path}`;
      }

      if (options.secure) {
        cookieString += `; secure`;
      }

      if (options.sameSite) {
        cookieString += `; SameSite=${options.sameSite}`;
      }
    }

    document.cookie = cookieString;
  }
};
