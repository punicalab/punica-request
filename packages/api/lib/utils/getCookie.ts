/**
 *
 * @param key
 * @param cookie
 * @returns
 */
const getCookie = (key: string, cookie?: string): string => {
  cookie = cookie || (typeof globalThis !== 'undefined' ? document.cookie : '');

  const value: string = cookie.split('; ').find((row) => row.startsWith(key));

  if (value) {
    return value.split('=')[1];
  }

  return null;
};

export default getCookie;
