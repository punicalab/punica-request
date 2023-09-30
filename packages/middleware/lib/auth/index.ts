import { BaseMiddleware, getCookie, ProcessData } from '@punica/request';

/**
 * AuthMiddleware is a middleware class that handles authentication in the HTTP request.
 */
export default class AuthMiddleware extends BaseMiddleware {
  #config: AuthMiddlewareConfig;

  /**
   * Constructs an instance of AuthMiddleware with the provided configuration.
   * @param config - The configuration for the AuthMiddleware.
   */
  public constructor(config: AuthMiddlewareConfig) {
    super();

    this.#config = config;
  }

  /**
   * Processes the incoming request data.
   * @param processData - The data to be processed.
   */
  public process = (processData: ProcessData) => {
    const { params } = processData;
    const { cookieName, headerName } = this.#config;
    const cookieValue = getCookie(cookieName);

    // If a valid cookie value is found, add the authorization header to the request.
    if (Boolean(cookieValue)) {
      params.init.headers = {
        ...params.init.headers,
        [headerName]: `Bearer ${cookieValue} `
      };
    }

    // Continue with the next middleware in the chain.
    this.next(processData);
  };
}

/**
 * Configuration object for AuthMiddleware.
 */
type AuthMiddlewareConfig = {
  cookieName: string;
  headerName: string;
};
