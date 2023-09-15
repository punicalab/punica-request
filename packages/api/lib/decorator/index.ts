import {
  MainMiddleware,
  getUrlParam,
  IMiddleware,
  RequestParams,
  ProcessData,
  availableMiddlewareMethods
} from '..';

/**
 *
 * @param target
 * @param propertyKey
 * @param descriptor
 */
export const Middleware: MethodDecorator = (
  target: Object,
  propertyKey: string | symbol,
  descriptor: any
) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    return new Promise((resolve, reject) => {
      const params: RequestParams<any> = args[0];
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

      const requestURL = `${request.hostname}${params.path || ''}${getUrlParam(
        params.query
      )}`;

      const init = params.init
        ? { headers: {}, ...params.init }
        : { headers: {} };

      const processData: ProcessData = {
        config,
        resolve,
        reject,
        params: {
          ...params,
          requestURL,
          init
        }
      };

      const middlewareList: Array<IMiddleware> = [
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

      firstMiddleware.process(processData);
    });
  };
};
