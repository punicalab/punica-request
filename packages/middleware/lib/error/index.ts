import { BaseMiddleware, ProcessData } from '@punica/request';

export default class ErrorMiddleware extends BaseMiddleware {
  private errors: ErrorMiddlewareConfig;

  /**
   *
   * @param errors
   */
  constructor(errors: ErrorMiddlewareConfig) {
    super();

    this.errors = errors;
  }

  /**
   *
   * @param data
   */
  public process = (data: ProcessData) => {
    const { status } = data.response;

    if (status < 400 && status >= 300) {
      this.next(data);
    } else if (status < 300 && status >= 200) {
      this.next(data);
    } else {
      const errorHandler = this.errors[status];

      errorHandler(data).finally(() => {
        data.reject();
      });
    }
  };
}

export type ErrorMiddlewareConfig = {
  [key in number]: (data: ProcessData) => Promise<void>;
};
