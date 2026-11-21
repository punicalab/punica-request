import { IMiddleware } from '..';

/**
 * Configuration interface for setting up request settings and optional middleware.
 */
export interface IConfig {
  /**
   * Base URL for the requests.
   * This is the hostname of the server to which the requests will be sent.
   * Example: 'api.example.com'
   */
  hostname: string;
  /**
   * Optional settings for the request.
   * This can include headers, credentials, mode, cache, and other fetch API options.
   * These settings are used to customize the HTTP requests.
   */
  requestInit?: RequestInit;
  /**
   * Array of middleware functions to be applied to the request phase.
   * These functions will be executed in sequence before the request is sent.
   * Each middleware function can modify the request configuration or perform other actions.
   */
  requestMiddlewares?: Array<IMiddleware>;
  /**
   * Array of middleware functions to be applied to the response phase.
   * These functions will be executed in sequence after the response is received.
   * Each middleware function can modify the response or perform other actions.
   */
  responseMiddlewares?: Array<IMiddleware>;
}
