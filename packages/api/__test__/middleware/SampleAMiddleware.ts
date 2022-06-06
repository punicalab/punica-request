import { BaseMiddleware, ProcessData } from '../../lib';

class SampleAMiddleware extends BaseMiddleware {
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

export default SampleAMiddleware;
