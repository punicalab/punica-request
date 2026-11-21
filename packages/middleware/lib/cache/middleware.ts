import { IStorage } from './model';
import {
  BaseMiddleware,
  RequestMethods,
  ProcessData,
  isHttpStatusOk,
  Subscriber,
  MiddlewareActivityConfig
} from '@punica/request';

/**
 * Configuration object for CacheMiddleware.
 */
interface CacheConfig {
  storage: IStorage;
}

export type CacheMiddlewareConfig = CacheConfig & MiddlewareActivityConfig;

/**
 * CacheMiddleware is a middleware class that handles cache requests by checking for cached data.
 */
export class CacheMiddleware extends BaseMiddleware {
  #config: CacheMiddlewareConfig;

  /**
   * Constructs an instance of CacheMiddleware with the provided configuration.
   * @param config - The configuration for the CacheMiddleware.
   */
  constructor(config: CacheMiddlewareConfig) {
    super(config);

    this.#config = config;
  }

  /**
   * Returns the list of available HTTP methods supported by this middleware.
   * Currently, only 'GET' is supported.
   * @returns An array of supported HTTP methods.
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET'];
  }

  /**
   * Processes the incoming request data.
   * @param processData - The data to be processed.
   */
  public process = async (processData: ProcessData) => {
    const { storage } = this.#config;
    const { params, notifier, resolve } = processData;
    const { requestURL, cache, contentType } = params;

    if (!cache) {
      // Continue to the next middleware if caching is disabled
      this.next(processData);

      return;
    }

    try {
      const { expireTime } = cache;
      // Check if the requested data is already stored in the cache
      const storedData = await storage.read(requestURL);

      if (storedData) {
        resolve({ payload: storedData }); // Resolve with cached data if available
      } else {
        // Define a subscriber to cache the response data when updated
        const subscriber: Subscriber = {
          key: 'cache',
          update: async (_processData: ProcessData) => {
            const { httpResponse } = _processData;
            const { status, payload } = httpResponse;

            return new Promise(async (resolve) => {
              if (isHttpStatusOk(status)) {
                // Store response data in the cache
                await storage.write(
                  requestURL,
                  contentType,
                  payload,
                  expireTime
                );
              }

              resolve();
            });
          }
        };
        // Subscribe to updates to cache the response data when available
        notifier.addSubscriber(subscriber);

        this.next(processData); // Continue processing the request
      }
    } catch (error) {
      this.next(processData); // Proceed to the next middleware in case of errors
    }
  };
}
