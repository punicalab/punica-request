import { IRequestParams, IConfig, IRequest } from '../../lib';

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
   * @param url
   * @param data
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
   * @param url
   * @param data
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
   * @param url
   * @param data
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
   * @param url
   * @param data
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
}
