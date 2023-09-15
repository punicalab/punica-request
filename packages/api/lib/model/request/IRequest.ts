import { IConfig, ContentType, RequestParams } from '..';

export interface IRequest {
  config: IConfig;
  get<T = any, R = any>(params: RequestParams<T>): Promise<R>;
  delete<T = any, R = any>(params: RequestParams<T>): Promise<R>;
  post<T = any, R = any>(params: RequestParams<T>): Promise<R>;
  put<T = any, R = any>(params: RequestParams<T>): Promise<R>;
  readResponse(response: Response, contentType: ContentType): Promise<unknown>;
}

export default IRequest;
