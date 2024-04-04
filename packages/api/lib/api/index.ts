import {
  Middleware,
  IRequest,
  RequestParams,
  IConfig,
  ContentType,
  IPatch
} from '..';

/**
 * The RequestAPI class acts as an adapter, enhancing
 * the behavior of the underlying IRequest interface
 * by allowing additional configurations.
 * It provides methods for sending various types of
 * HTTP requests and handles the response data.
 * The class utilizes decorators for middleware functionality.
 *
 */
export class RequestAPI implements IRequest {
  #request: IRequest;
  #config: IConfig;

  /**
   * Creates an instance of RequestAPI.
   * @param request - The underlying IRequest implementation.
   * @param config - The configuration for the request.
   */
  constructor(request: IRequest, config: IConfig) {
    this.#request = request;
    this.#config = config;

    // Assign the configuration to the underlying request object.
    request.config = this.#config;
  }

  /**
   * Gets the current configuration.
   * @returns The current configuration.
   */
  public get config(): IConfig {
    return this.#config;
  }

  /**
   * Sends a GET request.
   * @param params - The request parameters.
   * @returns A promise that resolves with the response data.
   */
  @Middleware
  public get<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return this.#request.get(params);
  }

  /**
   * Sends a DELETE request.
   * @param params - The request parameters.
   * @returns A promise that resolves with the response data.
   */
  @Middleware
  public delete<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return this.#request.delete(params);
  }

  /**
   * Sends a POST request.
   * @param params - The request parameters.
   * @returns A promise that resolves with the response data.
   */
  @Middleware
  public post<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return this.#request.post(params);
  }

  /**
   * Sends a PUT request.
   * @param params - The request parameters.
   * @returns A promise that resolves with the response data.
   */
  @Middleware
  public put<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return this.#request.put(params);
  }

  /**
   * Sends a PATCH request.
   * @param params - The request parameters.
   * @returns A promise that resolves with the response data.
   */
  @Middleware
  public patch<T = Array<IPatch>, R = any>(
    params: RequestParams<T>
  ): Promise<R> {
    return this.#request.patch(params);
  }

  /**
   * Reads the response and handles the content type.
   * @param response - The response object.
   * @param contentType - The content type of the response.
   * @returns A promise that resolves with the parsed response data.
   */
  public readResponse(
    response: Response,
    contentType: ContentType
  ): Promise<unknown> {
    return this.#request.readResponse(response, contentType);
  }
}
