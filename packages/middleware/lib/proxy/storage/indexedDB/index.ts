import { ContentType } from '@punica/request';
import { OperationDatabase } from './database';
import { getOperation, insertOperation } from './util';
import { IStorage } from '../../model';

export class StorageIndexedDB implements IStorage {
  /**
   *
   * @param requestURL
   */
  public read = (requestURL: string): any => {
    return new Promise(async (resolve) => {
      const db = await OperationDatabase.getDatabase();
      const record = await getOperation(db, requestURL);

      resolve(record);
    });
  };

  /**
   *
   * @param requestURL
   * @param contentType
   * @param data
   */
  public write = (
    requestURL: string,
    contentType: ContentType,
    body: unknown
  ) => {
    return new Promise((resolve) => {
      OperationDatabase.getDatabase().then((db) => {
        insertOperation(db, { requestURL, contentType, body });

        resolve(true);
      });
    });
  };
}
