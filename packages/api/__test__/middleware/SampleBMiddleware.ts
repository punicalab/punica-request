import { BaseMiddleware, ProcessData } from '../../lib';

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
