import { BaseMiddleware, HTTP_METHOD_TYPE, ProcessData } from '@punica/request';
import { OperationDatabase } from './database';
import { insertOperation } from './util/insertOperation';

export default class ProxyResponseMiddleware extends BaseMiddleware {
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
  public process = async (data: ProcessData) => {
    OperationDatabase.getDatabase().then((db) => {
      const { body, params } = data;
      const { url } = params;

      insertOperation(db, { url, result: body }).then(() => {
        this.next(data);
      });
    });
  };
}

export type ProxyResponseMiddlewareConfig = {};
