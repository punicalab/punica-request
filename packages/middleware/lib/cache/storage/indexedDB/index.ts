import { ContentType } from '@punica/request';
import { OperationDatabase } from './database';
import { getOperation, insertOperation, deleteOperation } from './util';
import { IStorage } from '../../model';

/**
 * Keeps responses in IndexedDB: across tabs and visits. It keeps whatever
 * IndexedDB can copy, which includes blobs and array buffers.
 */
export class StorageIndexedDB implements IStorage {
  /**
   * Reads data from IndexedDB.
   * @param requestURL - The key under which the data is stored.
   * @returns A Promise that resolves to the stored data or null if not found.
   */
  public read = async (requestURL: string): Promise<any> => {
    const db = await OperationDatabase.getDatabase();
    const record = await getOperation(db, requestURL);

    if (!record) return null;

    if (record.expireAt && Date.now() > record.expireAt) {
      await deleteOperation(db, requestURL); // Remove expired data from storage

      return null;
    }

    return record.body;
  };

  /**
   * Writes data to IndexedDB.
   * @param requestURL - The key under which the data will be stored.
   * @param contentType - The content type the payload was read as.
   * @param body - The data to be stored.
   * @param expireTime - The time after which the data should expire, in milliseconds.
   * @returns A Promise that resolves to whether the data was stored.
   */
  public write = async (
    requestURL: string,
    contentType: ContentType,
    body: unknown,
    expireTime?: number
  ): Promise<boolean> => {
    const db = await OperationDatabase.getDatabase();

    return insertOperation(db, {
      url: requestURL,
      requestURL,
      contentType,
      body,
      expireAt: expireTime ? Date.now() + expireTime : null
    });
  };
}
