import { BaseMiddleware, ProcessData } from '../../lib';

class SampleCMiddleware extends BaseMiddleware {
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

export default SampleCMiddleware;
