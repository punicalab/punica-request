import {
  MainMiddleware,
  IMiddleware,
  RequestParams,
  ProcessData,
  availableMiddlewareMethods,
  Notifier
} from '..';
import { run } from '../middleware/run';

/**
 * Decorator function that enhances a method with middleware functionality.
 * @param target - The target object.
 * @param propertyKey - The name of the decorated method.
 * @param descriptor - The method descriptor.
 */
export const Middleware: MethodDecorator = (
  target: object,
  propertyKey: string | symbol,
  descriptor: any
) => {
  // Store the original method for later use
  const originalMethod = descriptor.value;

  // Override the original method
  descriptor.value = function (...args: any[]) {
    return new Promise((resolve, reject) => {
      try {
        // Extract request parameters
        const params: RequestParams<any> = args[0];
        const { config } = this;

        // Create instances of main middleware, request middleware, and response middleware
        const mainMiddleware = new MainMiddleware(originalMethod, this);
        const requestMiddlewares = availableMiddlewareMethods(
          originalMethod.name,
          config.requestMiddlewares
        );
        const responseMiddlewares = availableMiddlewareMethods(
          originalMethod.name,
          config.responseMiddlewares
        );

        let requestURL = `${config.hostname}${params.path || ''}`;
        const queryParams = new URLSearchParams(params.query || {});

        // Construct the request URL with query parameters
        if (queryParams.toString()) {
          requestURL += `?${queryParams}`;
        }

        // Create an instance of Notifier to manage notifications and updates.
        const notifier = new Notifier();

        // Initialize headers
        const init = params.init
          ? { headers: {}, ...params.init }
          : { headers: {} };

        // Prepare processed data
        const processData: ProcessData = {
          config,
          resolve,
          reject,
          notifier,
          method: originalMethod.name.toUpperCase(),
          params: {
            ...params,
            requestURL,
            init
          }
        };

        // Combine all middleware into a list
        const middlewareList: Array<IMiddleware> = [
          ...requestMiddlewares,
          mainMiddleware,
          ...responseMiddlewares
        ];

        // Set up middleware chain
        const headMiddleware = middlewareList[0];
        middlewareList.reduce((previous, current) => {
          if (previous) {
            previous.nextMiddleware = current;
          }
          current.headMiddleware = headMiddleware;
          current.nextMiddleware = null;
          return current;
        }, null);

        // The request carries its own path: the instances above are shared
        // with the requests that run at the same time
        processData.chain = middlewareList;
        processData.position = 0;

        // Start processing with the head middleware
        run(headMiddleware, processData);
      } catch (error) {
        reject(error);
      }
    });
  };
};
