/**
 * Checks if the HTTP status code represents a successful response (OK).
 * @param status - The HTTP status code to check.
 * @returns True if the status code is within the range 200 to 299 (inclusive), false otherwise.
 */
export const isHttpStatusOk = (status: number): boolean => {
  return status >= 200 && status <= 299;
};
