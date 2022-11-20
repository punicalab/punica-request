import { BaseMiddleware, HTTP_METHOD_TYPE, ProcessData } from '@punica/request';
import { OperationDatabase } from './database';
import { getOperation } from './util/getOperation';

export default class ProxyRequestMiddleware extends BaseMiddleware {
  /**
   *
   */
  constructor() {
    super();
  }

  /**
   *
   * @returns
   */
  public availableMethods(): Array<string> {
    return [HTTP_METHOD_TYPE.GET];
  }

  /**
   *
   * @param data
   */
  public process = (data: ProcessData) => {
    OperationDatabase.getDatabase().then((db) => {
      const { resolve, params } = data;
      const { url } = params;

      getOperation(db, url)
        .then((d) => {
          resolve(d.result);
        })
        .catch(() => {
          this.next(data);
        });
    });
  };
}
