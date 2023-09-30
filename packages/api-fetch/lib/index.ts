import {
  RequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  ContentType
} from '@punica/request';

/**
 * APIFetch class implements the IRequest interface and provides methods for making HTTP requests.
 */
export class APIFetch implements IRequest {
  #config: IConfig;

  /**
   * Sets the configuration for the APIFetch instance.
   * @param value - The configuration to set.
   */
  public set config(value: IConfig) {
    this.#config = value;
  }

  /**
   * Sends a GET request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async get<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    // Merged request configuration
    const { init, requestURL, data } = params;
    const { request } = this.#config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    // Making the GET request using Fetch API
    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'GET'
    });

    return response;
  }

  /**
   * Sends a DELETE request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async delete<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    // Merged request configuration
    const { init, requestURL, data } = params;
    const { request } = this.#config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    // Making the DELETE request using Fetch API
    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'DELETE'
    });

    return response;
  }

  /**
   * Sends a POST request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async post<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    // Merged request configuration
    const { init, requestURL, data } = params;
    const { request } = this.#config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    // Making the POST request using Fetch API
    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'POST'
    });

    return response;
  }

  /**
   * Sends a PUT request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async put<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    // Merged request configuration
    const { init, requestURL, data } = params;
    const { request } = this.#config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    // Making the POST request using Fetch API
    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'PUT'
    });

    return response;
  }

  /**
   * Reads the response based on the provided content type.
   * @param response - The response object.
   * @param contentType - The content type of the response.
   * @returns A Promise that resolves with the response data.
   */
  public readResponse(
    response: Response,
    contentType: ContentType
  ): Promise<unknown> {
    return new Promise((resolve) => {
      if (contentType) {
        // Handling response based on content type
        response[contentType]()
          .then((d: any) => {
            resolve(d);
          })
          .catch((e) => {
            resolve(null);
          });
      } else {
        resolve(null);
      }
    });
  }
}
