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

    // If caching is not enabled for this request, proceed to the next middleware
    if (!cache) {
      this.next(processData);
      return;
    }

    let storedData: unknown = null;

    try {
      storedData = await storage.read(requestURL);
    } catch {
      // A cache that cannot be read is an empty one: the request is sent
    }

    if (storedData !== null && storedData !== undefined) {
      // A whole response, as the one the request would have brought
      resolve({ payload: storedData, status: 200, response: null });
      return;
    }

    const { expireTime } = cache;
    const subscriber: Subscriber = {
      key: 'cache',
      update: async ({ httpResponse }: ProcessData) => {
        if (!isHttpStatusOk(httpResponse.status)) return;

        try {
          await storage.write(
            requestURL,
            contentType,
            httpResponse.payload,
            expireTime
          );
        } catch {
          // The response is what was asked for; the cache is a convenience
        }
      }
    };

    // Subscribe to updates to cache the response data when available
    notifier.addSubscriber(subscriber);

    this.next(processData);
  };
}
