import { INDEX, OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 * The record of an address, or `undefined` when there is none.
 * @param db - The database
 * @param url - The address the record was stored for
 */
export const getOperation = (
  db: IDBDatabase,
  url: string
): Promise<Record | undefined> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readonly');
    const query = txn.objectStore(OBJECT_STORE).index(INDEX).get(url);

    query.onsuccess = () => resolve(query.result);
    query.onerror = () => reject(query.error);
  });
};
