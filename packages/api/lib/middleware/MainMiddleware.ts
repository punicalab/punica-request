import { ProcessData, isHttpStatusOk } from '..';
import { BaseMiddleware } from '.';

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
      .then(async (response: Response) => {
        const { status } = response;
        processData.response = response;

        if (isHttpStatusOk(status)) {
          processData.body = await this.#target.readResponse(
            processData.response,
            processData.params.contentType
          );
        }

        await processData.notifier.notifySubscribers(processData);

        this.next(processData);
      });
  }
}
