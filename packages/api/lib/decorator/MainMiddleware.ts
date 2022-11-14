import { BaseMiddleware, ProcessData } from '../model/middleware';

class MainMiddleware extends BaseMiddleware {
  private _apiMethod: any;
  private _target: any;

  /**
   *
   * @param apiMethod
   * @param target
   */
  constructor(apiMethod: any, target: any) {
    super();

    this._apiMethod = apiMethod;
    this._target = target;
  }

  /**
   *
   * @param data
   */
  public process(data: ProcessData): void {
    this._apiMethod
      .apply(this._target, [data.params])
      .then(async (response: Response) => {
        data.response = response;
        data.body = await this._target.readResponse(
          data.response,
          data.params.contentType
        );

        this.next(data);
      });
  }
}

export default MainMiddleware;
