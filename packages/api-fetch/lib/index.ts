import {
  RequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  ContentType
} from '@punica/request';

export class APIFetch implements IRequest {
  private _config: IConfig;

  /**
   *
   */
  public set config(value: IConfig) {
    this._config = value;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async get<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    const { init, requestURL, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'GET'
    });

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async delete<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    const { init, requestURL, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'DELETE'
    });

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async post<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    const { init, requestURL, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'POST'
    });

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async put<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    const { init, requestURL, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(requestURL, {
      ...config,
      body: data,
      method: 'PUT'
    });

    return response;
  }

  /**
   *
   * @param response
   * @param contentType
   * @returns
   */
  public readResponse(
    response: Response,
    contentType: ContentType
  ): Promise<unknown> {
    return new Promise((resolve) => {
      if (contentType) {
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
