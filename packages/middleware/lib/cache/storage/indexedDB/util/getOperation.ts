import { INDEX, OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 * Retrieves a record from the IndexedDB database based on a specified URL.
 * @param db - The IndexedDB database instance.
 * @param url - The URL used to retrieve the record.
 * @returns A Promise that resolves to the record if found, or rejects if there's an error.
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
