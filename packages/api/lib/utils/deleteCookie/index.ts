import { setCookie } from '..';

/**
 * Deletes a cookie by setting its expiration date to a past time.
 * @param key - The key of the cookie to be deleted.
 */
const deleteCookie = (key: string) => {
  // Check if 'globalThis' is defined (this is to ensure it works in both browser and Node.js environments)
  if (typeof globalThis !== 'undefined') {
    // Set the cookie's expiration date to a past time (Thu, 01 Jan 1970 00:00:01 GMT)
    setCookie(key, ';expires=Thu, 01 Jan 1970 00:00:01 GMT');
  }
};

export default deleteCookie;
