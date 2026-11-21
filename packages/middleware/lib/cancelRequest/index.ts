import {
  BaseMiddleware,
  ProcessData,
  Subscriber,
  MiddlewareConfig
} from '@punica/request';

/**
 * Configuration object for CancelRequestMiddleware.
 */
interface CancelConfig {
  timeout?: number;
}

export type CancelRequestMiddlewareConfig = CancelConfig & MiddlewareConfig;

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
    super(config);

    this.#config = config;
    this.#controllers = new Map();
  }

  /**
   * Gives the request a signal that cancels it: when the same request is
   * sent again, when the timeout is over or when every request is cancelled.
   * Requests are the same when their method and their address, with its
   * query, are.
   * @param processData - The request
   */
  public process = (processData: ProcessData) => {
    const { params, notifier, reject, method } = processData;
    const key = `${method ?? ''} ${params.requestURL}`;

    // The same request once more: the earlier one is not needed any more
    this.#controllers.get(key)?.abort();

    const controller = new AbortController();
    const timer = this.#config.timeout
      ? setTimeout(() => controller.abort(), this.#config.timeout)
      : undefined;

    /** The request is over: its timer and its entry go, a later one's stay. */
    const finish = () => {
      clearTimeout(timer);

      if (this.#controllers.get(key) === controller) {
        this.#controllers.delete(key);
      }
    };

    this.#controllers.set(key, controller);

    params.init = {
      ...params.init,
      signal: controller.signal
    };

    controller.signal.addEventListener('abort', () => {
      finish();
      reject(
        new Error(
          `Request to ${params.requestURL} was aborted due to timeout or cancellation.`
        )
      );
    });

    // Called once the response has arrived
    const subscriber: Subscriber = {
      key: 'cancel',
      update: async () => finish()
    };

    notifier.addSubscriber(subscriber);

    try {
      this.next(processData);
    } catch (error) {
      finish();
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
