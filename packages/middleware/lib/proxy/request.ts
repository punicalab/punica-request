import { BaseMiddleware, RequestMethods, ProcessData } from '@punica/request';
import { IStorage } from './model';

/**
 * ProxyRequestMiddleware is a middleware class that handles proxy requests by checking for cached data.
 */
export class ProxyRequestMiddleware extends BaseMiddleware {
  #config: ProxyRequestMiddlewareConfig;

  /**
   * Constructs an instance of ProxyRequestMiddleware with the provided configuration.
   * @param config - The configuration for the ProxyRequestMiddleware.
   */
  constructor(config: ProxyRequestMiddlewareConfig) {
    super();

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
    const { params, resolve } = processData;
    const { requestURL, cache } = params;

    if (!cache) {
      this.next(processData);
      return;
    }

    // Check if the requested data is stored in the cache.
    const storedData = await storage.read(requestURL);

    if (storedData) {
      resolve(storedData);
    } else {
      this.next(processData);
    }
  };
}

/**
 * Configuration object for ProxyRequestMiddleware.
 */
type ProxyRequestMiddlewareConfig = {
  storage: IStorage;
};
