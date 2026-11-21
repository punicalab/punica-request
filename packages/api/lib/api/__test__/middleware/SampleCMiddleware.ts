import { BaseMiddleware, ProcessData } from '../../..';

export class SampleCMiddleware extends BaseMiddleware {
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
