import { IConfig, RequestParams, IPatch, HttpResponse } from '..';

/**
 * Interface representing a request object.
 *
 * This interface defines the structure of a request object, including the configuration
 * information and various methods for making HTTP requests (GET, DELETE, POST, PUT, PATCH).
 * Each method returns a Promise that resolves to an `HttpResponse` object.
 */
export interface IRequest {
  /**
   * Configuration information for the request.
   *
   * This property contains the configuration settings used for making the request.
   * It includes details such as headers, method, base URL, and any other settings
   * required to configure the request properly.
   *
   * @type {IConfig}
   */
  config: IConfig;

  /**
   * Function for making a GET request.
   *
   * This method is used to make a GET request to the specified endpoint with the given parameters.
   * It returns a Promise that resolves to an `HttpResponse` object containing the response data.
   *
   * @template T - The type of the request parameters. Defaults to `any`.
   * @template R - The type of the response body. Defaults to `any`.
   * @param {RequestParams<T>} params - The parameters for the GET request, including endpoint path,
   * query parameters, headers, and any other settings.
   * @returns {Promise<HttpResponse<R>>} A Promise that resolves to an `HttpResponse` object.
   */
  get<T = any, R = any>(params: RequestParams<T>): Promise<HttpResponse<R>>;

  /**
   * Function for making a DELETE request.
   *
   * This method is used to make a DELETE request to the specified endpoint with the given parameters.
   * It returns a Promise that resolves to an `HttpResponse` object containing the response data.
   *
   * @template T - The type of the request parameters. Defaults to `any`.
   * @template R - The type of the response body. Defaults to `any`.
   * @param {RequestParams<T>} params - The parameters for the DELETE request, including endpoint path,
   * query parameters, headers, and any other settings.
   * @returns {Promise<HttpResponse<R>>} A Promise that resolves to an `HttpResponse` object.
   */
  delete<T = any, R = any>(params: RequestParams<T>): Promise<HttpResponse<R>>;

  /**
   * Function for making a POST request.
   *
   * This method is used to make a POST request to the specified endpoint with the given parameters.
   * It returns a Promise that resolves to an `HttpResponse` object containing the response data.
   *
   * @template T - The type of the request parameters. Defaults to `any`.
   * @template R - The type of the response body. Defaults to `any`.
   * @param {RequestParams<T>} params - The parameters for the POST request, including endpoint path,
   * request body, headers, and any other settings.
   * @returns {Promise<HttpResponse<R>>} A Promise that resolves to an `HttpResponse` object.
   */
  post<T = any, R = any>(params: RequestParams<T>): Promise<HttpResponse<R>>;

  /**
   * Function for making a PUT request.
   *
   * This method is used to make a PUT request to the specified endpoint with the given parameters.
   * It returns a Promise that resolves to an `HttpResponse` object containing the response data.
   *
   * @template T - The type of the request parameters. Defaults to `any`.
   * @template R - The type of the response body. Defaults to `any`.
   * @param {RequestParams<T>} params - The parameters for the PUT request, including endpoint path,
   * request body, headers, and any other settings.
   * @returns {Promise<HttpResponse<R>>} A Promise that resolves to an `HttpResponse` object.
   */
  put<T = any, R = any>(params: RequestParams<T>): Promise<HttpResponse<R>>;

  /**
   * Function for making a PATCH request.
   *
   * This method is used to make a PATCH request to the specified endpoint with the given parameters.
   * It returns a Promise that resolves to an `HttpResponse` object containing the response data.
   *
   * @template T - The type of the request parameters, defaulting to an array of `IPatch`.
   * @template R - The type of the response body. Defaults to `any`.
   * @param {RequestParams<T>} params - The parameters for the PATCH request, including endpoint path,
   * request body, headers, and any other settings.
   * @returns {Promise<HttpResponse<R>>} A Promise that resolves to an `HttpResponse` object.
   */
  patch<T = Array<IPatch>, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>>;
}
