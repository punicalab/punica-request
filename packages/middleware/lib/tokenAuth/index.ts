import {
  BaseMiddleware,
  getCookie,
  ProcessData,
  MiddlewareConfig
} from '@punica/request';

/**
 * Configuration object for TokenAuthMiddleware.
 */
interface TokenAuthConfig {
  cookieName: string;
  headerName: string;
  tokenFormat?: string;
}

export type TokenAuthMiddlewareConfig = TokenAuthConfig & MiddlewareConfig;

/**
 * TokenAuthMiddleware is a middleware class that handles authentication in the HTTP request.
 */
export class TokenAuthMiddleware extends BaseMiddleware {
  #config: TokenAuthMiddlewareConfig;

  /**
   * Constructs an instance of TokenAuthMiddleware with the provided configuration.
   * @param config - The configuration for the TokenAuthMiddleware.
   */
  public constructor(config: TokenAuthMiddlewareConfig) {
    super(config);

    this.#config = {
      ...config,
      tokenFormat: config.tokenFormat || 'Bearer ${token}'
    };
  }

  /**
   * Processes the incoming request data.
   * @param processData - The data to be processed.
   */
  public process = (processData: ProcessData) => {
    const { params } = processData;
    const { cookieName, headerName, tokenFormat } = this.#config;
    const cookieValue = getCookie(cookieName);

    // If a valid cookie value is found, add the authorization header to the request.
    if (Boolean(cookieValue)) {
      params.init.headers = {
        ...params.init.headers,
        [headerName]: tokenFormat.replace('${token}', cookieValue)
      };
    }

    // Continue with the next middleware in the chain.
    this.next(processData);
  };
}
