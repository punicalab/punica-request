import { OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 *
 * @param db
 * @param record
 * @returns
 */
export const insertOperation = (
  db: IDBDatabase,
  record: Record
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readwrite');
    const store = txn.objectStore(OBJECT_STORE);
    const query = store.put(record);

    query.onsuccess = () => {
      resolve(true);
    };

    query.onerror = () => {
      reject();
    };
  });
};
