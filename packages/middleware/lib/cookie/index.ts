import { BaseMiddleware, getCookie, ProcessData } from '@punica/request';

export default class CookieMiddleware extends BaseMiddleware {
  private _config: CookieMiddlewareConfig;

  /**
   *
   * @param config
   */
  constructor(config: CookieMiddlewareConfig) {
    super();

    this._config = config;
  }

  /**
   *
   * @param processData
   */
  public process = (processData: ProcessData) => {
    const { params } = processData;
    const { cookieName, headerName } = this._config;
    const cookieValue = getCookie(cookieName);

    if (Boolean(cookieValue)) {
      params.init.headers = {
        ...params.init.headers,
        [headerName]: cookieValue
      };
    }

    this.next(processData);
  };
}

type CookieMiddlewareConfig = {
  cookieName: string;
  headerName: string;
};
