import { IMiddleware, ProcessData, RequestMethods } from '..';

/**
 * Base class for middleware implementations. Implements common functionality and defines abstract method for processing.
 */
abstract class BaseMiddleware implements IMiddleware {
  // Reference to the next middleware in the chain
  #nextMiddleware: IMiddleware;

  // Reference to the first middleware in the chain
  protected _firstMiddleware: IMiddleware;

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
   * Sets the first middleware in the chain.
   * @param m - The first middleware
   */
  set firstMiddleware(m: IMiddleware) {
    this._firstMiddleware = m;
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

export default BaseMiddleware;
