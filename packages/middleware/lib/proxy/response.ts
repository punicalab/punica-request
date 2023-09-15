import { BaseMiddleware, RequestMethods, ProcessData } from '@punica/request';
import { IStorage } from './model';

export class ProxyResponseMiddleware extends BaseMiddleware {
  private _config: ProxyResponseMiddlewareConfig;

  /**
   *
   * @param config
   */
  constructor(config: ProxyResponseMiddlewareConfig) {
    super();

    this._config = config;
  }

  /**
   *
   * @returns
   */
  public availableMethods(): Array<keyof RequestMethods> {
    return ['GET'];
  }

  /**
   *
   * @param data
   */
  public process = async (processData: ProcessData) => {
    const { storage } = this._config;
    const { params, body } = processData;
    const { requestURL, cache, contentType } = params;

    if (!cache) {
      this.next(processData);

      return;
    }

    await storage.write(requestURL, contentType, body);

    this.next(processData);
  };
}

type ProxyResponseMiddlewareConfig = {
  storage: IStorage;
};
