import { Middleware } from '../decorator';
import { IRequest, IRequestParams } from '../model/request';
import { IConfig } from '../model/config';
import { ContentType } from '../model';

/**
 *
 */
export class RequestAPI implements IRequest {
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
    return this._request.readResponse(response, contentType);
  }
}
