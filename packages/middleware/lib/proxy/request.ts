import { BaseMiddleware, RequestMethods, ProcessData } from '@punica/request';
import { IStorage } from './model';

export class ProxyRequestMiddleware extends BaseMiddleware {
  private _config: ProxyRequestMiddlewareConfig;

  /**
   *
   * @param config
   */
  constructor(config: ProxyRequestMiddlewareConfig) {
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
    const { params, resolve } = processData;
    const { requestURL, cache } = params;

    if (!cache) {
      this.next(processData);

      return;
    }

    const storedData = await storage.read(requestURL);

    if (storedData) {
      resolve(storedData);
    } else {
      this.next(processData);
    }
  };
}

type ProxyRequestMiddlewareConfig = {
  storage: IStorage;
};
