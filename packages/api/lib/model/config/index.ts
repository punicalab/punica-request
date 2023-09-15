import { IMiddleware } from '..';

export interface IConfig {
  request: {
    hostname: string;
    requestInit?: RequestInit;
  };
  middleware?: {
    request?: Array<IMiddleware>;
    response?: Array<IMiddleware>;
  };
}
