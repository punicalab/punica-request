import {
  IRequestParams,
  IRequest,
  IConfig,
  mergeConfig,
  getUrlParam
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
    const { init, url, urlParams } = params;
    const { request } = this._config;
    const { requestInit, baseURL } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(
      `${baseURL}${url}${getUrlParam(urlParams)}`,
      {
        ...config,
        method: 'GET'
      }
    );

    return response;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async delete<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    const { init, url, urlParams } = params;
    const { request } = this._config;
    const { requestInit, baseURL } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(
      `${baseURL}${url}${getUrlParam(urlParams)}`,
      {
        ...config,
        method: 'DELETE'
      }
    );

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
    const { requestInit, baseURL } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(`${baseURL}${url}`, {
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
    const { requestInit, baseURL } = request;
    const config = mergeConfig(requestInit, init);
    const response: any = await fetch(`${baseURL}${url}`, {
      ...config,
      body: data,
      method: 'PUT'
    });

    return response;
  }
}
