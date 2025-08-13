import http, { IncomingMessage } from 'http';
import {
  RequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  IPatch,
  HttpResponse,
  isHttpStatusOk
} from '@punica/request';

/**
 * APIHttp class implements the IRequest interface and provides methods for making HTTP requests.
 */
export class APIHttp implements IRequest {
  #config: IConfig;

  /**
   * Sets the configuration for the APIHttp instance.
   * @param value - The configuration to set.
   */
  public set config(value: IConfig) {
    this.#config = value;
  }

  /**
   * Creates and merges the request configuration.
   * @param params - The request parameters.
   * @returns The merged request configuration.
   */
  private requestConfig<T>(params: RequestParams<T>): http.RequestOptions {
    const { init, path } = params;
    const { requestInit, hostname } = this.#config;
    const config = mergeConfig(requestInit, init);

    return {
      hostname,
      path,
      headers: config.headers as http.OutgoingHttpHeaders
    };
  }

  /**
   * Processes the HTTP response and returns the response data.
   * @param res - The incoming message object from the HTTP request.
   * @returns A Promise that resolves with the response data.
   */
  private processResponse<R>(res: IncomingMessage): Promise<HttpResponse<R>> {
    return new Promise((resolve, reject) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const httpResponse: HttpResponse<R> = {
          response: res,
          status: res.statusCode
        };

        if (isHttpStatusOk(res.statusCode)) {
          try {
            httpResponse.payload = JSON.parse(data) as R;
          } catch {}
        }

        resolve(httpResponse);
      });

      res.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Sends an HTTP request using the specified method and parameters.
   * @param method - The HTTP method (GET, POST, etc.).
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  private sendRequest<T, R>(
    method: string,
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return new Promise((resolve, reject) => {
      const { data } = params;
      const options = {
        ...this.requestConfig<T>(params),
        method
      };

      const req = http.request(options, (res: IncomingMessage) => {
        this.processResponse<R>(res).then(resolve).catch(reject);
      });

      req.on('error', (err) => {
        reject(new Error(`Request error: ${err.message}`));
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }

  /**
   * Sends a GET request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public get<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return this.sendRequest<T, R>('GET', params);
  }

  /**
   * Sends a DELETE request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public delete<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return this.sendRequest<T, R>('DELETE', params);
  }

  /**
   * Sends a POST request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public post<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return this.sendRequest<T, R>('POST', params);
  }

  /**
   * Sends a PUT request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public put<T = any, R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return this.sendRequest<T, R>('PUT', params);
  }

  /**
   * Sends a PATCH request.
   * @param params - The request parameters.
   * @returns A Promise that resolves with the response.
   */
  public patch<T = IPatch[], R = any>(
    params: RequestParams<T>
  ): Promise<HttpResponse<R>> {
    return this.sendRequest<T, R>('PATCH', params);
  }
}
