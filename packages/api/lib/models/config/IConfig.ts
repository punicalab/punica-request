import { IMiddlewareConfig, IRequestConfig } from '.';

interface IConfig {
  request: IRequestConfig;
  middleware?: IMiddlewareConfig;
}

export default IConfig;
