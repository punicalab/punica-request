import { INDEX, OBJECT_STORE } from '../constants';
import { Record } from '../model';

/**
 * Stores a record for its address, in place of the one the address had.
 * @param db - The database
 * @param record - The record
 * @returns Whether the record was stored
 */
export const insertOperation = (
  db: IDBDatabase,
  record: Record
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readwrite');
    const store = txn.objectStore(OBJECT_STORE);
    // The key of the store is a number it counts itself; the address is
    // found through the index, which takes one record per address
    const existing = store.index(INDEX).getKey(record.url);

    existing.onsuccess = () => {
      if (existing.result === undefined) {
        store.put(record);
      } else {
        store.put(record, existing.result);
      }
    };

    txn.oncomplete = () => resolve(true);
    txn.onerror = () => reject(txn.error);
    txn.onabort = () => reject(txn.error);
  });
};
