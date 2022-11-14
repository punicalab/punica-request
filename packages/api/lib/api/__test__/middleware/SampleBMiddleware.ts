import { BaseMiddleware, ProcessData } from '../../..';

class SampleBMiddleware extends BaseMiddleware {
  /**
   *
   */
  constructor() {
    super();
  }

  /**
   *
   */
  public process = (data: ProcessData) => {
    this.next(data);
  };
}

export default SampleBMiddleware;
