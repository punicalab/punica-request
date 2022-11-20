import { BaseMiddleware, ProcessData } from "@punica/request";
import { OperationDatabase } from "./database";
import { insertOperation } from "./util/insertOperation";

export default class ProxyResponseMiddleware extends BaseMiddleware {
  /**
   *
   */
  constructor() {
    super();
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
