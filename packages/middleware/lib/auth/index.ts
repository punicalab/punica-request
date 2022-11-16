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
   * @param data
   */
  public process = (data: ProcessData) => {
    const { cookieName, key } = this._config;
    const readCookie = getCookie(cookieName);

    data.params.init.headers = {
      ...(data.params?.init?.headers || {}),
      [key]: `Bearer ${readCookie}`
    };

    this.next(data);
  };
}

export type AuthMiddlewareConfig = {
  cookieName: string;
  key: string;
};
