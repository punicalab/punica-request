import { ContentType } from '@punica/request';
import { OperationDatabase } from './database';
import { getOperation, insertOperation, deleteOperation } from './util';
import { IStorage } from '../../model';

/**
 * StorageIndexedDB is an implementation of the IStorage interface for IndexedDB storage.
 * It allows reading and writing data to the IndexedDB.
 */
export class StorageIndexedDB implements IStorage {
  /**
   * Reads data from IndexedDB based on the provided request URL.
   * @param requestURL - The URL for which data is to be read from IndexedDB.
   * @returns A Promise that resolves to the stored data or null if not found.
   */
  public read = (requestURL: string): Promise<any> => {
    return new Promise(async (resolve) => {
      const db = await OperationDatabase.getDatabase();
      const record = await getOperation(db, requestURL);
      const { expireAt } = record;

      // Check if data has expired
      if (expireAt && Date.now() > expireAt) {
        deleteOperation(db, requestURL); // Remove expired data from storage

        resolve(null);
      } else {
        resolve(record);
      }
    });
  };

  /**
   * Writes data to IndexedDB for the provided request URL.
   * @param requestURL - The URL to be associated with the stored data.
   * @param contentType - The content type of the data.
   * @param body - The data to be stored.
   * @param expireTime - The expiration time for the data in milliseconds.
   * @returns A Promise that resolves to true after the data is successfully stored.
   */
  public write = (
    requestURL: string,
    contentType: ContentType,
    body: unknown,
    expireTime?: number
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      let expirationTime: number = null;

      if (expireTime) {
        expirationTime = Date.now() + expireTime;
      }

      OperationDatabase.getDatabase().then((db) => {
        insertOperation(db, {
          requestURL,
          contentType,
          body,
          expireAt: expirationTime
        });

        resolve(true);
      });
    });
  };
}
