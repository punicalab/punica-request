import { IConfig, ContentType, RequestParams, IPatch } from '..';

// Interface representing a request object.
export interface IRequest {
  // Configuration information for the request.
  config: IConfig;

  // Function for making a GET request.
  get<T = any, R = any>(params: RequestParams<T>): Promise<R>;

  // Function for making a DELETE request.
  delete<T = any, R = any>(params: RequestParams<T>): Promise<R>;

  // Function for making a POST request.
  post<T = any, R = any>(params: RequestParams<T>): Promise<R>;

  // Function for making a PUT request.
  put<T = any, R = any>(params: RequestParams<T>): Promise<R>;

  // Function for making a PATCH request.
  patch<T = Array<IPatch>, R = any>(params: RequestParams<T>): Promise<R>;

  // Function for reading the response data.
  readResponse(response: Response, contentType: ContentType): Promise<unknown>;
}
