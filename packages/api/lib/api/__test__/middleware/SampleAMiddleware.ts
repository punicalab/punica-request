import { BaseMiddleware, RequestMethods, ProcessData } from '../../..';

class SampleAMiddleware extends BaseMiddleware {
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

export default SampleAMiddleware;
