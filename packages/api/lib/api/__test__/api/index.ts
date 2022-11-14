import { IRequestParams, IConfig, IRequest } from '../../..';

export class RequestSample implements IRequest {
  private _config: IConfig;

  /**
   *
   */
  constructor() {}

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
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const res: any = params.urlParams;

        resolve({
          headers: {
            get() {
              return 'application/json; charset=utf-8';
            }
          },
          json: () =>
            new Promise((resolve) => {
              resolve(res);
            })
        } as any);
      }

      reject(new Error('error'));
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async delete<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const res: any = params.urlParams;

        resolve({
          headers: {
            get() {
              return 'application/json; charset=utf-8';
            }
          },
          json: () =>
            new Promise((resolve) => {
              resolve(res);
            })
        } as any);
      }

      reject(new Error('error'));
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async post<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params.init) {
        const res: any = params.data;

        resolve({
          headers: {
            get() {
              return 'application/json; charset=utf-8';
            }
          },
          json: () =>
            new Promise((resolve) => {
              resolve(res);
            })
        } as any);
      }

      reject(new Error('error'));
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async put<T = any, R = any>(params: IRequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params.init) {
        const res: any = params.data;

        resolve({
          headers: {
            get() {
              return 'application/json; charset=utf-8';
            }
          },
          json: () => {
            return new Promise((resolve) => {
              resolve(res);
            });
          }
        } as any);
      }

      reject(new Error('error'));
    });
  }

  /**
   *
   * @param response
   * @returns
   */
  public readResponse(response: Response): Promise<unknown> {
    return new Promise((resolve) => {
      resolve(response['json']());
    });
  }
}
