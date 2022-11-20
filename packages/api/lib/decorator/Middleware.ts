import { MainMiddleware, BaseMiddleware, getUrlParam } from '..';

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

      const requestMiddleware = [...(middleware?.request || [])];
      const responseMiddleware = [...(middleware?.response || [])];
      const url = `${request.baseURL}${params.url}${getUrlParam(
        params.urlParams
      )}`;
      const mainMiddleware = new MainMiddleware(originalMethod, this);

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

      middlewareList.reduce((previous, current) => {
        if (previous) {
          previous.nextMiddleware = current;
        }

        return current;
      }, null);

      middlewareList[0].process(data);
    });
  };
};

export default Middleware;
