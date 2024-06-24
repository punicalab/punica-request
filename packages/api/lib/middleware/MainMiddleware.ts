import { ProcessData } from '..';
import { BaseMiddleware } from '.';
import { HttpResponse } from '../model/middleware/HttpResponse';

export class MainMiddleware extends BaseMiddleware {
  #apiMethod: any;
  #target: any;

  /**
   * Constructor for MainMiddleware.
   * @param apiMethod - The API method to be executed.
   * @param target - The target object on which the API method will be executed.
   */
  constructor(apiMethod: any, target: any) {
    super();

    this.#apiMethod = apiMethod;
    this.#target = target;
  }

  /**
   * Process method for MainMiddleware. It executes the API method and handles the response.
   * @param processData - Processed data.
   */
  public process(processData: ProcessData): void {
    this.#apiMethod
      .apply(this.#target, [processData.params])
      .then(async (httpResponse: HttpResponse) => {
        processData.httpResponse = httpResponse;

        await processData.notifier.notifySubscribers(processData);

        this.next(processData);
      });
  }
}
