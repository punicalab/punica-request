import { BaseMiddleware, ProcessData, MiddlewareConfig } from '@punica/request';

/**
 * Configuration object for CancelRequestMiddleware.
 */
interface CancelConfig {
  /** Milliseconds after which a request is cancelled. */
  timeout?: number;

  /**
   * What makes two requests the same one, so that the later cancels the
   * earlier. By default their method and their path: a new search cancels
   * the one before it, whatever its query. Return the address with its query
   * (`processData.params.requestURL`) to let requests that differ in their
   * query run side by side.
   */
  getKey?: (processData: ProcessData) => string;
}

export type CancelRequestMiddlewareConfig = CancelConfig & MiddlewareConfig;

/**
 * Middleware to handle request cancellations and timeouts.
 * This middleware ensures that only the latest request is kept, aborting any previous requests with the same URL.
 */
export class CancelRequestMiddleware extends BaseMiddleware {
  #config: CancelRequestMiddlewareConfig;
  #controllers: Map<string, AbortController>;
  /** What the middleware holds for a request, across its attempts. */
  #requests = new WeakMap<
    ProcessData,
    { given?: AbortSignal | null; release: () => void }
  >();

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
   * sent again, when the timeout is over, when every request is cancelled,
   * or when the signal the caller gave the request is aborted.
   * @param processData - The request
   */
  public process = (processData: ProcessData) => {
    const { config, params, method } = processData;
    let request = this.#requests.get(processData);

    if (request) {
      // Sent again, after a token was refreshed for example: the attempt
      // before is over, which is not a cancellation
      request.release();
    } else {
      const { resolve, reject } = processData;

      request = { given: params.init?.signal, release: () => undefined };
      this.#requests.set(processData, request);

      // However the request ends: answered, from a cache, or not sent at all
      const state = request;

      processData.resolve = (data) => {
        state.release();
        resolve(data);
      };
      processData.reject = (reason) => {
        state.release();
        reject(reason);
      };
    }

    const { given } = request;
    const aborted = () =>
      processData.reject(
        new Error(
          `Request to ${params.requestURL} was aborted due to timeout or cancellation.`
        )
      );

    // Cancelled by its caller before it was sent: nothing else is touched
    if (given?.aborted) {
      aborted();

      return;
    }

    const key =
      this.#config.getKey?.(processData) ??
      `${method ?? ''} ${config.hostname}${params.path || ''}`;

    // The same request once more: the earlier one is not needed any more
    this.#controllers.get(key)?.abort();

    const controller = new AbortController();
    const timer = this.#config.timeout
      ? setTimeout(() => controller.abort(), this.#config.timeout)
      : undefined;
    const cancel = () => controller.abort();

    this.#controllers.set(key, controller);
    controller.signal.addEventListener('abort', aborted, { once: true });
    // The caller's own signal still cancels the request
    given?.addEventListener('abort', cancel, { once: true });

    /** This attempt is over: its timer, listeners and entry go. */
    request.release = () => {
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', aborted);
      given?.removeEventListener('abort', cancel);

      if (this.#controllers.get(key) === controller) {
        this.#controllers.delete(key);
      }
    };

    params.init = {
      ...params.init,
      signal: controller.signal
    };

    this.next(processData);
  };

  /**
   * Cancels all ongoing requests.
   */
  public cancelAllRequests() {
    this.#controllers.forEach((controller) => controller.abort());
    this.#controllers.clear();
  }
}
