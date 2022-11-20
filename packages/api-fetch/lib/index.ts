import {
  IRequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  getUrlParam,
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
  public async get<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    const { init, url } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(url, {
      ...config,
      method: 'GET'
    });

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async delete<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    const { init, url } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(url, {
      ...config,
      method: 'DELETE'
    });

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async post<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    const { init, url, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(url, {
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
  public async put<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    const { init, url, data } = params;
    const { request } = this._config;
    const { requestInit } = request;
    const config = mergeConfig(requestInit, init);

    const response: any = await fetch(url, {
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
      if (contentType !== null) {
        resolve(response[contentType || 'json']());
      }

      return null;
    });
  }
}
