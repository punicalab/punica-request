import { ProcessData } from '..';
import { BaseMiddleware } from '.';

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
   * @param processData
   */
  public process(processData: ProcessData): void {
    this._apiMethod
      .apply(this._target, [processData.params])
      .then(async (response: Response) => {
        processData.response = response;

        if (response.ok) {
          processData.body = await this._target.readResponse(
            processData.response,
            processData.params.contentType
          );
        }

        this.next(processData);
      });
  }
}

export default MainMiddleware;
