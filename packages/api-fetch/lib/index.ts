import {
  RequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  ContentType,
  IPatch,
  HttpResponse,
  cleanNulls
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
   * Reads the response based on the provided content type.
   * @param response - The response object.
   * @param contentType - The content type of the response.
   * @returns A Promise that resolves with the response data.
   */
  private readResponse(
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

  /**
   * Processes the response and returns a structured HttpResponse object.
   * @param response - The response object.
   * @param contentType - The content type of the response.
   * @returns A Promise that resolves with the HttpResponse.
   */
  private async processResponse<R>(
    response: Response,
    contentType: ContentType
  ): Promise<HttpResponse<R>> {
    const httpResponse: HttpResponse<R> = { response, status: response.status };

    if (response.ok) {
      httpResponse.payload = (await this.readResponse(
        response,
        contentType
      )) as R;
    }

    return httpResponse;
  }

  /**
   * Sends a GET request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async get<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    // Merged request configuration
    const { init, requestURL, data, contentType } = params;
    const { requestInit } = this.#config;
    const config = cleanNulls(mergeConfig(requestInit, init));

    // Making the GET request using Fetch API
    const response: Response = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'GET'
    });

    return this.processResponse<R>(response, contentType);
  }

  /**
   * Sends a DELETE request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async delete<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    // Merged request configuration
    const { init, requestURL, data, contentType } = params;
    const { requestInit } = this.#config;
    const config = cleanNulls(mergeConfig(requestInit, init));

    // Making the DELETE request using Fetch API
    const response: Response = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'DELETE'
    });

    return this.processResponse<R>(response, contentType);
  }

  /**
   * Sends a POST request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async post<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    // Merged request configuration
    const { init, requestURL, data, contentType } = params;
    const { requestInit } = this.#config;
    const config = cleanNulls(mergeConfig(requestInit, init));

    // Making the POST request using Fetch API
    const response: Response = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'POST'
    });

    return this.processResponse<R>(response, contentType);
  }

  /**
   * Sends a PUT request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async put<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    // Merged request configuration
    const { init, requestURL, data, contentType } = params;
    const { requestInit } = this.#config;
    const config = cleanNulls(mergeConfig(requestInit, init));

    // Making the PUT request using Fetch API
    const response: Response = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'PUT'
    });

    return this.processResponse<R>(response, contentType);
  }

  /**
   * Sends a PATCH request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public async patch<T = Array<IPatch>, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    // Merged request configuration
    const { init, requestURL, data, contentType } = params;
    const { requestInit } = this.#config;
    const config = cleanNulls(mergeConfig(requestInit, init));

    // Making the PATCH request using Fetch API
    const response: Response = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'PATCH'
    });

    return this.processResponse<R>(response, contentType);
  }
}
