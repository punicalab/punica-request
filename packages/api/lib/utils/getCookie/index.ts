/**
 * Retrieves the value of a cookie by its key.
 * @param key - The key of the cookie.
 * @param cookie - Optional. The cookie string to search in. If not provided, it will use document.cookie.
 * @returns The value of the cookie, or null if not found.
 */
const getCookie = (key: string, cookie: string = null): string => {
  let result;

  // If 'cookie' parameter is not provided, use document.cookie
  cookie = cookie || document.cookie;

  // Use regular expression to search for the cookie value by its key
  // It looks for a string in the format 'key=value'
  // If found, it captures the 'value' part
  // 'result' will be an array where the first element is the whole matched string
  // and the second element is the captured 'value'
  return (result = new RegExp(
    '(?:^|; )' + encodeURIComponent(key) + '=([^;]*)'
  ).exec(cookie))
    ? result[1] // If found, return the captured 'value'
    : null; // If not found, return null
};

export default getCookie;
