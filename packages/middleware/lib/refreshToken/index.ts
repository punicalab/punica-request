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
  /** Requests that were sent again already. */
  #retried = new WeakSet<ProcessData>();

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
   * Refreshes the token and sends the waiting requests again. When there is
   * no new token they are not sent again: their 401 goes on to the next
   * middleware, an `ErrorMiddleware` for example.
   */
  private async refreshAccessToken() {
    const { tokenProvider } = this.#config;
    let refreshed: boolean;

    try {
      refreshed = await tokenProvider.refreshToken();
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      this.clearPendingRequests(error);

      return;
    }

    // Requests that fail from here on wait for the next refresh
    const waiting = this.#pendingRequests;

    this.#pendingRequests = [];

    for (const processData of waiting) {
      try {
        if (refreshed === false) {
          this.next(processData);
        } else {
          this.restart(processData);
        }
      } catch (error) {
        processData.reject(error);
      }
    }
  }

  /**
   * Lets a response through, unless it is a 401: then the token is
   * refreshed, once for every request that failed meanwhile, and the request
   * is sent again. A request is sent again once; a second 401 goes on to the
   * next middleware.
   * @param processData - The request and its response
   */
  public process = async (processData: ProcessData) => {
    const { status } = processData.httpResponse;

    if (
      isHttpStatusOk(status) ||
      status !== 401 ||
      this.#retried.has(processData)
    ) {
      this.next(processData);
      return;
    }

    this.#retried.add(processData);
    this.#pendingRequests.push(processData);

    if (!this.#isRefreshing) {
      this.#isRefreshing = true;

      try {
        await this.refreshAccessToken();
      } finally {
        this.#isRefreshing = false;
      }
    }
  };
}
