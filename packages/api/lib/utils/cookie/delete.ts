/**
 * Deletes a cookie by setting its expiration date to a past time.
 *
 * Note:
 * - To successfully delete a cookie, the options (domain, path, secure, sameSite)
 *   must match the attributes used when the cookie was originally set.
 * - If the cookie was created with a specific domain or path and those are not
 *   provided here, the browser may treat this as a different cookie and the
 *   original one will remain.
 *
 * @param key - The name of the cookie to delete.
 * @param options - Optional parameters to ensure proper deletion:
 *                  - domain: The domain for which the cookie was set.
 *                  - path: The path for which the cookie was set.
 *                  - secure: Indicates if the cookie was set as secure.
 *                  - sameSite: The SameSite policy used when setting the cookie.
 */
export const deleteCookie = (
  key: string,
  options?: {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }
) => {
  if (typeof document !== 'undefined') {
    // Start building the cookie string with an expired date
    let cookieString = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT`;

    if (options) {
      // Append attributes to match the original cookie definition
      if (options.domain) {
        cookieString += `; domain=${options.domain}`;
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
    } else {
      // Default to path=/ to target most cookies
      cookieString += `; path=/`;
    }

    // Set the cookie string, which instructs the browser to delete it
    document.cookie = cookieString;
  }
};
