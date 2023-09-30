import { ProcessData } from '.';
import { RequestMethods } from '..';

// Interface representing a middleware.
interface IMiddleware {
  // Reference to the next middleware in the chain.
  nextMiddleware: IMiddleware;

  // Reference to the first middleware in the chain.
  firstMiddleware: IMiddleware;

  // Method to pass data to the next middleware in the chain.
  next(data: ProcessData): void;

  // Method to process data within the middleware.
  process(processData: ProcessData): void;

  // Method to retrieve available HTTP methods supported by the middleware.
  availableMethods(): Array<keyof RequestMethods>;
}

export default IMiddleware;
