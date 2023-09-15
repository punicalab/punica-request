import { BaseMiddleware, getCookie, ProcessData } from '@punica/request';

export default class AuthMiddleware extends BaseMiddleware {
  private _config: AuthMiddlewareConfig;

  /**
   *
   * @param config
   */
  constructor(config: AuthMiddlewareConfig) {
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
        [headerName]: `Bearer ${cookieValue} `
      };
    }

    this.next(processData);
  };
}

type AuthMiddlewareConfig = {
  cookieName: string;
  headerName: string;
};
