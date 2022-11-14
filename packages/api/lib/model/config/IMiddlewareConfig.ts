import { BaseMiddleware } from '../middleware';

interface IMiddlewareConfig {
  request?: Array<BaseMiddleware>;
  response?: Array<BaseMiddleware>;
}

export default IMiddlewareConfig;
