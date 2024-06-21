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
   * @param m - The next middleware
   */
  set nextMiddleware(m: IMiddleware) {
    this.#nextMiddleware = m;
  }

  /**
   * Gets the next middleware in the chain.
   * @param m - The next middleware
   */
  get nextMiddleware() {
    return this.#nextMiddleware;
  }

  /**
   * Sets the head middleware in the chain.
   * @param m - The head middleware
   */
  set headMiddleware(m: IMiddleware) {
    this.#headMiddleware = m;
  }

  /**
   * Gets the head middleware in the chain.
   * @param m - The head middleware
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

    data.resolve(data.body);
  }

  /**
   * Returns the available HTTP methods.
   * @returns Available HTTP methods
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET', 'POST', 'PUT', 'DELETE'];
  }

  /**
   * The main processing method of the middleware. Subclasses should fill the functionality of this method.
   * @param processData - Processed data
   */
  abstract process(processData: ProcessData): void;
}
