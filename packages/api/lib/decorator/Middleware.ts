import { MainMiddleware, BaseMiddleware } from '..';

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
  const originalValue = descriptor.value;

  descriptor.value = function (...args: any[]) {
    return new Promise((resolve, reject) => {
      const { config } = this;
      const params = args[0];
      const requestMiddleware = [...(config?.middleware?.request || [])];
      const responseMiddleware = [...(config?.middleware?.response || [])];
      const mainMiddleware = new MainMiddleware(originalValue, this);
      const data = {
        resolve,
        reject,
        params: {
          ...params,
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
