import { IConfig } from '../config';
import { IRequestParams } from '.';
import { ContentType } from '../content';

export interface IRequest {
  config: IConfig;
  readResponse(response: Response, contentType: ContentType): Promise<unknown>;
  get<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  delete<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  post<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
  put<T = any, R = any>(params: IRequestParams<T>): Promise<R>;
}

export default IRequest;
