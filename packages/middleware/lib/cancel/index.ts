import {
  BaseMiddleware,
  ProcessData,
  RequestMethods,
  Subscriber
} from '@punica/request';

/**
 * Middleware to handle request cancellations and timeouts.
 * This middleware ensures that only the latest request is kept, aborting any previous requests with the same URL.
 */
export class CancelRequestMiddleware extends BaseMiddleware {
  #config: CancelRequestMiddlewareConfig;
  #controllers: Map<string, AbortController>;

  /**
   * Constructs an instance of CancelRequestMiddleware with the provided configuration.
   * @param config - The configuration for the CancelRequestMiddleware.
   */
  constructor(config: CancelRequestMiddlewareConfig = {}) {
    super();
    this.#config = config;
    this.#controllers = new Map();
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
   * Processes the incoming request data, managing request cancellation, timeouts, and ensuring only the latest request is kept.
   * @param processData - The data to be processed.
   */
  public process = async (processData: ProcessData) => {
    const { config, params, notifier, reject } = processData;
    const { hostname } = config;
    const { path } = params;
    const URL = `${hostname}${path || ''}`;

    try {
      // If a request with the same URL is already in progress, abort the previous request
      if (this.#controllers.has(URL)) {
        const previousController = this.#controllers.get(URL);
        previousController.abort();
      }

      // Create a new AbortController for the request
      const controller = new AbortController();
      this.#controllers.set(URL, controller);

      // Set up timeout if configured
      if (this.#config.timeout) {
        setTimeout(() => {
          controller.abort();
        }, this.#config.timeout);
      }

      // Include the abort signal in the request init options
      params.init = {
        ...params.init,
        signal: controller.signal
      };

      // Handle request abortion
      controller.signal.addEventListener('abort', () => {
        reject(
          new Error(
            `Request to ${URL} was aborted due to timeout or cancellation.`
          )
        );
        this.#controllers.delete(URL);
      });

      // Define a subscriber to handle cleanup after the response is processed
      const subscriber: Subscriber = {
        key: 'cancel',
        update: async (_processData: ProcessData) => {
          return new Promise(async (resolve, reject) => {
            // After processing, remove the controller
            this.#controllers.delete(URL);
            resolve();
          });
        }
      };
      // Subscribe to updates to handle cleanup when the request is complete
      notifier.addSubscriber(subscriber);

      this.next(processData);
    } catch (error) {
      // Ensure controller is removed on error
      this.#controllers.delete(URL);

      throw error;
    }
  };

  /**
   * Cancels all ongoing requests.
   */
  public cancelAllRequests() {
    this.#controllers.forEach((controller) => controller.abort());
    this.#controllers.clear();
  }
}

interface CancelRequestMiddlewareConfig {
  timeout?: number;
}
