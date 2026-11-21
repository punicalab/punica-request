import { OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 * Inserts a record into the IndexedDB database.
 * @param db - The IndexedDB database instance.
 * @param record - The record to be inserted.
 * @returns A Promise that resolves to true if the record is successfully inserted, or rejects if there's an error.
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
