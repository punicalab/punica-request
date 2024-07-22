import { ProcessData } from '.';
import { RequestMethods } from '..';

/**
 * Interface representing a middleware.
 *
 * This interface defines the structure and responsibilities of middleware components
 * in a middleware chain. Middleware components process data, pass it to the next middleware,
 * and provide information about the HTTP methods they support.
 */
export interface IMiddleware {
  /**
   * Reference to the next middleware in the chain.
   *
   * This property holds a reference to the next middleware component in the chain.
   * It allows the current middleware to pass control to the next middleware after
   * it has completed its processing.
   */
  nextMiddleware: IMiddleware;

  /**
   * Reference to the head middleware in the chain.
   *
   * This property holds a reference to the head (or first) middleware component in the chain.
   * It provides a way for middleware components to access or refer to the initial middleware
   * in the chain.
   */
  headMiddleware: IMiddleware;

  /**
   * Method to pass data to the next middleware in the chain.
   *
   * This method is responsible for passing the `ProcessData` to the next middleware component.
   * It ensures that the data flows through the entire middleware chain, allowing each middleware
   * to process the data in sequence.
   *
   * @param data - The data to be passed to the next middleware. This data includes the request
   * configuration, parameters, response, and other relevant information.
   */
  next(data: ProcessData): void;

  /**
   * Method to process data within the middleware.
   *
   * This method contains the logic for processing the `ProcessData` within the middleware.
   * It is the core function where the middleware performs its specific tasks, such as modifying
   * the request or response, handling authentication, logging, etc.
   *
   * @param processData - The data to be processed by the middleware. This data includes the request
   * configuration, parameters, response, and other relevant information.
   */
  process(processData: ProcessData): void;

  /**
   * Method to retrieve available HTTP methods supported by the middleware.
   *
   * This method returns an array of HTTP methods that the middleware supports. It provides
   * information about the types of requests that the middleware can handle, such as GET, POST,
   * PUT, DELETE, etc.
   *
   * @returns An array of HTTP methods supported by the middleware.
   */
  availableMethods(): Array<keyof RequestMethods>;

  /**
   * Method to determine if the middleware is active.
   *
   * This method returns a boolean indicating whether the middleware is active. If false, the middleware
   * should skip its processing and pass control to the next middleware in the chain.
   *
   * @returns A boolean indicating whether the middleware is active.
   */
  isActive(): boolean;
}
