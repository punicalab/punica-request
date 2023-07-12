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
  public process = async (data: ProcessData) => {
    const { status } = data.response;

    if (status < 400 && status >= 200) {
      this.next(data);
    } else {
      const { response, reject } = data;
      const { json } = response;
      const errorHandler = this.errors[status];

      if (errorHandler) {
        data.body = await json();

        errorHandler(data).finally(() => {
          reject();
        });
      } else {
        console.error(
          '%cPUNICA_REQUEST You should add the error message handler!',
          'background-color: red; color: white; padding: 12px'
        );
      }
    }
  };
}

export type ErrorMiddlewareConfig = {
  [key in number]: (data: ProcessData) => Promise<void>;
};
