/**
 * Retrieves the value of a cookie with the specified key from the given cookie string or document.cookie.
 * @param key - The name of the cookie to retrieve.
 * @param cookie - Optional. The cookie string to search within. If not provided, document.cookie is used.
 * @returns The value of the cookie if found; otherwise, returns null.
 */
export const getCookie = (
  key: string,
  cookie: string = null
): string | null => {
  let result;

  // Use the provided cookie string or default to document.cookie
  cookie = cookie || document.cookie;

  // Use a regular expression to search for the cookie value
  // eslint-disable-next-line no-cond-assign
  return (result = new RegExp(
    '(?:^|; )' + encodeURIComponent(key) + '=([^;]*)'
  ).exec(cookie))
    ? decodeURIComponent(result[1]) // Decode the cookie value
    : null; // Return null if the cookie with the specified key is not found
};
