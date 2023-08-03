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
   * @param data
   */
  public process = (data: ProcessData) => {
    const { response, reject } = data;
    const { status, ok } = response;
    const { error, contentType } = this.config;
    const errorHandler = error[status];

    if (ok) {
      this.next(data);

      return;
    }

    if (errorHandler == null) {
      this.LOGGER('You should add the error message handler!');

      reject(data);

      return;
    }

    data.response[contentType]()
      .then((content) => {
        data.body = content;
      })
      .catch(() => {
        this.LOGGER(
          'Received read error for requested content type from operation response'
        );
      })
      .finally(() => {
        errorHandler(data).finally(() => {
          reject(data);
        });
      });
  };
}

export type ErrorMiddlewareConfig = {
  contentType: ContentType;
  error: { [key in number]: (data: ProcessData) => Promise<void> };
};
