import { BaseMiddleware, ProcessData, RequestMethods } from '../../..';

export class SampleAMiddleware extends BaseMiddleware {
  /**
   *
   */
  constructor() {
    super();
  }

  /**
   *
   * @returns
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET'];
  }

  /**
   *
   */
  public process = (data: ProcessData) => {
    this.next(data);
  };
}
