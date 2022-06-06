import { IMiddleware, ProcessData } from '.';

abstract class BaseMiddleware implements IMiddleware {
  private _nextMiddleware: IMiddleware;

  /**
   *
   */
  constructor() {}

  /**
   *
   */
  public set nextMiddleware(v: IMiddleware) {
    this._nextMiddleware = v;
  }

  /**
   *
   * @param data
   */
  public next(data: ProcessData) {
    if (this._nextMiddleware) {
      this._nextMiddleware.process(data);

      return;
    }

    data.resolve(data.response);
  }

  /**
   *
   * @param data
   */
  abstract process(data: ProcessData): void;
}

export default BaseMiddleware;
