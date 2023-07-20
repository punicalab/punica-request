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
   * @param data
   */
  public process = (data: ProcessData) => {
    const { response, reject } = data;
    const { status } = response;
    const { error, contentType } = this.config;
    const errorHandler = error[status];

    if (status < 400 && status >= 200) {
      this.next(data);

      return;
    }

    if (errorHandler == null) {
      console.error(
        '%cPUNICA_REQUEST You should add the error message handler!',
        'background-color: red; color: white; padding: 12px'
      );

      reject();

      return;
    }

    try {
      response[contentType]().then((content) => {
        data.body = content;
      });
    } finally {
      errorHandler(data).finally(() => {
        reject();
      });
    }
  };
}

export type ErrorMiddlewareConfig = {
  contentType: ContentType;
  error: { [key in number]: (data: ProcessData) => Promise<void> };
};
