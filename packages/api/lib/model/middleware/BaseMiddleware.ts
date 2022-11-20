import { IMiddleware, ProcessData } from '.';
import { HTTP_METHOD_TYPE } from '..';

abstract class BaseMiddleware implements IMiddleware {
  private _nextMiddleware: IMiddleware;

  /**
   *
   */
  constructor() {}

  /**
   *
   */
  public set nextMiddleware(m: IMiddleware) {
    this._nextMiddleware = m;
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

    data.resolve(data.body);
  }

  /**
   *
   * @returns
   */
  public availableMethods(): Array<string> {
    return [
      HTTP_METHOD_TYPE.GET,
      HTTP_METHOD_TYPE.POST,
      HTTP_METHOD_TYPE.PUT,
      HTTP_METHOD_TYPE.DELETE
    ];
  }

  /**
   *
   * @param data
   */
  abstract process(data: ProcessData): void;
}

export default BaseMiddleware;
