import { BaseMiddleware, RequestMethods, ProcessData } from '@punica/request';
import { IStorage } from './model';

/**
 * ProxyResponseMiddleware is a middleware class that handles proxy responses by caching the data.
 */
export class ProxyResponseMiddleware extends BaseMiddleware {
  #config: ProxyResponseMiddlewareConfig;

  /**
   * Constructs an instance of ProxyResponseMiddleware with the provided configuration.
   * @param config - The configuration for the ProxyResponseMiddleware.
   */
  constructor(config: ProxyResponseMiddlewareConfig) {
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
   * Processes the incoming response data and caches it if caching is enabled.
   * @param processData - The data to be processed.
   */
  public process = async (processData: ProcessData) => {
    const { storage } = this.#config;
    const { params, body } = processData;
    const { requestURL, cache, contentType } = params;

    if (!cache) {
      this.next(processData);
      return;
    }

    // Cache the response data.
    await storage.write(requestURL, contentType, body);

    this.next(processData);
  };
}

/**
 * Configuration object for ProxyResponseMiddleware.
 */
type ProxyResponseMiddlewareConfig = {
  storage: IStorage;
};
