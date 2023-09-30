import { IMiddleware } from '..';

// Interface for the configuration object.
export interface IConfig {
  // Configuration for the request settings.
  request: {
    // Base URL for the requests.
    hostname: string;
    // Optional settings for the request (e.g., headers, etc.).
    requestInit?: RequestInit;
  };
  // Optional middleware for processing requests and responses.
  middleware?: {
    // Array of middleware functions to be applied to the request phase.
    request?: Array<IMiddleware>;
    // Array of middleware functions to be applied to the response phase.
    response?: Array<IMiddleware>;
  };
}
