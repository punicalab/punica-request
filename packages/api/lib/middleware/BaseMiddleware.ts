import { IMiddleware, ProcessData, RequestMethods } from '..';

abstract class BaseMiddleware implements IMiddleware {
  private _nextMiddleware: IMiddleware;
  protected _firstMiddleware: IMiddleware;

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
   */
  public set firstMiddleware(m: IMiddleware) {
    this._firstMiddleware = m;
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
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET', 'POST', 'PUT', 'DELETE'];
  }

  /**
   *
   * @param processData
   */
  abstract process(processData: ProcessData): void;
}

export default BaseMiddleware;
