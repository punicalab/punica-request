import { BaseMiddleware, HTTP_METHOD_TYPE, ProcessData } from '../../..';

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
  public availableMethods(): Array<string> {
    return [HTTP_METHOD_TYPE.GET];
  }

  /**
   *
   */
  public process = (data: ProcessData) => {
    this.next(data);
  };
}

export default SampleAMiddleware;
