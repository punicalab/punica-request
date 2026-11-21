import { INDEX, OBJECT_STORE } from '../constants';

/**
 * Removes the record of an address.
 * @param db - The database
 * @param url - The address the record was stored for
 */
export const deleteOperation = (
  db: IDBDatabase,
  url: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const txn = db.transaction(OBJECT_STORE, 'readwrite');
    const store = txn.objectStore(OBJECT_STORE);
    const existing = store.index(INDEX).getKey(url);

    existing.onsuccess = () => {
      if (existing.result !== undefined) store.delete(existing.result);
    };

    txn.oncomplete = () => resolve(true);
    txn.onerror = () => reject(txn.error);
    txn.onabort = () => reject(txn.error);
  });
};
