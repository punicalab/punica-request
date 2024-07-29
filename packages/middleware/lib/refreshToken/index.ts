import {
  BaseMiddleware,
  isHttpStatusOk,
  ProcessData,
  MiddlewareConfig
} from '@punica/request';

/**
 * Interface representing a token provider responsible for refreshing tokens.
 */
interface TokenProvider {
  refreshToken(): Promise<boolean>;
}

/**
 * Configuration object for RefreshTokenMiddleware.
 */
interface RefreshTokenConfig {
  tokenProvider: TokenProvider;
}

export type RefreshTokenMiddlewareConfig = RefreshTokenConfig &
  MiddlewareConfig;

export class RefreshTokenMiddleware extends BaseMiddleware {
  #config: RefreshTokenMiddlewareConfig;
  #pendingRequests: ProcessData[] = [];
  #isRefreshing: boolean = false;

  /**
   *
   * @param tokenProvider
   */
  constructor(config: RefreshTokenMiddlewareConfig) {
    super(config);

    this.#config = config;
  }

  /**
   * Clears the pending requests list and rejects all pending requests.
   * @param error - The error to reject the pending requests with.
   */
  private clearPendingRequests(error: any) {
    this.#pendingRequests.forEach((processData) => {
      processData.reject(error);
    });

    this.#pendingRequests = [];
  }

  /**
   * Refreshes the access token and retries the pending requests.
   */
  private async refreshAccessToken() {
    const { tokenProvider } = this.#config;
    try {
      await tokenProvider.refreshToken();

      this.#pendingRequests.forEach((processData) => {
        this.headMiddleware.process(processData);
      });

      this.#pendingRequests = [];
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      this.clearPendingRequests(error);
    }
  }

  /**
   * Processes the middleware for the given request data.
   * @param processData - The request data to process.
   */
  public process = async (processData: ProcessData) => {
    if (isHttpStatusOk(processData.httpResponse.status)) {
      this.next(processData);
      return;
    }

    if (processData.httpResponse.status === 401) {
      this.#pendingRequests.push(processData);

      if (!this.#isRefreshing) {
        this.#isRefreshing = true;
        await this.refreshAccessToken();
        this.#isRefreshing = false;
      }

      return;
    }

    this.next(processData);
  };
}
