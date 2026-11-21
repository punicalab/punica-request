import { IMiddleware, ProcessData, RequestMethods } from '..';

/**
 * Configuration interface for checking middleware activity status.
 */
export interface MiddlewareActivityConfig {
  getActive?: () => boolean;
}

/**
 * Configuration interface for specifying available HTTP methods for middleware.
 */
export interface MiddlewareMethodConfig {
  getAvailableMethods?: () => Array<keyof RequestMethods>;
}

/**
 * Combined configuration interface for middleware.
 */
export type MiddlewareConfig =
  | MiddlewareActivityConfig
  | MiddlewareMethodConfig
  | (MiddlewareActivityConfig & MiddlewareMethodConfig);

/**
 * Base class for middleware implementations. Implements common functionality and defines abstract method for processing.
 */
export abstract class BaseMiddleware implements IMiddleware {
  #nextMiddleware: IMiddleware;
  #headMiddleware: IMiddleware;
  #config: MiddlewareActivityConfig & MiddlewareMethodConfig;

  /**
   * Constructs a new BaseMiddleware instance.
   * @param config - Configuration object for the middleware.
   */
  constructor(
    config:
      MiddlewareActivityConfig | MiddlewareMethodConfig | MiddlewareConfig = {}
  ) {
    this.#config = {
      getActive: (config as MiddlewareActivityConfig).getActive,
      getAvailableMethods: (config as MiddlewareMethodConfig)
        .getAvailableMethods
    };
  }

  /**
   * Sets the next middleware in the chain.
   * @param middleware - The next middleware
   */
  set nextMiddleware(middleware: IMiddleware) {
    this.#nextMiddleware = middleware;
  }

  /**
   * Gets the next middleware in the chain.
   */
  get nextMiddleware() {
    return this.#nextMiddleware;
  }

  /**
   * Sets the head middleware in the chain.
   * @param middleware - The head middleware
   */
  set headMiddleware(middleware: IMiddleware) {
    this.#headMiddleware = middleware;
  }

  /**
   * Gets the head middleware in the chain.
   */
  get headMiddleware() {
    return this.#headMiddleware;
  }

  /**
   * Moves to the next step in the middleware chain.
   * @param data - Processed data
   */
  public next(data: ProcessData) {
    // The path of the request it belongs to. The instance is shared by every
    // request of the API, so what follows it is not read from the instance:
    // another request may have been set up since
    const position = data.chain ? data.chain.indexOf(this) : -1;
    const following =
      position === -1 ? this.#nextMiddleware : data.chain[position + 1];

    if (following) {
      following.process(data);

      return;
    }

    data.resolve(data.httpResponse);
  }

  /**
   * Sends the request again, from the first middleware of its path: after a
   * token was refreshed, for example.
   * @param data - The request
   */
  protected restart(data: ProcessData): void {
    (data.chain?.[0] ?? this.#headMiddleware).process(data);
  }

  /**
   * Returns the available HTTP methods.
   * @returns Available HTTP methods.
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return (
      this.#config.getAvailableMethods?.() ?? [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH'
      ]
    );
  }

  /**
   * Determines if the middleware is active.
   *
   * This method checks if the middleware should be active based on custom conditions.
   * If false, the middleware will skip its processing and pass control to the next middleware in the chain.
   *
   * @returns A boolean indicating whether the middleware is active.
   */
  public isActive(): boolean {
    return this.#config.getActive?.() ?? true;
  }

  /**
   * The main processing method of the middleware. Subclasses should fill the functionality of this method.
   * @param processData - Processed data
   */
  abstract process(processData: ProcessData): void;
}
