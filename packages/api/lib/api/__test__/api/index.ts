import {
  RequestParams,
  IConfig,
  IRequest,
  IPatch,
  HttpResponse
} from '../../..';

export class RequestSample implements IRequest {
  #config: IConfig;

  /**
   *
   */
  constructor() {}

  /**
   *
   */
  public set config(value: IConfig) {
    this.#config = value;
  }

  /**
   *
   * @param params
   * @returns
   */
  public async get<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const res: any = params.query;
        const httpResponse: R = {
          response: res,
          status: 200,
          body: res
        };

        resolve(httpResponse);
      } else {
        reject(new Error('params object is required'));
      }
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async delete<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const res: any = params.query;
        const httpResponse: R = {
          response: res,
          status: 200,
          body: res
        };

        resolve(httpResponse);
      } else {
        reject(new Error('params object is required'));
      }
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async post<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const data: any = params.data;
        const httpResponse: R = {
          response: data,
          status: 200,
          body: data
        };

        resolve(httpResponse);
      } else {
        reject(new Error('params object is required'));
      }
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async put<T = any, R = any>(params: RequestParams<T>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const data: any = params.data;
        const httpResponse: R = {
          response: data,
          status: 200,
          body: data
        };

        resolve(httpResponse);
      } else {
        reject(new Error('params object is required'));
      }
    });
  }

  /**
   *
   * @param params
   * @returns
   */
  public async patch<T = Array<IPatch>, R = any>(
    params: RequestParams<T>
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      if (params) {
        const data: any = params.data;
        const httpResponse: R = {
          response: data,
          status: 200,
          body: data
        };

        resolve(httpResponse);
      } else {
        reject(new Error('params object is required'));
      }
    });
  }
}
