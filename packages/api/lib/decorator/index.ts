import {
  MainMiddleware,
  IMiddleware,
  RequestParams,
  ProcessData,
  availableMiddlewareMethods,
  Notifier
} from '..';

/**
 * Decorator function that enhances a method with middleware functionality.
 * @param target - The target object.
 * @param propertyKey - The name of the decorated method.
 * @param descriptor - The method descriptor.
 */
export const Middleware: MethodDecorator = (
  target: Object,
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
        const { middleware, request } = config;

        // Create instances of main middleware, request middleware, and response middleware
        const mainMiddleware = new MainMiddleware(originalMethod, this);
        const requestMiddleware = availableMiddlewareMethods(
          originalMethod.name,
          middleware?.request
        );
        const responseMiddleware = availableMiddlewareMethods(
          originalMethod.name,
          middleware?.response
        );

        let requestURL = `${request.hostname}${params.path || ''}`;
        let queryParams = new URLSearchParams(params.query || {});

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
          params: {
            ...params,
            requestURL,
            init
          }
        };

        // Combine all middleware into a list
        const middlewareList: Array<IMiddleware> = [
          ...requestMiddleware,
          mainMiddleware,
          ...responseMiddleware
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

        // Start processing with the head middleware
        headMiddleware.process(processData);
      } catch (error) {
        reject(error);
      }
    });
  };
};
