import {
  BaseMiddleware,
  getCookie,
  ProcessData,
  MiddlewareConfig
} from '@punica/request';

/**
 * Configuration object for CookieMiddleware.
 */
interface CookieConfig {
  cookieName: string;
  headerName: string;
}

export type CookieMiddlewareConfig = CookieConfig & MiddlewareConfig;

/**
 * CookieMiddleware is a middleware class that handles cookies in the HTTP request.
 */
export class CookieMiddleware extends BaseMiddleware {
  #config: CookieMiddlewareConfig;

  /**
   * Constructs an instance of CookieMiddleware with the provided configuration.
   * @param {CookieMiddlewareConfig} config - The configuration for the CookieMiddleware.
   */
  public constructor(config: CookieMiddlewareConfig) {
    super(config);

    this.#config = config;
  }

  /**
   * Processes the incoming request data.
   * @param {ProcessData} processData - The data to be processed.
   */
  public process = (processData: ProcessData) => {
    const { params } = processData;
    const { cookieName, headerName } = this.#config;
    const cookieValue = getCookie(cookieName);

    // If a valid cookie value is found, add it to the request headers.
    if (Boolean(cookieValue)) {
      params.init.headers = {
        ...params.init.headers,
        [headerName]: cookieValue
      };
    }

    // Continue with the next middleware in the chain.
    this.next(processData);
  };
}
