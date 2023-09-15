import { BaseMiddleware, ContentType, ProcessData } from '@punica/request';

export default class ErrorMiddleware extends BaseMiddleware {
  private config: ErrorMiddlewareConfig;

  /**
   *
   * @param errors
   */
  constructor(config: ErrorMiddlewareConfig) {
    super();

    this.config = config;
  }

  /**
   *
   * @param message
   */
  private LOGGER = (message: string) => {
    console.error(
      `%cPUNICA_ERROR_MIDDLEWARE ${message}`,
      'background-color: red; color: white; padding: 12px'
    );
  };

  /**
   *
   * @param processData
   */
  public process = (processData: ProcessData) => {
    const { response, reject } = processData;
    const { status, ok } = response;

    if (ok) {
      this.next(processData);

      return;
    }

    const { error, contentType } = this.config;
    const errorHandler = error[status];

    if (errorHandler == null) {
      this.LOGGER('You should add the error message handler!');

      reject(processData);

      return;
    }

    processData.response[contentType]()
      .then((content) => {
        processData.body = content;
      })
      .catch(() => {
        this.LOGGER(
          'Received read error for requested content type from operation response'
        );
      })
      .finally(() => {
        errorHandler(processData).finally(() => {
          reject(processData);
        });
      });
  };
}

export type ErrorMiddlewareConfig = {
  contentType: ContentType;
  error: Record<number, (data: ProcessData) => Promise<void>>;
};
