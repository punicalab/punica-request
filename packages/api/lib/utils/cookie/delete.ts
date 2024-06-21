/**
 * Deletes a cookie with the specified key by setting its expiration date to a past time.
 * @param key - The name of the cookie to delete.
 */
export const deleteCookie = (key: string) => {
  // Check if the environment supports globalThis (typically browser environment)
  if (typeof document !== 'undefined') {
    // Set the cookie with the same key to expire immediately (Thu, 01 Jan 1970 00:00:01 GMT)
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
  }
};
