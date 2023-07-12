import { MainMiddleware, BaseMiddleware, getUrlParam } from '..';
import { availableMiddlewareMethods } from '../utils';

/**
 *
 * @param target
 * @param propertyKey
 * @param descriptor
 */
const Middleware: MethodDecorator = (
  target: Object,
  propertyKey: string | symbol,
  descriptor: any
) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    return new Promise((resolve, reject) => {
      const params = args[0];
      const { config } = this;
      const { middleware, request } = config;
      const mainMiddleware = new MainMiddleware(originalMethod, this);
      const requestMiddleware = availableMiddlewareMethods(
        originalMethod.name,
        middleware?.request
      );

      const responseMiddleware = availableMiddlewareMethods(
        originalMethod.name,
        middleware?.response
      );

      const url = `${request.baseURL}${params.url || ''}${getUrlParam(
        params.urlParams
      )}`;

      const data = {
        config,
        resolve,
        reject,
        params: {
          ...params,
          url,
          init: params.init || {}
        }
      };

      const middlewareList: Array<BaseMiddleware> = [
        ...requestMiddleware,
        mainMiddleware,
        ...responseMiddleware
      ];

      const firstMiddleware = middlewareList[0];

      middlewareList.reduce((previous, current) => {
        if (previous) {
          previous.nextMiddleware = current;
        }

        current.firstMiddleware = firstMiddleware;
        current.nextMiddleware = null;

        return current;
      }, null);

      firstMiddleware.startProcess(data);
    });
  };
};

export default Middleware;
