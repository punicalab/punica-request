/**
 * Sets a cookie in the browser.
 * @param key - The key or name of the cookie.
 * @param value - The value to be stored in the cookie.
 */
const setCookie = (key: string, value: unknown) => {
  // Check if 'globalThis' is defined (this is to ensure it works in browser environments)
  if (typeof globalThis !== 'undefined') {
    // Set the cookie by assigning it a value in the 'document.cookie' property.
    document.cookie = `${key}=${value}`;
  }
};

export default setCookie;
