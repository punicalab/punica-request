import { Middleware } from '../decorator';
import { IRequest, IRequestParams } from '../models/request';
import { IConfig } from '../models/config';

/**
 * 
 */
class RequestAPI implements IRequest {
  private _request: IRequest;
  private _config: IConfig;

  /**
   *
   * @param request
   * @param config
   */
  constructor(request: IRequest, config: IConfig) {
    this._request = request;
    this._config = config;

    request.config = this._config;
  }

  /**
   *
   */
  public get config(): IConfig {
    return this._config;
  }

  /**
   *
   * @param params
   * @returns
   */
  @Middleware
  public get<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return this._request.get(params);
  }

  /**
   * 
   * @param params 
   * @returns 
   */
  @Middleware
  public delete<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return this._request.delete(params);
  }

  /**
   * 
   * @param params 
   * @returns 
   */
  @Middleware
  public post<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return this._request.post(params);
  }

  /**
   * 
   * @param params 
   * @returns 
   */
  @Middleware
  public put<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return this._request.put(params);
  }
}

export default RequestAPI;
