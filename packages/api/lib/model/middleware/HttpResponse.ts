/**
 * Type representing the response from an HTTP request.
 *
 * This type is used to structure the data returned by an HTTP request. It includes
 * the payload of the response, the full response object, and the HTTP status code.
 *
 * @template T - The type of the response payload. Defaults to `any`.
 */
export type HttpResponse<T = any> = {
  /**
   * The payload of the response.
   *
   * This property contains the actual data returned in the response payload. It is often
   * the parsed JSON or text data received from the server. The type of the payload can vary
   * depending on the response content type and the type parameter `T`.
   */
  payload?: T;

  /**
   * The full response object.
   *
   * This property holds the full response object returned by the HTTP request. It includes
   * various details about the response, such as headers, status, status text, and more.
   * The type of the response object can vary depending on the request mechanism (e.g., Fetch, XHR).
   */
  response: any;

  /**
   * The HTTP status code of the response.
   *
   * This property contains the HTTP status code returned by the server. It indicates
   * the result of the request, such as 200 for a successful response or 404 for a not
   * found error. The status code is useful for conditional logic based on the outcome
   * of the request.
   */
  status: number;
};
