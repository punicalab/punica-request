import { IConfig } from '../config';
import { IRequestParams } from '.';

export interface IRequest {
  config: IConfig;
  get<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  delete<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  post<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  put<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
}

export default IRequest;
