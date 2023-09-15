import { INDEX, OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 *
 * @param db
 * @param url
 * @returns
 */
export const getOperation = (db: IDBDatabase, url: string): Promise<Record> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readonly');
    const store = txn.objectStore(OBJECT_STORE);
    const index = store.index(INDEX);
    const query = index.get(url);

    query.onsuccess = () => {
      resolve(query.result);
    };

    query.onerror = () => {
      reject();
    };
  });
};
