import {
  BaseMiddleware,
  ContentType,
  ProcessData,
  isHttpStatusOk
} from '@punica/request';

/**
 * ErrorMiddleware is a middleware class that handles errors in the HTTP response.
 */
export class ErrorMiddleware extends BaseMiddleware {
  #config: ErrorMiddlewareConfig;

  /**
   * Constructs an instance of ErrorMiddleware with the provided configuration.
   * @param config - The configuration for the ErrorMiddleware.
   */
  public constructor(config: ErrorMiddlewareConfig) {
    super();

    this.#config = config;
  }

  /**
   * Logs an error message to the console.
   * @param message - The error message to be logged.
   */
  #LOGGER = (message: string) => {
    console.error(
      `%cPUNICA_ERROR_MIDDLEWARE ${message}`,
      'background-color: red; color: white; padding: 12px'
    );
  };

  /**
   * Processes the incoming response data.
   * @param processData - The data to be processed.
   */
  public process = (processData: ProcessData) => {
    const { response, reject } = processData;
    const { status } = response;

    if (isHttpStatusOk(status)) {
      this.next(processData);
      return;
    }

    const { error, contentType } = this.#config;
    const errorHandler = error[status];

    if (errorHandler == null) {
      this.#LOGGER('You should add the error message handler!');
      reject(processData);
      return;
    }

    // Attempt to read the response content based on the provided content type.
    processData.response[contentType]()
      .then((content) => {
        processData.body = content;
      })
      .catch(() => {
        this.#LOGGER(
          'Received read error for requested content type from operation response'
        );
      })
      .finally(() => {
        // Call the error handler and ensure rejection.
        errorHandler(processData).finally(() => {
          reject(processData);
        });
      });
  };
}

/**
 * Configuration object for ErrorMiddleware.
 */
export type ErrorMiddlewareConfig = {
  contentType: ContentType;
  error: Record<number, (data: ProcessData) => Promise<void>>;
};
