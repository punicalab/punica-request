import { IMiddleware, ProcessData, RequestMethods } from '..';

/**
 * Base class for middleware implementations. Implements common functionality and defines abstract method for processing.
 */
export abstract class BaseMiddleware implements IMiddleware {
  #nextMiddleware: IMiddleware;
  #headMiddleware: IMiddleware;

  /**
   * Constructs a new BaseMiddleware instance.
   */
  constructor() {}

  /**
   * Sets the next middleware in the chain.
   * @param middleware - The next middleware
   */
  set nextMiddleware(middleware: IMiddleware) {
    this.#nextMiddleware = middleware;
  }

  /**
   * Gets the next middleware in the chain.
   * @param middleware - The next middleware
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
   * @param middleware - The head middleware
   */
  get headMiddleware() {
    return this.#headMiddleware;
  }

  /**
   * Moves to the next step in the middleware chain.
   * @param data - Processed data
   */
  public next(data: ProcessData) {
    if (this.#nextMiddleware) {
      this.#nextMiddleware.process(data);

      return;
    }

    data.resolve(data.httpResponse);
  }

  /**
   * Returns the available HTTP methods.
   * @returns Available HTTP methods
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  }

  /**
   * The main processing method of the middleware. Subclasses should fill the functionality of this method.
   * @param processData - Processed data
   */
  abstract process(processData: ProcessData): void;
}
